import { useApp, ROLE_META, type Role, type IncidentType, type RuleLevel } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const TYPES: { key: IncidentType; label: string; icon: string }[] = [
  { key: "medical", label: "Medical", icon: "✚" },
  { key: "fire", label: "Fire", icon: "🔥" },
  { key: "intrusion", label: "Intrusion", icon: "⚠" },
  { key: "crowd", label: "Crowd", icon: "👥" },
];

const LEVELS: { v: RuleLevel; color: string }[] = [
  { v: "P1", color: "destructive" },
  { v: "P2", color: "warning" },
  { v: "P3", color: "info" },
  { v: "off", color: "muted" },
];

export function AlertRulesPanel() {
  const { alertRules, setRule, resetRules, session } = useApp();
  const [open, setOpen] = useState(false);
  const [previewType, setPreviewType] = useState<IncidentType>("medical");
  // Editable sample payload that mirrors the live assignment event shape.
  const [payload, setPayload] = useState({
    platform: 3,
    zone: "front" as "front" | "middle" | "rear",
    description: "Passenger collapsed near coach B4. Awaiting first responder.",
    reportedBy: "rpf" as Role,
  });
  const [showJson, setShowJson] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!session.role) return null;
  const isMaster = session.role === "station-master";
  // Non-master roles can only tune their own row.
  const editableRoles: Role[] = isMaster
    ? (Object.keys(ROLE_META) as Role[])
    : [session.role];
  const allRoles = Object.keys(ROLE_META) as Role[];

  const setRuleWithConfirm = (r: Role, t: IncidentType, l: RuleLevel) => {
    setRule(r, t, l);
    toast.success(`Rule saved`, { description: `${ROLE_META[r].label} · ${t.toUpperCase()} → ${l.toUpperCase()}` });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Alert rules"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <span>⚙</span>
        <span className="hidden md:inline">Rules</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(94vw,540px)] panel z-50 max-h-[75vh] flex flex-col overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Alert Routing Rules</div>
              <div className="text-[10px] text-muted-foreground">
                Tune the priority each role receives per incident type.
              </div>
            </div>
            <button
              onClick={() => { resetRules(); toast(`Defaults restored`); }}
              className="text-[10px] uppercase tracking-wider text-primary hover:underline shrink-0"
            >
              Reset defaults
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Rule preview — pick an event type and inspect what every role would receive,
                before committing changes. Saved rules persist automatically across refresh. */}
            <div className="panel bg-card/60 p-3 border-primary/30">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <div className="text-xs font-semibold">Event simulation · payload editor</div>
                  <div className="text-[10px] text-muted-foreground">
                    Edit the exact fields that would arrive from a live assignment event.
                  </div>
                </div>
                <select
                  value={previewType}
                  onChange={(e) => setPreviewType(e.target.value as IncidentType)}
                  className="bg-input border border-border rounded-md px-2 py-1 text-xs"
                >
                  {TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>

              {/* Payload editor — matches the live event schema */}
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Platform</span>
                  <input
                    type="number" min={1} max={16}
                    value={payload.platform}
                    onChange={(e) => setPayload((p) => ({ ...p, platform: Math.max(1, Math.min(16, Number(e.target.value) || 1)) }))}
                    className="bg-input border border-border rounded-md px-2 py-1 text-xs font-mono"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Zone</span>
                  <select
                    value={payload.zone}
                    onChange={(e) => setPayload((p) => ({ ...p, zone: e.target.value as typeof p.zone }))}
                    className="bg-input border border-border rounded-md px-2 py-1 text-xs"
                  >
                    <option value="front">Front</option>
                    <option value="middle">Middle</option>
                    <option value="rear">Rear</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Reported by</span>
                  <select
                    value={payload.reportedBy}
                    onChange={(e) => setPayload((p) => ({ ...p, reportedBy: e.target.value as Role }))}
                    className="bg-input border border-border rounded-md px-2 py-1 text-xs"
                  >
                    {(Object.keys(ROLE_META) as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_META[r].label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Base priority</span>
                  <div className="font-mono text-xs px-2 py-1 rounded-md bg-background/40 border border-border">
                    {previewType === "fire" || previewType === "medical" ? "P1" : "P2"} (from severity)
                  </div>
                </label>
                <label className="col-span-2 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Description</span>
                  <textarea
                    rows={2}
                    value={payload.description}
                    onChange={(e) => setPayload((p) => ({ ...p, description: e.target.value }))}
                    className="bg-input border border-border rounded-md px-2 py-1 text-xs resize-none"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Per-role outcome</div>
                <button
                  onClick={() => setShowJson((v) => !v)}
                  className="text-[10px] uppercase tracking-wider text-primary hover:underline"
                >
                  {showJson ? "Hide JSON" : "Show JSON"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {allRoles.map((r) => {
                  const lvl = alertRules[r][previewType];
                  const color = lvl === "P1" ? "destructive" : lvl === "P2" ? "warning" : lvl === "P3" ? "info" : "muted-foreground";
                  const label = lvl === "off" ? "MUTED" : lvl;
                  return (
                    <div key={r} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-border bg-background/40">
                      <span className="text-[11px] truncate flex items-center gap-1.5">
                        <span>{ROLE_META[r].emoji}</span>
                        <span className="truncate">{ROLE_META[r].label}</span>
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: `var(--color-${color})20`, color: `var(--color-${color})` }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {showJson && (
                <pre className="mt-2 text-[10px] font-mono leading-snug bg-background/60 border border-border rounded-md p-2 overflow-x-auto">
{JSON.stringify({
  type: previewType,
  priority_base: previewType === "fire" || previewType === "medical" ? "P1" : "P2",
  platform: payload.platform,
  zone: payload.zone,
  reportedBy: payload.reportedBy,
  description: payload.description,
  routing: allRoles.reduce((acc, r) => ({ ...acc, [r]: alertRules[r][previewType] }), {} as Record<string, string>),
}, null, 2)}
                </pre>
              )}
            </div>

            {editableRoles.map((r) => {
              const m = ROLE_META[r];
              return (
                <div key={r} className="panel bg-card/40 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
                      style={{ background: `var(--color-${m.color})20`, color: `var(--color-${m.color})` }}
                    >
                      {m.emoji}
                    </span>
                    <div className="text-sm font-semibold">{m.label}</div>
                  </div>
                  <div className="space-y-1.5">
                    {TYPES.map((t) => {
                      const current = alertRules[r][t.key];
                      return (
                        <div key={t.key} className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-[110px] text-xs">
                            <span>{t.icon}</span>
                            <span className="truncate">{t.label}</span>
                          </div>
                          <div className="flex gap-1 flex-wrap flex-1 justify-end">
                            {LEVELS.map((l) => {
                              const sel = current === l.v;
                              return (
                                <button
                                  key={l.v}
                                  onClick={() => setRuleWithConfirm(r, t.key, l.v)}
                                  className="text-[10px] font-bold px-2.5 py-1 rounded border transition-colors"
                                  style={{
                                    borderColor: sel ? `var(--color-${l.color})` : "var(--color-border)",
                                    background: sel ? `var(--color-${l.color})25` : "transparent",
                                    color: sel ? `var(--color-${l.color})` : "var(--color-muted-foreground)",
                                  }}
                                >
                                  {l.v.toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
            P1 = critical · P2 = standard · P3 = info · OFF = mute.
            {!isMaster && " Only your own routing is editable."}
          </div>
        </div>
      )}
    </div>
  );
}
