import { type Train } from "@/lib/ndls-data";
import { STAFF_MATRIX } from "@/lib/ndls-data";

interface Props {
  train: Train | null;
  onClose: () => void;
}

export function TrainPanel({ train, onClose }: Props) {
  if (!train) return null;
  const pct = Math.round((train.estimatedPax / train.capacity) * 100);
  const predicted = Math.min(train.capacity, Math.round(train.estimatedPax * 1.18));
  const peakTime = (() => {
    const [h, m] = train.expected.split(":").map(Number);
    const total = h * 60 + m + 5;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  })();

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative ml-auto w-full max-w-xl h-full panel rounded-none border-y-0 border-r-0 overflow-y-auto"
      >
        <div className="sticky top-0 z-10 panel rounded-none border-x-0 border-t-0 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-primary">{train.number}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {train.coachCount}-coach rake
              </span>
            </div>
            <h2 className="text-xl font-bold mt-0.5 truncate">{train.name}</h2>
            <div className="text-sm text-muted-foreground truncate">{train.origin} → {train.destination}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none shrink-0">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Platform" value={`PF ${train.platform}`} accent="primary" />
            <Stat label="Scheduled" value={train.scheduled} mono />
            <Stat label="Expected" value={train.expected} mono accent={train.delayMin > 0 ? "warning" : "success"} />
            <Stat label="Delay" value={train.delayMin > 0 ? `+${train.delayMin}m` : "—"} mono accent={train.delayMin > 0 ? "warning" : "success"} />
          </div>

          {/* Next stop */}
          <section className="panel p-4 bg-primary/5 border-primary/30">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Next Stop</div>
                <div className="text-lg font-bold truncate">{train.nextStop.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  {train.nextStop.distanceKm > 0 ? `${train.nextStop.distanceKm} km` : "Terminating"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase text-muted-foreground">ETA</div>
                <div className="font-mono font-bold text-primary text-2xl tabular-nums">{train.nextStop.eta}</div>
              </div>
            </div>
          </section>

          {/* Live timeline */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Live Timeline</h3>
            <div className="space-y-3 relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              {train.timeline.map((evt, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  <div className={`mt-1 w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                    evt.done
                      ? "bg-success border-success"
                      : "bg-card border-primary glow-primary"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{evt.time}</span>
                      {!evt.done && (
                        <span className="text-[9px] uppercase font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">Upcoming</span>
                      )}
                    </div>
                    <div className={`text-sm leading-snug break-words ${evt.done ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>
                      {evt.event}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Crowd analytics */}
          <section className="panel p-4 bg-card/40">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Predictive Crowd Analytics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row k="Current load" v={`${train.estimatedPax.toLocaleString("en-IN")} (${pct}%)`} />
              <Row k="In 10 min" v={`${predicted.toLocaleString("en-IN")} pax`} />
              <Row k="Peak at" v={peakTime} />
              <Row k="Capacity" v={`${train.capacity.toLocaleString("en-IN")} pax`} />
            </div>

            {/* Segment heatmap */}
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Platform segment heatmap</div>
              <div className="grid grid-cols-3 gap-2">
                {["Front", "Middle", "Rear"].map((seg, i) => {
                  const segPct = Math.max(0, Math.min(100, pct + (i === 1 ? 15 : i === 0 ? -5 : -10)));
                  const color = segPct < 30 ? "success" : segPct < 70 ? "warning" : "destructive";
                  return (
                    <div key={seg} className="panel p-2 text-center min-w-0">
                      <div className="text-[10px] uppercase text-muted-foreground truncate">{seg}</div>
                      <div className="font-mono text-base sm:text-lg font-bold mt-0.5 tabular-nums" style={{ color: `var(--color-${color})` }}>
                        {segPct}%
                      </div>
                      <div className="h-1 rounded-full mt-1.5" style={{ background: `var(--color-${color})` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Recommended deployment */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Recommended Staff Deployment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(STAFF_MATRIX).map((s) => {
                const lo = Math.round(s.min * (pct / 80 || 0.5));
                const hi = Math.round(s.max * (pct / 80 || 0.5));
                return (
                  <div key={s.name} className="panel p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{s.name}</div>
                      <div className="font-mono font-bold mt-0.5 tabular-nums" style={{ color: `var(--color-${s.color})` }}>
                        {Math.max(1, lo)}–{Math.max(1, hi)}
                      </div>
                    </div>
                    <div className="text-2xl shrink-0">👥</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div className="panel p-2.5 min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
      <div className={`font-bold truncate ${mono ? "font-mono tabular-nums" : ""}`} style={{ color: accent ? `var(--color-${accent})` : undefined }}>
        {value}
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm border-b border-border/50 py-1.5 min-w-0">
      <span className="text-muted-foreground truncate">{k}</span>
      <span className="font-medium text-right truncate">{v}</span>
    </div>
  );
}
