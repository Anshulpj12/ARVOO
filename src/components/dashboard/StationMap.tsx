import { PLATFORMS, ZONES, type Train } from "@/lib/ndls-data";
import { useApp, type Incident } from "@/lib/store";

const zoneStyle: Record<string, { fill: string; ring: string; icon: string }> = {
  entry:      { fill: "var(--color-success)", ring: "var(--color-success)", icon: "→" },
  exit:       { fill: "var(--color-info)",    ring: "var(--color-info)",    icon: "↦" },
  waiting:    { fill: "var(--color-accent)",  ring: "var(--color-accent)",  icon: "◉" },
  restricted: { fill: "var(--color-destructive)", ring: "var(--color-destructive)", icon: "⊘" },
  medical:    { fill: "var(--color-success)", ring: "var(--color-success)", icon: "✚" },
  rpf:        { fill: "var(--color-info)",    ring: "var(--color-info)",    icon: "🛡" },
  facility:   { fill: "var(--color-muted-foreground)", ring: "var(--color-muted-foreground)", icon: "■" },
};

function platformLoad(p: number, trains: Train[]) {
  const t = trains.find((tr) => tr.platform === p && tr.status !== "departed");
  if (!t) return { pct: 0, train: null as Train | null };
  return { pct: Math.round((t.estimatedPax / t.capacity) * 100), train: t };
}

function loadColor(pct: number) {
  if (pct === 0) return "var(--color-muted)";
  if (pct < 30) return "var(--color-success)";
  if (pct < 70) return "var(--color-warning)";
  return "var(--color-destructive)";
}

interface Props {
  onSelectTrain: (t: Train) => void;
  onSelectIncident: (i: Incident) => void;
}

export function StationMap({ onSelectTrain, onSelectIncident }: Props) {
  const { trains, incidents, emergencyActive } = useApp();
  const active = incidents.filter((i) => i.status !== "resolved");

  return (
    <div className="relative panel overflow-hidden h-full min-h-[520px]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Live Schematic</div>
          <div className="font-semibold">NDLS · 16 Platform Layout</div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <Legend swatch="var(--color-success)" label="Low 0-30%" />
          <Legend swatch="var(--color-warning)" label="Med 30-70%" />
          <Legend swatch="var(--color-destructive)" label="High 70%+" />
        </div>
      </div>

      {/* Map canvas */}
      <div className="relative h-[calc(100%-57px)] min-h-[460px] grid-bg">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 w-1/3 scan-line opacity-30" />
        </div>

        {/* Concourse spine */}
        <div className="absolute left-[6%] right-[6%] top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Zones */}
        {ZONES.map((z) => {
          const s = zoneStyle[z.type];
          return (
            <div
              key={z.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-default"
              style={{ left: `${z.x}%`, top: `${z.y}%` }}
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold border-2"
                style={{ background: `${s.fill}30`, borderColor: s.ring, color: s.ring }}
              >
                {s.icon}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 mt-1 text-[9px] whitespace-nowrap text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
                {z.label}
              </div>
            </div>
          );
        })}

        {/* Platforms grid */}
        <div className="absolute inset-x-[12%] inset-y-[18%] grid grid-cols-2 gap-3">
          {[0, 1].map((col) => (
            <div key={col} className="grid grid-rows-8 gap-2">
              {PLATFORMS.slice(col * 8, col * 8 + 8).map((p) => {
                const { pct, train } = platformLoad(p.id, trains);
                const incident = active.find((i) => i.platform === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => train && onSelectTrain(train)}
                    className={`relative h-full rounded-md border bg-card/60 hover:bg-card transition-all text-left px-2 py-1 ${
                      incident ? "border-destructive glow-danger" : "border-border hover:border-primary/60"
                    }`}
                  >
                    {/* Segments heatmap */}
                    <div className="absolute inset-y-0 right-1.5 w-1.5 flex flex-col gap-0.5 py-1">
                      {[0, 1, 2].map((seg) => {
                        const segPct = train ? Math.min(100, pct + (seg === 1 ? 15 : seg === 0 ? -5 : -10)) : 0;
                        return (
                          <div
                            key={seg}
                            className="flex-1 rounded-sm"
                            style={{ background: loadColor(Math.max(0, segPct)) }}
                          />
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-mono font-bold text-muted-foreground w-6">PF{p.id}</div>
                      {train ? (
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold truncate">{train.name}</div>
                          <div className="text-[9px] text-muted-foreground font-mono">
                            {train.number} · {train.expected}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground italic">— vacant —</div>
                      )}
                    </div>

                    {incident && (
                      <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-destructive text-destructive-foreground pulse-dot" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Incident pins (corner badges) */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 z-10">
          {active.slice(0, 4).map((i) => (
            <button
              key={i.id}
              onClick={() => onSelectIncident(i)}
              className="glass text-xs px-2.5 py-1.5 rounded-md flex items-center gap-2 hover:border-destructive/60"
            >
              <span className="w-2 h-2 rounded-full bg-destructive pulse-dot text-destructive" />
              <span className="font-mono text-[10px]">{i.id}</span>
              <span className="text-muted-foreground">PF{i.platform}</span>
              <span className="capitalize">{i.type}</span>
            </button>
          ))}
        </div>

        {emergencyActive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider glow-danger"
               style={{ background: "var(--gradient-danger)", color: "white" }}>
            ⚠ Emergency Mode Active
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="w-3 h-3 rounded-sm" style={{ background: swatch }} />
      {label}
    </div>
  );
}
