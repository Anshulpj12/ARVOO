import { useApp, ROLE_META, dispatchableUnits, type Incident, type Role, type Assignment, type ActionKey } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  incident: Incident | null;
  onClose: () => void;
}

const typeMeta = {
  medical:   { label: "Medical Response",  color: "success",     icon: "✚" },
  intrusion: { label: "Track Intrusion",   color: "info",        icon: "⚠" },
  crowd:     { label: "Crowd Surge",       color: "destructive", icon: "👥" },
  fire:      { label: "Fire / Smoke",      color: "destructive", icon: "🔥" },
} as const;

const STATUS_COLOR: Record<Assignment["status"], string> = {
  pending: "warning",
  accepted: "info",
  enroute: "primary",
  onsite: "success",
  declined: "destructive",
  superseded: "muted-foreground",
};

export function IncidentDrawer({ incident, onClose }: Props) {
  const { session, toggleSop, updateIncident, assignUnit, respondAssignment, requestAssist, incidents } = useApp();
  const can = useApp((s) => s.can);
  const canView = useApp((s) => s.canView);
  if (!incident) return null;
  // Always read latest incident state from the store so real-time updates flow in instantly.
  const live = incidents.find((x) => x.id === incident.id) ?? incident;
  const role = session.role!;
  const tm = typeMeta[live.type];
  const done = live.sop.filter((t) => t.done).length;
  const pct = Math.round((done / live.sop.length) * 100);
  const isMaster = role === "station-master";

  // Optimistic + rollback wrapper for assignment actions. The store is local and
  // synchronous today, but the helper captures previous status so a future
  // network-backed mutation can revert cleanly on failure.
  const respondWithConfirm = (aid: string, next: Assignment["status"], label: string) => {
    const prev = live.assignments.find((y) => y.id === aid)?.status;
    try {
      respondAssignment(live.id, aid, next);
      toast.success(`${label} confirmed`, { description: `${live.id} · PF ${live.platform}` });
    } catch (e) {
      if (prev) respondAssignment(live.id, aid, prev);
      toast.error(`${label} failed — rolled back`, { description: (e as Error).message });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <aside onClick={(e) => e.stopPropagation()}
             className="relative ml-auto w-full max-w-xl h-full panel rounded-none border-y-0 border-r-0 overflow-y-auto">
        <div className="sticky top-0 z-10 panel rounded-none border-x-0 border-t-0 px-5 py-4 flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center text-xl border-2 shrink-0"
            style={{ background: `var(--color-${tm.color})20`, borderColor: `var(--color-${tm.color})`, color: `var(--color-${tm.color})` }}
          >
            {tm.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] text-muted-foreground">{incident.id}</span>
              <span
                className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `var(--color-${incident.priority === "P1" ? "destructive" : incident.priority === "P2" ? "warning" : "info"})20`, color: `var(--color-${incident.priority === "P1" ? "destructive" : incident.priority === "P2" ? "warning" : "info"})` }}
              >
                {incident.priority}{incident.escalated ? " · ESC" : ""}
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider"
                    style={{ color: `var(--color-${incident.status === "resolved" ? "success" : incident.status === "responding" ? "warning" : "destructive"})` }}>
                {incident.status}
              </span>
            </div>
            <h2 className="text-lg font-bold mt-0.5 truncate">{tm.label}</h2>
            <div className="text-sm text-muted-foreground">PF {incident.platform} · <span className="capitalize">{incident.zone} zone</span></div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none shrink-0">×</button>
        </div>

        <div className="p-5 space-y-5">
          {canView(role, "description") ? (
            <p className="text-sm break-words">{live.description}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Description restricted for {ROLE_META[role].label}.</p>
          )}

          {/* Roles */}
          {canView(role, "assistRoles") && (
          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Coordination</h3>
            <div className="flex flex-wrap gap-2">
              <RoleBadge role={live.primaryRole} label="Primary" />
              {live.assistRoles.map((r) => <RoleBadge key={r} role={r} label="Assist" />)}
            </div>
            {role !== "station-master" && live.primaryRole !== role && !live.assistRoles.includes(role) && (
              <button
                onClick={() => updateIncident(live.id, { assistRoles: [...live.assistRoles, role] })}
                className="mt-3 text-xs px-3 py-1.5 rounded-md border border-primary/40 text-primary hover:bg-primary/10"
              >
                + Join as assist
              </button>
            )}
          </section>
          )}

          {/* Assignments workflow */}
          {canView(role, "assignments") && (
          <AssignmentSection
            incident={live}
            canAssign={(isMaster || live.primaryRole === role) && can(role, "dispatchUnit")}
            currentRole={role}
            can={can}
            onAssign={(r, u) => { assignUnit(live.id, r, u); toast.success(`Dispatched ${u}`); }}
            onRespond={(aid, s, label) => respondWithConfirm(aid, s, label)}
            onRequestAssist={(aid) => { requestAssist(live.id, aid); toast(`Assist broadcast sent`); }}
          />
          )}

          {/* SOP */}
          {canView(role, "sop") && (
          <section>
            <div className="flex items-center justify-between mb-2 gap-2">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">SOP Checklist</h3>
              <div className="text-xs font-mono shrink-0">
                <span className="text-success font-bold">{done}</span>
                <span className="text-muted-foreground">/{incident.sop.length} tasks completed</span>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
              <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ul className="space-y-1.5">
              {live.sop.map((t, i) => {
                const recent = t.updatedAt && Date.now() - t.updatedAt < 4000;
                return (
                  <li key={i}>
                    <button
                      onClick={() => {
                        if (!can(role, "toggleSop")) { toast.error("Permission denied: toggle SOP"); return; }
                        toggleSop(live.id, i, role);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-left transition-all duration-300 ${
                        t.done
                          ? "border-success/40 bg-success/10"
                          : "border-border hover:border-primary/40 hover:bg-secondary/40"
                      } ${recent ? "ring-2 ring-primary/60 sop-flash" : ""}`}
                    >
                      <span
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs shrink-0 transition-colors ${
                          t.done
                            ? "bg-success border-success text-success-foreground"
                            : "border-muted-foreground"
                        }`}
                      >
                        {t.done && "✓"}
                      </span>
                      <span className={`text-sm flex-1 min-w-0 break-words ${t.done ? "line-through text-muted-foreground" : ""}`}>
                        {t.task}
                      </span>
                      {t.done && t.by && (
                        <span className="text-[10px] uppercase font-bold shrink-0" style={{ color: `var(--color-${ROLE_META[t.by].color})` }}>
                          {ROLE_META[t.by].label.split(" ")[0]}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function AssignmentSection({
  incident, canAssign, currentRole, can, onAssign, onRespond, onRequestAssist,
}: {
  incident: Incident;
  canAssign: boolean;
  currentRole: Role;
  can: (role: Role, action: ActionKey) => boolean;
  onAssign: (role: Role, unit: string) => void;
  onRespond: (assignmentId: string, status: Assignment["status"], label: string) => void;
  onRequestAssist: (assignmentId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [assignRole, setAssignRole] = useState<Role>(incident.primaryRole);
  const [unit, setUnit] = useState(dispatchableUnits(incident.primaryRole)[0]);

  const accepted = incident.assignments.filter((a) => a.status === "accepted" || a.status === "enroute" || a.status === "onsite").length;
  const total = incident.assignments.length;

  // Group pending assignments by role to highlight conflict windows.
  const pendingByRole = incident.assignments.reduce<Record<string, number>>((acc, a) => {
    if (a.status === "pending") acc[a.role] = (acc[a.role] ?? 0) + 1;
    return acc;
  }, {});
  const conflictRoles = Object.entries(pendingByRole).filter(([, n]) => n > 1).map(([r]) => r);

  return (
    <section>
      <div className="flex items-center justify-between mb-2 gap-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Staff Assignments</h3>
        <div className="text-xs font-mono shrink-0">
          <span className="text-success font-bold">{accepted}</span>
          <span className="text-muted-foreground">/{total || "—"} accepted</span>
        </div>
      </div>

      {incident.assignments.length === 0 && (
        <div className="text-xs text-muted-foreground italic mb-2">No units dispatched yet.</div>
      )}

      {conflictRoles.length > 0 && (
        <div className="mb-2 text-[10px] px-2.5 py-1.5 rounded-md border border-warning/40 bg-warning/10 text-warning">
          ⚡ Conflict pending — first acceptance from {conflictRoles.map((r) => ROLE_META[r as Role].label).join(", ")} wins; others auto-cancel.
        </div>
      )}

      <ul className="space-y-1.5">
        {incident.assignments.map((a) => {
          const m = ROLE_META[a.role];
          const sc = STATUS_COLOR[a.status];
          const isMine = a.role === currentRole;
          return (
            <li key={a.id} className="panel p-2.5 flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-sm shrink-0"
                style={{ background: `var(--color-${m.color})20`, color: `var(--color-${m.color})` }}
              >
                {m.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.unit}</div>
                <div className="text-[10px] text-muted-foreground truncate">{m.label}</div>
              </div>
              <span
                className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shrink-0"
                style={{ background: `var(--color-${sc})20`, color: `var(--color-${sc})` }}
              >
                {a.status}
              </span>
              {isMine && a.status === "pending" && (can(currentRole, "accept") || can(currentRole, "decline")) && (
                <div className="flex gap-1 shrink-0">
                  {can(currentRole, "accept") && <button
                    onClick={() => onRespond(a.id, "accepted", "Accept")}
                    className="text-[10px] px-2 py-1 rounded border border-success/40 text-success hover:bg-success/10"
                  >
                    Accept
                  </button>}
                  {can(currentRole, "decline") && <button
                    onClick={() => onRespond(a.id, "declined", "Decline")}
                    className="text-[10px] px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    Decline
                  </button>}
                </div>
              )}
              {isMine && a.status === "accepted" && can(currentRole, "enroute") && (
                <button
                  onClick={() => onRespond(a.id, "enroute", "Mark enroute")}
                  className="text-[10px] px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10 shrink-0"
                >
                  Mark enroute
                </button>
              )}
              {isMine && a.status === "enroute" && can(currentRole, "onsite") && (
                <button
                  onClick={() => onRespond(a.id, "onsite", "On site")}
                  className="text-[10px] px-2 py-1 rounded border border-success/40 text-success hover:bg-success/10 shrink-0"
                >
                  On site
                </button>
              )}
              {isMine && (a.status === "accepted" || a.status === "enroute" || a.status === "onsite") && !a.assistRequested && can(currentRole, "requestAssist") && (
                <button
                  onClick={() => onRequestAssist(a.id)}
                  className="text-[10px] px-2 py-1 rounded border border-warning/40 text-warning hover:bg-warning/10 shrink-0"
                  title="Broadcast a help request to other units"
                >
                  Request assist
                </button>
              )}
              {a.assistRequested && (
                <span className="text-[10px] uppercase font-bold text-warning shrink-0">assist req</span>
              )}
            </li>
          );
        })}
      </ul>

      {canAssign && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 w-full text-xs px-3 py-2 rounded-md border border-primary/40 text-primary hover:bg-primary/10 font-semibold"
        >
          + Dispatch unit
        </button>
      )}

      {canAssign && showForm && (
        <div className="mt-3 panel p-3 space-y-2 bg-card/40">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Team</label>
              <select
                value={assignRole}
                onChange={(e) => {
                  const r = e.target.value as Role;
                  setAssignRole(r);
                  setUnit(dispatchableUnits(r)[0]);
                }}
                className="mt-1 w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm"
              >
                {(Object.keys(ROLE_META) as Role[]).map((r) => (
                  <option key={r} value={r}>{ROLE_META[r].label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm"
              >
                {dispatchableUnits(assignRole).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 text-xs py-1.5 rounded border border-border"
            >
              Cancel
            </button>
            <button
              onClick={() => { onAssign(assignRole, unit); setShowForm(false); }}
              className="flex-1 text-xs py-1.5 rounded bg-primary text-primary-foreground font-semibold"
            >
              Dispatch
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function RoleBadge({ role, label }: { role: Role; label: string }) {
  const m = ROLE_META[role];
  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border"
      style={{ borderColor: `var(--color-${m.color})`, background: `var(--color-${m.color})15` }}
    >
      <span>{m.emoji}</span>
      <div className="leading-tight">
        <div className="text-xs font-semibold" style={{ color: `var(--color-${m.color})` }}>{m.label}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
