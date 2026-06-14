import { TRAINS } from "@/lib/ndls-data";

export function Ticker() {
  const items = TRAINS.map((t) => `${t.number} ${t.name} → ${t.destination} · PF${t.platform} · ${t.expected}${t.delayMin ? `  +${t.delayMin}m` : ""}`);
  const line = items.join("   ◆   ");
  return (
    <div className="relative overflow-hidden bg-secondary/40 border-y border-border h-8 flex items-center">
      <div className="absolute left-0 top-0 bottom-0 z-10 px-3 flex items-center text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground">
        Live Feed
      </div>
      <div className="ticker flex whitespace-nowrap text-xs pl-28 pr-8 text-muted-foreground font-mono">
        <span>{line}   ◆   </span>
        <span>{line}   ◆   </span>
      </div>
    </div>
  );
}
