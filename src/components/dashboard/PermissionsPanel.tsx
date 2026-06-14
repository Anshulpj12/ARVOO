import {
  useApp, ROLE_META, PERMISSION_LABELS, FIELD_LABELS,
  ALL_ACTIONS, ALL_FIELDS, type Role, type ActionKey, type FieldKey,
} from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function PermissionsPanel() {
  const { permissions, setPermission, resetPermissions, session } = useApp();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"actions" | "fields">("actions");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!session.role) return null;
  // Only Station Master can edit the matrix; others see read-only.
  const isMaster = session.role === "station-master";
  const roles = Object.keys(ROLE_META) as Role[];

  const handleToggle = (r: Role, kind: "actions" | "fields", key: string, next: boolean) => {
    if (!isMaster) {
      toast.error("Only Station Master can edit the permission matrix");
      return;
    }
    setPermission(r, kind, key, next);
    const label = kind === "actions" ? PERMISSION_LABELS[key as ActionKey] : FIELD_LABELS[key as FieldKey];
    toast.success(`${ROLE_META[r].label} · ${label} ${next ? "enabled" : "disabled"}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Role permissions"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <span>🛡</span>
        <span className="hidden md:inline">Roles</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(96vw,680px)] panel z-50 max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Role Permission Matrix</div>
              <div className="text-[10px] text-muted-foreground">
                {isMaster ? "Edit which roles can perform actions and view fields." : "Read-only — Station Master controls this."}
              </div>
            </div>
            {isMaster && (
              <button
                onClick={() => { resetPermissions(); toast("Permissions reset to defaults"); }}
                className="text-[10px] uppercase tracking-wider text-primary hover:underline shrink-0"
              >
                Reset defaults
              </button>
            )}
          </div>

          <div className="px-3 pt-3 flex gap-1 border-b border-border">
            {(["actions", "fields"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-xs px-3 py-1.5 rounded-t-md font-medium ${
                  tab === t ? "bg-primary/15 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "actions" ? "Action permissions" : "Field visibility"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-3">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left pb-2 pr-2 sticky left-0 bg-card z-10">
                    {tab === "actions" ? "Action" : "Field"}
                  </th>
                  {roles.map((r) => (
                    <th key={r} className="px-2 pb-2 text-center min-w-[80px]">
                      <div className="flex flex-col items-center leading-tight">
                        <span>{ROLE_META[r].emoji}</span>
                        <span className="text-[10px] font-medium" style={{ color: `var(--color-${ROLE_META[r].color})` }}>
                          {ROLE_META[r].label.split(" ")[0]}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(tab === "actions" ? ALL_ACTIONS : ALL_FIELDS).map((key) => {
                  const label = tab === "actions"
                    ? PERMISSION_LABELS[key as ActionKey]
                    : FIELD_LABELS[key as FieldKey];
                  return (
                    <tr key={key} className="hover:bg-secondary/30">
                      <td className="py-1.5 pr-2 sticky left-0 bg-card text-foreground border-t border-border">
                        {label}
                      </td>
                      {roles.map((r) => {
                        const granted = tab === "actions"
                          ? permissions.actions[r][key as ActionKey]
                          : permissions.fields[r][key as FieldKey];
                        return (
                          <td key={r} className="text-center border-t border-border py-1.5">
                            <button
                              onClick={() => handleToggle(r, tab, key, !granted)}
                              disabled={!isMaster}
                              className={`w-7 h-7 rounded-md border-2 transition-colors disabled:cursor-not-allowed ${
                                granted
                                  ? "bg-success/20 border-success text-success"
                                  : "bg-destructive/10 border-destructive/40 text-destructive"
                              }`}
                              title={granted ? "Granted — click to revoke" : "Denied — click to grant"}
                            >
                              {granted ? "✓" : "✕"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
            Changes apply instantly across every open dashboard and survive refresh.
          </div>
        </div>
      )}
    </div>
  );
}
