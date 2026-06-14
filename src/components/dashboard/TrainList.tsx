import { useApp } from "@/lib/store";
import { type Train } from "@/lib/ndls-data";

const statusStyle: Record<Train["status"], { bg: string; label: string }> = {
  "on-time":   { bg: "var(--color-success)",     label: "ON TIME" },
  "delayed":   { bg: "var(--color-warning)",     label: "DELAYED" },
  "arriving":  { bg: "var(--color-info)",        label: "ARRIVING" },
  "boarding":  { bg: "var(--color-primary)",     label: "BOARDING" },
  "departed":  { bg: "var(--color-muted-foreground)", label: "DEPARTED" },
};

interface Props {
  onSelect: (t: Train) => void;
  selectedId?: string;
}

export function TrainList({ onSelect, selectedId }: Props) {
  const trains = useApp((s) => s.trains);
  const active = trains.filter((t) => t.status !== "departed");

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Train Operations</div>
          <div className="font-semibold">Live arrivals & departures</div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          <span className="text-success font-medium">{active.length}</span> active
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {trains.map((t) => {
          const pct = Math.round((t.estimatedPax / t.capacity) * 100);
          const isSel = t.id === selectedId;
          const st = statusStyle[t.status];
          return (
            <div key={t.id} className="relative group">
            <button
              onClick={() => onSelect(t)}
              className={`w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors ${
                isSel ? "bg-primary/10 border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">{t.number}</span>
                    <span className="font-semibold text-sm truncate">{t.name}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {t.origin} → {t.destination} · {t.coachCount} coaches
                  </div>
                </div>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
                  style={{ background: `${st.bg}25`, color: st.bg }}
                >
                  {st.label}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">PF</span>
                  <span className="font-mono font-bold text-base text-foreground">{t.platform}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">SCH</span>
                  <span className="font-mono tabular-nums">{t.scheduled}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">EXP</span>
                  <span className={`font-mono tabular-nums ${t.delayMin > 0 ? "text-warning" : "text-success"}`}>
                    {t.expected}
                  </span>
                  {t.delayMin > 0 && <span className="text-warning">+{t.delayMin}m</span>}
                </div>
              </div>

              {/* Load bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">Estimated load</span>
                  <span className="font-mono">{t.estimatedPax.toLocaleString("en-IN")} / {t.capacity.toLocaleString("en-IN")} ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct < 30 ? "var(--color-success)" :
                                  pct < 70 ? "var(--color-warning)" :
                                             "var(--color-destructive)",
                    }}
                  />
                </div>
              </div>
            </button>
            {/* Zero-latency hover preview — full train context without opening the drawer. */}
            <div className="pointer-events-none absolute right-3 top-2 z-30 w-72 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 panel p-3 shadow-2xl backdrop-blur-md bg-popover/95">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-primary">{t.number}</span>
                <span className="text-sm font-semibold truncate">{t.name}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mb-2">{t.origin} → {t.destination}</div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <Detail k="Platform" v={`PF ${t.platform}`} />
                <Detail k="Coaches" v={`${t.coachCount}`} />
                <Detail k="Scheduled" v={t.scheduled} mono />
                <Detail k="Expected" v={`${t.expected}${t.delayMin > 0 ? ` (+${t.delayMin}m)` : ""}`} mono tone={t.delayMin > 0 ? "warning" : "success"} />
                <Detail k="Next halt" v={t.nextStop.name} />
                <Detail k="ETA" v={t.nextStop.eta} mono />
                <Detail k="Distance" v={`${t.nextStop.distanceKm} km`} />
                <Detail k="Load" v={`${pct}%`} tone={pct < 30 ? "success" : pct < 70 ? "warning" : "destructive"} />
              </div>
              <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
                {t.estimatedPax.toLocaleString("en-IN")} / {t.capacity.toLocaleString("en-IN")} passengers · {t.status.toUpperCase()}
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ k, v, mono, tone }: { k: string; v: string; mono?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="text-muted-foreground uppercase tracking-wider text-[9px]">{k}</span>
      <span
        className={`truncate font-semibold ${mono ? "font-mono tabular-nums" : ""}`}
        style={tone ? { color: `var(--color-${tone})` } : undefined}
      >
        {v}
      </span>
    </div>
  );
}
