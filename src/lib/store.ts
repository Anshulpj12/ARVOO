import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TRAINS, type Train, SOP_TEMPLATES } from "./ndls-data";

export type Role = "station-master" | "rpf" | "medical" | "ticket";

export const ROLE_META: Record<Role, { label: string; color: string; emoji: string }> = {
  "station-master": { label: "Station Master", color: "primary", emoji: "🚉" },
  "rpf":            { label: "RPF Officer", color: "info", emoji: "🛡️" },
  "medical":        { label: "Medical Staff", color: "success", emoji: "⚕️" },
  "ticket":         { label: "Ticket Checking", color: "accent", emoji: "🎫" },
};

export type IncidentType = "medical" | "intrusion" | "crowd" | "fire";
export type IncidentStatus = "active" | "responding" | "resolved";
export type Priority = "P1" | "P2" | "P3";

export interface Assignment {
  id: string;
  role: Role;
  unit: string;
  status: "pending" | "accepted" | "declined" | "enroute" | "onsite" | "superseded";
  assignedAt: number;
  assistRequested?: boolean;
  assistNote?: string;
  resolvedAt?: number;
}

export interface SopTask {
  task: string;
  done: boolean;
  by?: Role;
  updatedAt?: number;
}

export interface Incident {
  id: string;
  type: IncidentType;
  platform: number;
  zone: "front" | "middle" | "rear";
  description: string;
  status: IncidentStatus;
  priority: Priority;
  createdAt: number;
  primaryRole: Role;
  assistRoles: Role[];
  sop: SopTask[];
  assignments: Assignment[];
  reportedBy: Role;
  escalated?: boolean;
}

export interface Notification {
  id: string;
  audience: Role | "all";
  priority: Priority;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  incidentId?: string;
  assignmentId?: string;
  kind: "incident" | "assignment" | "sop" | "emergency" | "system" | "assist";
}

export type QueuedAction =
  | { id: string; ts: number; kind: "notify"; payload: Notification };

interface Session { role: Role | null; name: string; badge: string; }

// Alert rules: per-role per-incident-type priority override (P1 / P2 / P3 / "off").
export type RuleLevel = Priority | "off";
export type AlertRules = Record<Role, Record<IncidentType, RuleLevel>>;

// ─── Role permission matrix ────────────────────────────────────────────
// Controls which roles can perform each action, and which incident fields
// each role is allowed to view.
export type ActionKey =
  | "accept" | "decline" | "enroute" | "onsite"
  | "acknowledgeEmergency" | "dispatchUnit" | "requestAssist" | "toggleSop";

export type FieldKey =
  | "description" | "reportedBy" | "assignments" | "sop" | "assistRoles" | "platform";

export interface PermissionMatrix {
  actions: Record<Role, Record<ActionKey, boolean>>;
  fields:  Record<Role, Record<FieldKey, boolean>>;
}

const ALL_ACTIONS: ActionKey[] = ["accept","decline","enroute","onsite","acknowledgeEmergency","dispatchUnit","requestAssist","toggleSop"];
const ALL_FIELDS:  FieldKey[]  = ["description","reportedBy","assignments","sop","assistRoles","platform"];

const allTrue = <K extends string>(keys: readonly K[]): Record<K, boolean> =>
  Object.fromEntries(keys.map((k) => [k, true])) as Record<K, boolean>;

const DEFAULT_PERMISSIONS: PermissionMatrix = {
  actions: {
    "station-master": allTrue(ALL_ACTIONS),
    "rpf":            { ...allTrue(ALL_ACTIONS), dispatchUnit: false },
    "medical":        { ...allTrue(ALL_ACTIONS), dispatchUnit: false },
    "ticket":         { ...allTrue(ALL_ACTIONS), dispatchUnit: false, acknowledgeEmergency: true },
  },
  fields: {
    "station-master": allTrue(ALL_FIELDS),
    "rpf":            allTrue(ALL_FIELDS),
    "medical":        allTrue(ALL_FIELDS),
    "ticket":         { ...allTrue(ALL_FIELDS), reportedBy: false, assignments: false },
  },
};

export const PERMISSION_LABELS: Record<ActionKey, string> = {
  accept: "Accept assignment",
  decline: "Decline assignment",
  enroute: "Mark enroute",
  onsite: "Mark on site",
  acknowledgeEmergency: "Acknowledge P1 emergency",
  dispatchUnit: "Dispatch new unit",
  requestAssist: "Broadcast assist",
  toggleSop: "Toggle SOP task",
};
export const FIELD_LABELS: Record<FieldKey, string> = {
  description: "Incident description",
  reportedBy: "Reporter identity",
  assignments: "Assignment roster",
  sop: "SOP checklist",
  assistRoles: "Assist roles",
  platform: "Platform & zone",
};
export { ALL_ACTIONS, ALL_FIELDS };

// ─── Audit log ─────────────────────────────────────────────────────────
export type AuditAction =
  | "accept" | "decline" | "enroute" | "onsite"
  | "acknowledgeEmergency" | "dispatch" | "requestAssist" | "supersede"
  | "deny";
export interface AuditEntry {
  id: string;
  ts: number;
  action: AuditAction;
  actorRole: Role;
  actorName: string;
  actorBadge: string;
  unit?: string;
  incidentId?: string;
  assignmentId?: string;
  detail?: string;
}

const DEFAULT_RULES: AlertRules = {
  "station-master": { medical: "P1", fire: "P1", intrusion: "P2", crowd: "P2" },
  "rpf":            { medical: "P2", fire: "P1", intrusion: "P1", crowd: "P2" },
  "medical":        { medical: "P1", fire: "P1", intrusion: "P3", crowd: "P2" },
  "ticket":         { medical: "P3", fire: "P2", intrusion: "P3", crowd: "P2" },
};

interface AppState {
  session: Session;
  online: boolean;
  // Sync indicator: ok = live, syncing = reconnecting/replaying, offline = no link
  syncStatus: "ok" | "syncing" | "offline";
  reconnectAttempts: number;
  lastSync: number;
  trains: Train[];
  incidents: Incident[];
  notifications: Notification[];
  queue: QueuedAction[];
  emergencyActive: boolean;
  alertRules: AlertRules;
  permissions: PermissionMatrix;
  auditLog: AuditEntry[];

  login: (role: Role, name: string, badge: string) => void;
  logout: () => void;
  setOnline: (v: boolean) => void;

  createIncident: (i: Omit<Incident, "id" | "createdAt" | "status" | "sop" | "assignments" | "priority"> & { sop?: Incident["sop"]; priority?: Priority }) => void;
  updateIncident: (id: string, patch: Partial<Incident>) => void;
  toggleSop: (incidentId: string, taskIdx: number, by: Role) => void;

  assignUnit: (incidentId: string, role: Role, unit: string) => void;
  respondAssignment: (incidentId: string, assignmentId: string, status: Assignment["status"]) => void;
  requestAssist: (incidentId: string, assignmentId: string, note?: string) => void;
  respondAssist: (incidentId: string, assignmentId: string, responder: Role, unit: string) => void;

  markNotificationRead: (id: string) => void;
  markAllRead: (role: Role) => void;
  acknowledgeEmergency: (incidentId: string, role: Role) => void;

  setRule: (role: Role, type: IncidentType, level: RuleLevel) => void;
  resetRules: () => void;

  setPermission: (role: Role, kind: "actions" | "fields", key: string, value: boolean) => void;
  resetPermissions: () => void;
  can: (role: Role, action: ActionKey) => boolean;
  canView: (role: Role, field: FieldKey) => boolean;

  logAudit: (e: Omit<AuditEntry, "id" | "ts" | "actorName" | "actorBadge" | "actorRole"> & { actor?: { role: Role; name: string; badge: string } }) => void;
  clearAudit: () => void;

  attemptReconnect: () => void;

  triggerEmergency: () => void;
  resolveEmergency: () => void;
  tickTrains: () => void;
  escalateStale: () => void;
}

const priorityFor = (t: IncidentType): Priority =>
  t === "fire" ? "P1" : t === "medical" ? "P1" : t === "intrusion" ? "P2" : "P2";

const uid = (p = "N") => `${p}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

const UNIT_POOL: Record<Role, string[]> = {
  "rpf": ["RPF Squad Alpha", "RPF Squad Bravo", "RPF Quick Reaction"],
  "medical": ["Medical Team 1", "Medical Team 2", "Paramedic Cart"],
  "ticket": ["TTE Group North", "TTE Group South"],
  "station-master": ["Duty Officer", "Deputy SM"],
};

export const dispatchableUnits = (role: Role) => UNIT_POOL[role];

const STORE_KEY = "ndls-command-center";

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      // Apply per-role priority override (rules) — preserves P1 emergencies.
      const applyRule = (audience: Role | "all", incidentType: IncidentType | null, basePrio: Priority): Priority | null => {
        if (audience === "all" || !incidentType) return basePrio;
        const lvl = get().alertRules[audience]?.[incidentType];
        if (!lvl) return basePrio;
        if (lvl === "off") return null;
        return lvl;
      };

      const deliver = (n: Notification) => {
        const isOnline = get().online;
        if (isOnline) {
          set({ notifications: [n, ...get().notifications].slice(0, 200) });
        } else {
          set({
            queue: [...get().queue, { id: uid("Q"), ts: Date.now(), kind: "notify", payload: n }],
          });
        }
      };

      const notifyRoles = (
        roles: (Role | "all")[],
        opts: Omit<Notification, "id" | "ts" | "read" | "audience">,
        incidentType: IncidentType | null = null,
      ) => {
        const unique = Array.from(new Set(roles));
        unique.forEach((audience) => {
          const p = applyRule(audience, incidentType, opts.priority);
          if (p === null) return; // muted
          deliver({ ...opts, priority: p, id: uid("NT"), ts: Date.now(), read: false, audience });
        });
      };

      return {
        session: { role: null, name: "", badge: "" },
        online: true,
        syncStatus: "ok",
        reconnectAttempts: 0,
        lastSync: Date.now(),
        trains: TRAINS,
        incidents: [],
        notifications: [],
        queue: [],
        emergencyActive: false,
        alertRules: DEFAULT_RULES,
        permissions: DEFAULT_PERMISSIONS,
        auditLog: [],

        login: (role, name, badge) => set({ session: { role, name, badge } }),
        logout: () => set({ session: { role: null, name: "", badge: "" } }),

        setOnline: (v) => {
          if (v) {
            set({ syncStatus: "syncing" });
            const q = get().queue;
            const replayed: Notification[] = q
              .filter((a) => a.kind === "notify")
              .map((a) => ({ ...a.payload, ts: Date.now(), read: false, id: uid("NT") }));
            if (replayed.length) {
              const sys: Notification = {
                id: uid("NT"), ts: Date.now(), read: false, audience: get().session.role ?? "all",
                priority: "P3", kind: "system",
                title: "Synced while offline",
                body: `${replayed.length} update${replayed.length === 1 ? "" : "s"} replayed from queue.`,
              };
              set({
                notifications: [sys, ...replayed, ...get().notifications].slice(0, 200),
                queue: [],
              });
            }
            set({ online: true, lastSync: Date.now(), syncStatus: "ok", reconnectAttempts: 0 });
          } else {
            set({ online: false, syncStatus: "offline" });
          }
        },

        attemptReconnect: () => {
          set({ syncStatus: "syncing", reconnectAttempts: get().reconnectAttempts + 1 });
          // In a real backend this would re-establish a websocket. Locally we
          // simulate a quick handshake and flip back to live.
          setTimeout(() => {
            if (typeof navigator !== "undefined" && navigator.onLine === false) {
              set({ syncStatus: "offline" });
              return;
            }
            get().setOnline(true);
          }, 600);
        },

        createIncident: (i) => {
          const sop = i.sop ?? SOP_TEMPLATES[i.type].map((task) => ({ task, done: false }));
          const priority = i.priority ?? priorityFor(i.type);
          const inc: Incident = {
            ...i,
            id: uid("INC"),
            createdAt: Date.now(),
            status: "active",
            sop,
            priority,
            assignments: [],
          };
          set({ incidents: [inc, ...get().incidents] });
          notifyRoles([inc.primaryRole, ...inc.assistRoles], {
            priority, kind: "incident", incidentId: inc.id,
            title: `${priority} · ${inc.type.toUpperCase()} on PF ${inc.platform}`,
            body: inc.description,
          }, inc.type);
        },

        updateIncident: (id, patch) =>
          set({ incidents: get().incidents.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),

        toggleSop: (incidentId, taskIdx, by) => {
          const inc = get().incidents.find((x) => x.id === incidentId);
          if (!inc) return;
          const now = Date.now();
          const sop = inc.sop.map((t, i) =>
            i === taskIdx
              ? { ...t, done: !t.done, by: !t.done ? by : undefined, updatedAt: now }
              : t,
          );
          const allDone = sop.every((t) => t.done);
          const status: IncidentStatus = allDone ? "resolved" : "responding";
          set({
            incidents: get().incidents.map((x) =>
              x.id === incidentId ? { ...x, sop, status } : x,
            ),
          });
          const done = sop.filter((t) => t.done).length;
          notifyRoles([inc.primaryRole, ...inc.assistRoles], {
            priority: allDone ? "P3" : "P3", kind: "sop", incidentId,
            title: allDone ? `Incident ${inc.id} resolved` : `SOP ${done}/${sop.length} · PF ${inc.platform}`,
            body: `${ROLE_META[by].label} ${sop[taskIdx].done ? "completed" : "reopened"} "${sop[taskIdx].task}"`,
          });
        },

        assignUnit: (incidentId, role, unit) => {
          const inc = get().incidents.find((x) => x.id === incidentId);
          if (!inc) return;
          const actor = get().session.role;
          if (actor && !get().can(actor, "dispatchUnit")) {
            get().logAudit({ action: "deny", incidentId, detail: `Blocked dispatch of ${unit} (no permission)` });
            throw new Error("Permission denied: dispatchUnit");
          }
          const a: Assignment = { id: uid("A"), role, unit, status: "pending", assignedAt: Date.now() };
          const assistRoles = inc.assistRoles.includes(role) || inc.primaryRole === role
            ? inc.assistRoles
            : [...inc.assistRoles, role];
          set({
            incidents: get().incidents.map((x) =>
              x.id === incidentId ? { ...x, assignments: [...x.assignments, a], assistRoles } : x,
            ),
          });
          notifyRoles([role], {
            priority: inc.priority, kind: "assignment", incidentId, assignmentId: a.id,
            title: `Assigned: ${unit}`,
            body: `${inc.type.toUpperCase()} · PF ${inc.platform}. Awaiting acceptance.`,
          }, inc.type);
          get().logAudit({ action: "dispatch", incidentId, assignmentId: a.id, unit, detail: `${ROLE_META[role].label} dispatched` });
        },

        respondAssignment: (incidentId, assignmentId, status) => {
          const inc = get().incidents.find((x) => x.id === incidentId);
          if (!inc) return;
          const a = inc.assignments.find((x) => x.id === assignmentId);
          if (!a) return;
          const actor = get().session.role;
          const actionKey = (status === "accepted" ? "accept"
            : status === "declined" ? "decline"
            : status === "enroute" ? "enroute"
            : status === "onsite" ? "onsite" : null) as ActionKey | null;
          if (actor && actionKey && !get().can(actor, actionKey)) {
            get().logAudit({ action: "deny", incidentId, assignmentId, unit: a.unit, detail: `Blocked ${actionKey}` });
            throw new Error(`Permission denied: ${actionKey}`);
          }
          const now = Date.now();
          // Conflict resolution: if accepting, supersede any *other* pending assignments
          // for the same role on the same incident so every dashboard converges on one winner.
          const supersededIds: string[] = [];
          const nextAssignments = inc.assignments.map((y) => {
            if (y.id === assignmentId) return { ...y, status, resolvedAt: now };
            if (
              status === "accepted" &&
              y.role === a.role &&
              y.status === "pending" &&
              y.id !== assignmentId
            ) {
              supersededIds.push(y.id);
              return { ...y, status: "superseded" as const, resolvedAt: now };
            }
            return y;
          });
          set({
            incidents: get().incidents.map((x) =>
              x.id !== incidentId ? x : {
                ...x,
                assignments: nextAssignments,
                status: x.status === "active" && status === "accepted" ? "responding" : x.status,
              },
            ),
          });
          notifyRoles([inc.primaryRole], {
            priority: "P3", kind: "assignment", incidentId, assignmentId,
            title: `${a.unit} · ${status}`,
            body: `${ROLE_META[a.role].label} unit updated assignment status.`,
          });
          if (supersededIds.length) {
            // Broadcast the final-state resolution so superseded units' dashboards update instantly.
            notifyRoles([a.role, inc.primaryRole], {
              priority: "P3", kind: "assignment", incidentId,
              title: `Conflict resolved · ${a.unit} won assignment`,
              body: `${supersededIds.length} other ${ROLE_META[a.role].label} unit${supersededIds.length === 1 ? "" : "s"} auto-cancelled.`,
            });
            supersededIds.forEach((sid) => {
              const sup = inc.assignments.find((y) => y.id === sid);
              get().logAudit({ action: "supersede", incidentId, assignmentId: sid, unit: sup?.unit, detail: `Superseded by ${a.unit}` });
            });
          }
          if (actionKey) {
            get().logAudit({ action: actionKey as AuditAction, incidentId, assignmentId, unit: a.unit, detail: `Status → ${status}` });
          }
        },

        requestAssist: (incidentId, assignmentId, note) => {
          const inc = get().incidents.find((x) => x.id === incidentId);
          if (!inc) return;
          const a = inc.assignments.find((x) => x.id === assignmentId);
          if (!a) return;
          const actor = get().session.role;
          if (actor && !get().can(actor, "requestAssist")) {
            get().logAudit({ action: "deny", incidentId, assignmentId, unit: a.unit, detail: "Blocked requestAssist" });
            throw new Error("Permission denied: requestAssist");
          }
          set({
            incidents: get().incidents.map((x) =>
              x.id !== incidentId ? x : {
                ...x,
                assignments: x.assignments.map((y) =>
                  y.id === assignmentId ? { ...y, assistRequested: true, assistNote: note } : y,
                ),
              },
            ),
          });
          const allRoles: Role[] = ["station-master", "rpf", "medical", "ticket"];
          notifyRoles(allRoles.filter((r) => r !== a.role), {
            priority: "P2", kind: "assist", incidentId, assignmentId,
            title: `Assist requested · ${a.unit}`,
            body: `${ROLE_META[a.role].label} needs backup on PF ${inc.platform}${note ? ` — ${note}` : ""}.`,
          });
          get().logAudit({ action: "requestAssist", incidentId, assignmentId, unit: a.unit, detail: note });
        },

        respondAssist: (incidentId, assignmentId, responder, unit) => {
          const inc = get().incidents.find((x) => x.id === incidentId);
          if (!inc) return;
          const a: Assignment = {
            id: uid("A"), role: responder, unit, status: "accepted", assignedAt: Date.now(),
          };
          set({
            incidents: get().incidents.map((x) =>
              x.id !== incidentId ? x : {
                ...x,
                assignments: [...x.assignments, a],
                assistRoles: x.assistRoles.includes(responder) ? x.assistRoles : [...x.assistRoles, responder],
              },
            ),
          });
          const orig = inc.assignments.find((y) => y.id === assignmentId);
          notifyRoles([inc.primaryRole, ...(orig ? [orig.role] : [])], {
            priority: "P3", kind: "assist", incidentId, assignmentId: a.id,
            title: `${unit} responding`,
            body: `${ROLE_META[responder].label} dispatched to assist on PF ${inc.platform}.`,
          });
        },

        acknowledgeEmergency: (incidentId, role) => {
          if (!get().can(role, "acknowledgeEmergency")) {
            get().logAudit({ action: "deny", incidentId, detail: "Blocked acknowledgeEmergency" });
            throw new Error("Permission denied: acknowledgeEmergency");
          }
          set({
            notifications: get().notifications.map((n) =>
              n.incidentId === incidentId && n.kind === "emergency" && (n.audience === role || n.audience === "all")
                ? { ...n, read: true }
                : n,
            ),
          });
          notifyRoles([get().incidents.find((x) => x.id === incidentId)?.reportedBy ?? "station-master"], {
            priority: "P3", kind: "emergency", incidentId,
            title: `${ROLE_META[role].label} acknowledged`,
            body: `Acknowledgement received for emergency ${incidentId}.`,
          });
          get().logAudit({ action: "acknowledgeEmergency", incidentId, detail: `${ROLE_META[role].label} acknowledged` });
        },

        markNotificationRead: (id) =>
          set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }),

        markAllRead: (role) =>
          set({
            notifications: get().notifications.map((n) =>
              n.audience === role || n.audience === "all" ? { ...n, read: true } : n,
            ),
          }),

        setRule: (role, type, level) =>
          set({
            alertRules: {
              ...get().alertRules,
              [role]: { ...get().alertRules[role], [type]: level },
            },
          }),

        resetRules: () => set({ alertRules: DEFAULT_RULES }),

        setPermission: (role, kind, key, value) => {
          const p = get().permissions;
          if (kind === "actions") {
            set({ permissions: { ...p, actions: { ...p.actions, [role]: { ...p.actions[role], [key]: value } } } });
          } else {
            set({ permissions: { ...p, fields: { ...p.fields, [role]: { ...p.fields[role], [key]: value } } } });
          }
        },
        resetPermissions: () => set({ permissions: DEFAULT_PERMISSIONS }),
        can: (role, action) => get().permissions.actions[role]?.[action] ?? false,
        canView: (role, field) => get().permissions.fields[role]?.[field] ?? false,

        logAudit: (e) => {
          const s = get();
          const actor = e.actor ?? { role: s.session.role ?? "station-master", name: s.session.name || "—", badge: s.session.badge || "—" };
          const entry: AuditEntry = {
            id: uid("AU"),
            ts: Date.now(),
            action: e.action,
            actorRole: actor.role,
            actorName: actor.name,
            actorBadge: actor.badge,
            unit: e.unit,
            incidentId: e.incidentId,
            assignmentId: e.assignmentId,
            detail: e.detail,
          };
          set({ auditLog: [entry, ...s.auditLog].slice(0, 500) });
        },
        clearAudit: () => set({ auditLog: [] }),

        triggerEmergency: () => {
          const sop = SOP_TEMPLATES.crowd.map((task) => ({ task, done: false }));
          const inc: Incident = {
            id: uid("EMG"),
            type: "crowd",
            platform: 3,
            zone: "front",
            description: "EMERGENCY: Critical crowd surge declared by Station Master",
            status: "active",
            priority: "P1",
            createdAt: Date.now(),
            primaryRole: "station-master",
            assistRoles: ["rpf", "medical", "ticket"],
            sop,
            assignments: [],
            reportedBy: get().session.role ?? "station-master",
          };
          set({ incidents: [inc, ...get().incidents], emergencyActive: true });
          notifyRoles(["all", "rpf", "medical", "ticket", "station-master"], {
            priority: "P1", kind: "emergency", incidentId: inc.id,
            title: "P1 · STATION-WIDE EMERGENCY",
            body: "All units report to PF 3. Acknowledge immediately.",
          });
        },

        resolveEmergency: () => set({ emergencyActive: false }),

        tickTrains: () => {
          set({
            trains: get().trains.map((t) => {
              const drift = Math.round((Math.random() - 0.5) * t.capacity * 0.04);
              const est = Math.max(0, Math.min(t.capacity, t.estimatedPax + drift));
              return { ...t, estimatedPax: est };
            }),
            lastSync: get().online ? Date.now() : get().lastSync,
          });
          get().escalateStale();
        },

        escalateStale: () => {
          const now = Date.now();
          let changed = false;
          const incidents = get().incidents.map((i) => {
            if (i.status === "resolved" || i.escalated) return i;
            const accepted = i.assignments.some((a) => a.status === "accepted" || a.status === "enroute" || a.status === "onsite");
            const stale = now - i.createdAt > 2 * 60 * 1000;
            if (stale && !accepted && i.priority !== "P1") {
              changed = true;
              notifyRoles([i.primaryRole, ...i.assistRoles], {
                priority: "P1", kind: "emergency", incidentId: i.id,
                title: `Escalated to P1 · ${i.id}`,
                body: `No acceptance in 2 min. ${i.type.toUpperCase()} on PF ${i.platform}.`,
              });
              return { ...i, priority: "P1" as Priority, escalated: true };
            }
            return i;
          });
          if (changed) set({ incidents });
        },
      };
    },
    {
      name: STORE_KEY,
      version: 4,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        if (version < 2) {
          persisted.incidents = (persisted.incidents ?? []).map((i: any) => ({
            ...i,
            priority: i.priority ?? "P2",
            assignments: i.assignments ?? [],
          }));
          persisted.notifications = persisted.notifications ?? [];
          persisted.queue = persisted.queue ?? [];
        }
        if (version < 3) {
          persisted.alertRules = persisted.alertRules ?? DEFAULT_RULES;
        }
        if (version < 4) {
          persisted.permissions = persisted.permissions ?? DEFAULT_PERMISSIONS;
          persisted.auditLog = persisted.auditLog ?? [];
        }
        return persisted;
      },
      partialize: (s) => ({
        session: s.session,
        incidents: s.incidents,
        trains: s.trains,
        notifications: s.notifications,
        queue: s.queue,
        emergencyActive: s.emergencyActive,
        lastSync: s.lastSync,
        alertRules: s.alertRules,
        permissions: s.permissions,
        auditLog: s.auditLog,
      }),
    },
  ),
);

// ─── Cross-tab live sync ────────────────────────────────────────────────
// Any change persisted by one tab is rehydrated in every other open dashboard
// instantly — zero-latency multi-screen coordination.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORE_KEY) {
      // Re-read persisted state from localStorage into the live store.
      useApp.persist.rehydrate();
    }
  });

  // ─── Real-time connection monitor ────────────────────────────────────
  // Reflects the browser's network status into the store and runs an
  // automatic reconnect handshake on recovery. Updates flow into the
  // UI's connection indicator and offline banner.
  const sync = () => {
    const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
    const s = useApp.getState();
    if (isOnline && s.syncStatus !== "ok") {
      s.attemptReconnect();
    } else if (!isOnline && s.syncStatus !== "offline") {
      useApp.setState({ online: false, syncStatus: "offline" });
    }
  };
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  // Initial check on load.
  setTimeout(sync, 0);
}
