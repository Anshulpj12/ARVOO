import { useApp, ROLE_META } from "@/lib/store";
import { useEffect, useState } from "react";
import { NotificationCenter } from "./NotificationCenter";
import { AlertRulesPanel } from "./AlertRulesPanel";
import { AuditLogPanel } from "./AuditLogPanel";
import { PermissionsPanel } from "./PermissionsPanel";
import { ConnectionPill } from "./ConnectionStatus";

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="hidden md:flex flex-col items-end leading-tight">
      <div className="font-mono text-lg font-semibold tabular-nums">
        {t.toLocaleTimeString("en-IN", { hour12: false })}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {t.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })} · IST
      </div>
    </div>
  );
}

export function TopBar() {
  const { session, logout } = useApp();
  const meta = session.role ? ROLE_META[session.role] : null;
  return (
    <header className="relative z-20 panel rounded-none border-x-0 border-t-0 px-4 lg:px-6 py-3 flex items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm glow-primary"
             style={{ background: "var(--gradient-primary)" }}>
          <span className="text-primary-foreground">NR</span>
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-sm">NDLS Command Center</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">New Delhi · Northern Railway</div>
        </div>
      </div>

      <div className="flex-1" />

      <ConnectionPill />
      <NotificationCenter />
      <AlertRulesPanel />
      <PermissionsPanel />
      <AuditLogPanel />
      <Clock />

      <div className="flex items-center gap-3 pl-3 ml-1 border-l border-border">
        <div className="text-right leading-tight hidden sm:block">
          <div className="text-sm font-medium">{session.name}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{session.badge} · {meta?.label}</div>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{ background: `var(--color-${meta?.color})`, color: `var(--color-${meta?.color}-foreground)` }}
        >
          {meta?.emoji}
        </div>
        <button
          onClick={logout}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:border-primary/40"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
