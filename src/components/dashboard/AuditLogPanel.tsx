import { useApp, ROLE_META, type AuditAction } from "@/lib/store";
import { useEffect, useRef, useState } from "react";

const ACTION_META: Record<AuditAction, { label: string; color: string; icon: string }> = {
  accept:               { label: "Accept",         color: "success",     icon: "✓" },
  decline:              { label: "Decline",        color: "destructive", icon: "✕" },
  enroute:              { label: "Mark enroute",   color: "primary",     icon: "→" },
  onsite:               { label: "On site",        color: "success",     icon: "◉" },
  acknowledgeEmergency: { label: "Ack emergency",  color: "destructive", icon: "❗" },
  dispatch:             { label: "Dispatch",       color: "info",        icon: "➤" },
  requestAssist:        { label: "Request assist", color: "warning",     icon: "✆" },
  supersede:            { label: "Superseded",     color: "muted-foreground", icon: "⊘" },
  deny:                 { label: "Denied",         color: "destructive", icon: "🚫" },
};

const fmt = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export function AuditLogPanel() {
  const { auditLog, clearAudit, session } = useApp();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | AuditAction>("all");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!session.role) return null;
  const entries = auditLog.filter((e) => filter === "all" || e.action === filter);

  const exportCsv = () => {
    const rows = [
      ["timestamp", "action", "actor_role", "actor_name", "badge", "unit", "incident", "assignment", "detail"],
      ...auditLog.map((e) => [
        new Date(e.ts).toISOString(),
        e.action,
        e.actorRole,
        e.actorName,
        e.actorBadge,
        e.unit ?? "",
        e.incidentId ?? "",
        e.assignmentId ?? "",
        (e.detail ?? "").replace(/"/g, '""'),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ndls-audit-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Audit log"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <span>📋</span>
        <span className="hidden md:inline">Audit</span>
        {auditLog.length > 0 && (
          <span className="font-mono text-[10px] px-1.5 rounded bg-secondary text-foreground">{auditLog.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(95vw,640px)] panel z-50 max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Action Audit Log</div>
              <div className="text-[10px] text-muted-foreground">
                Tamper-evident record · {auditLog.length} entries
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="bg-input border border-border rounded-md px-2 py-1 text-[11px]"
              >
                <option value="all">All actions</option>
                {(Object.keys(ACTION_META) as AuditAction[]).map((k) => (
                  <option key={k} value={k}>{ACTION_META[k].label}</option>
                ))}
              </select>
              <button
                onClick={exportCsv}
                disabled={auditLog.length === 0}
                className="text-[10px] uppercase tracking-wider text-primary hover:underline disabled:opacity-30"
              >
                CSV
              </button>
              <button
                onClick={() => { if (confirm("Clear the entire audit log?")) clearAudit(); }}
                className="text-[10px] uppercase tracking-wider text-destructive hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {entries.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground italic">
                No actions logged yet. Accept, decline, dispatch or acknowledge to populate.
              </div>
            )}
            <ul className="divide-y divide-border">
              {entries.map((e) => {
                const am = ACTION_META[e.action];
                const rm = ROLE_META[e.actorRole];
                return (
                  <li key={e.id} className="px-4 py-2.5 hover:bg-secondary/30">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0"
                        style={{ background: `var(--color-${am.color})20`, color: `var(--color-${am.color})` }}
                      >
                        {am.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: `var(--color-${am.color})` }}>
                            {am.label}
                          </span>
                          {e.unit && <span className="text-xs">· {e.unit}</span>}
                          {e.incidentId && (
                            <span className="font-mono text-[10px] text-muted-foreground">{e.incidentId}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {rm.emoji} {e.actorName} <span className="font-mono">({e.actorBadge})</span> · {rm.label}
                          {e.detail && <> · {e.detail}</>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 leading-tight">
                        <div className="font-mono text-[11px] tabular-nums">{fmt(e.ts)}</div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{fmtDate(e.ts)}</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
            Persisted locally · auto-synced across open dashboards.
          </div>
        </div>
      )}
    </div>
  );
}
