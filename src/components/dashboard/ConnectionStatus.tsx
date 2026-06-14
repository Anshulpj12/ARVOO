import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";

const fmt = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

/** Compact pill in the top bar — shows live / syncing / offline. */
export function ConnectionPill() {
  const { syncStatus, online, lastSync, reconnectAttempts, setOnline, attemptReconnect } = useApp();
  const time = fmt(lastSync);

  const meta =
    syncStatus === "ok"
      ? { color: "success", label: `Live · synced ${time}`, dot: true }
      : syncStatus === "syncing"
        ? { color: "warning", label: `Reconnecting… (#${reconnectAttempts})`, dot: false }
        : { color: "destructive", label: `Offline · cached ${time}`, dot: false };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setOnline(!online)}
        title="Toggle simulated network (demo)"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
        style={{
          background: `var(--color-${meta.color})15`,
          borderColor: `var(--color-${meta.color})66`,
          color: `var(--color-${meta.color})`,
        }}
      >
        <span
          className={`relative w-2 h-2 rounded-full ${meta.dot ? "pulse-dot" : ""}`}
          style={{ background: `var(--color-${meta.color})`, color: `var(--color-${meta.color})` }}
        />
        {meta.label}
      </button>
      {syncStatus !== "ok" && (
        <button
          onClick={attemptReconnect}
          className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/** Sticky banner that drops in when the dashboard can't deliver updates instantly. */
export function ConnectionBanner() {
  const { syncStatus, queue, attemptReconnect, reconnectAttempts } = useApp();
  const [tick, setTick] = useState(0);

  // Automatic reconnection: backoff retries while offline/syncing.
  useEffect(() => {
    if (syncStatus === "ok") return;
    const delay = Math.min(1500 * 2 ** Math.min(reconnectAttempts, 5), 30_000);
    const t = setTimeout(() => {
      attemptReconnect();
      setTick((x) => x + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [syncStatus, reconnectAttempts, attemptReconnect, tick]);

  if (syncStatus === "ok") return null;
  const isOffline = syncStatus === "offline";

  return (
    <div
      role="alert"
      className="relative z-30 flex items-center gap-3 px-4 py-2 text-sm font-medium border-b"
      style={{
        background: isOffline ? "var(--color-destructive)" : "var(--color-warning)",
        color: isOffline ? "var(--color-destructive-foreground)" : "var(--color-warning-foreground)",
      }}
    >
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      <span className="flex-1 truncate">
        {isOffline
          ? `Offline — updates won't reach other dashboards instantly. ${queue.length} queued for replay.`
          : `Reconnecting to live sync… attempt #${reconnectAttempts}`}
      </span>
      <button
        onClick={attemptReconnect}
        className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded border border-current hover:bg-background/20"
      >
        Reconnect now
      </button>
    </div>
  );
}
