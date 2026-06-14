import { useApp, ROLE_META, type Notification, type Priority, type Role, dispatchableUnits } from "@/lib/store";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

// Optimistic action: runs the mutation, shows a confirm toast, and on throw
// invokes the supplied rollback. Keeps the dashboard responsive at zero latency.
function confirmAction(run: () => void, label: string, refId?: string, rollback?: () => void) {
  try {
    run();
    toast.success(`${label} confirmed`, refId ? { description: refId } : undefined);
  } catch (e) {
    rollback?.();
    toast.error(`${label} failed — rolled back`, { description: (e as Error).message });
  }
}

const PRIO_COLOR: Record<Priority, string> = { P1: "destructive", P2: "warning", P3: "info" };

export function NotificationCenter() {
  const { notifications, session, markNotificationRead, markAllRead, queue, online } = useApp();
  const role = session.role;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!role) return null;
  const mine = notifications.filter((n) => n.audience === role || n.audience === "all");
  const unread = mine.filter((n) => !n.read).length;
  const p1unread = mine.filter((n) => !n.read && n.priority === "P1").length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          p1unread > 0
            ? "bg-destructive/15 border-destructive/50 text-destructive animate-pulse"
            : unread > 0
              ? "bg-warning/15 border-warning/40 text-warning"
              : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="text-base leading-none">🔔</span>
        <span className="hidden md:inline">
          {unread > 0 ? `${unread} alert${unread === 1 ? "" : "s"}` : "Alerts"}
        </span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,420px)] panel z-50 max-h-[75vh] flex flex-col overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">Notifications · {ROLE_META[role].label}</div>
              <div className="text-[10px] text-muted-foreground">
                {p1unread > 0 && <span className="text-destructive font-bold">{p1unread} P1 · </span>}
                {unread} unread · {mine.length} total
                {!online && <span className="text-warning"> · {queue.length} queued offline</span>}
              </div>
            </div>
            <button
              onClick={() => markAllRead(role)}
              className="text-[10px] uppercase tracking-wider text-primary hover:underline shrink-0"
            >
              Mark all read
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {mine.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <div className="text-3xl mb-2">✓</div>
                No notifications yet.
              </div>
            )}
            {mine.map((n) => (
              <NotifRow key={n.id} n={n} role={role} onClick={() => markNotificationRead(n.id)} />
            ))}
          </div>
          {!online && queue.length > 0 && (
            <div className="px-4 py-2 bg-warning/10 border-t border-warning/30 text-[11px] text-warning">
              ⟳ {queue.length} update{queue.length === 1 ? "" : "s"} queued — will replay on reconnect.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotifRow({ n, role, onClick }: { n: Notification; role: Role; onClick: () => void }) {
  const store = useApp();
  const { incidents, respondAssignment, acknowledgeEmergency, respondAssist } = store;
  const c = PRIO_COLOR[n.priority];
  const ago = relTime(n.ts);
  const inc = n.incidentId ? incidents.find((i) => i.id === n.incidentId) : null;
  const assignment = inc && n.assignmentId ? inc.assignments.find((a) => a.id === n.assignmentId) : null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={onClick}
      className={`w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ background: n.read ? "var(--color-muted)" : `var(--color-${c})` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: `var(--color-${c})20`, color: `var(--color-${c})` }}
            >
              {n.priority}
            </span>
            <span className="text-sm font-semibold truncate flex-1 min-w-0">{n.title}</span>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">{ago}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 break-words">{n.body}</div>

          {/* Quick actions — optimistic UI with toast confirm + rollback on failure. */}
          {n.kind === "assignment" && assignment && assignment.role === role && (
            <div className="flex flex-wrap gap-1.5 mt-2" onClick={stop}>
              {assignment.status === "pending" && (
                <>
                  <QA label="Accept" tone="success" onClick={() => confirmAction(() => respondAssignment(inc!.id, assignment.id, "accepted"), "Accept", inc!.id, () => respondAssignment(inc!.id, assignment.id, "pending"))} />
                  <QA label="Decline" tone="destructive" onClick={() => confirmAction(() => respondAssignment(inc!.id, assignment.id, "declined"), "Decline", inc!.id, () => respondAssignment(inc!.id, assignment.id, "pending"))} />
                </>
              )}
              {assignment.status === "accepted" && (
                <QA label="Mark enroute" tone="primary" onClick={() => confirmAction(() => respondAssignment(inc!.id, assignment.id, "enroute"), "Mark enroute", inc!.id, () => respondAssignment(inc!.id, assignment.id, "accepted"))} />
              )}
              {assignment.status === "enroute" && (
                <QA label="On site" tone="success" onClick={() => confirmAction(() => respondAssignment(inc!.id, assignment.id, "onsite"), "On site", inc!.id, () => respondAssignment(inc!.id, assignment.id, "enroute"))} />
              )}
              {(assignment.status === "accepted" || assignment.status === "enroute" || assignment.status === "onsite") && !assignment.assistRequested && (
                <QA label="Request assist" tone="warning" onClick={() => { useApp.getState().requestAssist(inc!.id, assignment.id); toast("Assist broadcast sent"); }} />
              )}
              {assignment.status === "superseded" && (
                <span className="text-[10px] uppercase font-bold text-muted-foreground">superseded — another unit accepted</span>
              )}
            </div>
          )}

          {n.kind === "emergency" && !n.read && inc && (
            <div className="flex flex-wrap gap-1.5 mt-2" onClick={stop}>
              <QA label="Acknowledge" tone="destructive" onClick={() => confirmAction(() => acknowledgeEmergency(inc.id, role), "Acknowledge emergency", inc.id)} />
            </div>
          )}

          {n.kind === "assist" && inc && assignment && assignment.role !== role && (
            <div className="flex flex-wrap gap-1.5 mt-2" onClick={stop}>
              <QA
                label={`Respond as ${ROLE_META[role].label.split(" ")[0]}`}
                tone="warning"
                onClick={() => confirmAction(() => respondAssist(inc.id, assignment.id, role, dispatchableUnits(role)[0]), "Respond to assist", inc.id)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QA({ label, tone, onClick }: { label: string; tone: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-semibold px-2.5 py-1 rounded border transition-colors"
      style={{
        borderColor: `var(--color-${tone})`,
        color: `var(--color-${tone})`,
        background: `var(--color-${tone})10`,
      }}
    >
      {label}
    </button>
  );
}

function relTime(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}
