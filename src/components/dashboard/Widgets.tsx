import { useApp } from "@/lib/store";
import { STAFF_MATRIX } from "@/lib/ndls-data";

function safetyScore(incidents: { status: string }[]) {
  const unresolved = incidents.filter((i) => i.status !== "resolved").length;
  const total = incidents.length;
  return Math.max(0, Math.min(100, 100 - total * 5 - unresolved * 10));
}

export function SafetyScore() {
  const { incidents, emergencyActive } = useApp();
  const score = Math.max(0, safetyScore(incidents) - (emergencyActive ? 15 : 0));
  const color = score >= 90 ? "success" : score >= 70 ? "warning" : "destructive";
  const label = score >= 90 ? "Optimal" : score >= 70 ? "Caution" : "Critical";

  return (
    <div className="panel p-4 flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
          <circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-secondary)" strokeWidth="3.5" />
          <circle
            cx="20" cy="20" r="16" fill="none"
            stroke={`var(--color-${color})`} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 100.5} 100.5`}
            style={{ transition: "stroke-dasharray 0.6s, stroke 0.4s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold font-mono" style={{ color: `var(--color-${color})` }}>{score}</div>
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">/ 100</div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Station Safety Score</div>
        <div className="text-lg font-bold" style={{ color: `var(--color-${color})` }}>{label}</div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {incidents.filter((i) => i.status !== "resolved").length} active · {incidents.length} total today
        </div>
      </div>
    </div>
  );
}

export function CrowdPrediction() {
  const trains = useApp((s) => s.trains);
  const active = trains.filter((t) => t.status !== "departed");
  const current = active.reduce((a, t) => a + t.estimatedPax, 0);
  const predicted = Math.round(current * 1.16);
  const peak = active.reduce((a, t) => (t.estimatedPax > (a?.estimatedPax ?? 0) ? t : a), active[0]);

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Predictive Crowd Analytics</div>
        <div className="text-[10px] text-muted-foreground">CCTV + capacity fusion</div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Current footfall</div>
          <div className="font-mono text-xl font-bold text-primary">{current.toLocaleString("en-IN")}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Predicted (+10m)</div>
          <div className="font-mono text-xl font-bold text-accent">{predicted.toLocaleString("en-IN")}</div>
        </div>
        <div className="col-span-2 mt-1">
          <div className="text-[10px] uppercase text-muted-foreground">Peak density</div>
          <div className="text-sm font-semibold">
            PF {peak?.platform} · <span className="font-mono">{peak?.expected}</span>
          </div>
        </div>
      </div>
      {/* Sparkline */}
      <div className="mt-3 flex items-end gap-0.5 h-10">
        {active.map((t, i) => {
          const h = Math.max(8, Math.round((t.estimatedPax / t.capacity) * 100));
          const c = h < 30 ? "success" : h < 70 ? "warning" : "destructive";
          return (
            <div key={i} className="flex-1 rounded-t"
                 style={{ height: `${h}%`, background: `var(--color-${c})` }} />
          );
        })}
      </div>
    </div>
  );
}

export function StaffAllocation() {
  const trains = useApp((s) => s.trains);
  const load = trains.filter((t) => t.status !== "departed").reduce((a, t) => a + t.estimatedPax / t.capacity, 0)
    / Math.max(1, trains.filter((t) => t.status !== "departed").length);
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Intelligent Staff Allocation</div>
        <div className="text-[10px] text-muted-foreground">recommended for next 30 min</div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {Object.entries(STAFF_MATRIX).map(([k, s]) => {
          const lo = Math.max(1, Math.round(s.min * (load + 0.3)));
          const hi = Math.max(2, Math.round(s.max * (load + 0.3)));
          return (
            <div key={k} className="flex items-center gap-2.5 p-2 rounded-md bg-secondary/30">
              <div className="w-8 h-8 rounded-md flex items-center justify-center font-mono text-xs font-bold"
                   style={{ background: `var(--color-${s.color})20`, color: `var(--color-${s.color})` }}>
                {s.name.slice(0,2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium truncate">{s.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{lo}–{hi} personnel</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EmergencyButton() {
  const { emergencyActive, triggerEmergency, resolveEmergency } = useApp();
  if (emergencyActive) {
    return (
      <button
        onClick={resolveEmergency}
        className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider glow-danger animate-pulse"
        style={{ background: "var(--gradient-danger)", color: "white" }}
      >
        ⚠ Emergency Active · Stand Down
      </button>
    );
  }
  return (
    <button
      onClick={() => {
        if (confirm("Declare station-wide emergency? All units will be alerted on priority.")) triggerEmergency();
      }}
      className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider text-destructive border-2 border-destructive/60 hover:bg-destructive hover:text-destructive-foreground transition-colors"
    >
      🚨 Declare Emergency
    </button>
  );
}
