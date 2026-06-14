import { useApp, ROLE_META, type Role } from "@/lib/store";
import { useState } from "react";
import { STATION } from "@/lib/ndls-data";

export function Login() {
  const login = useApp((s) => s.login);
  const [role, setRole] = useState<Role>("station-master");
  const [name, setName] = useState("");
  const [badge, setBadge] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(role, name || ROLE_META[role].label, badge || "NR-00231");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
           style={{ background: "var(--gradient-primary)" }} />
      <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-25"
           style={{ background: "var(--gradient-danger)" }} />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-lg glow-primary"
                 style={{ background: "var(--gradient-primary)" }}>
              <span className="text-primary-foreground">NR</span>
            </div>
            <div>
              <div className="font-semibold tracking-wide">NDLS Command Center</div>
              <div className="text-xs text-muted-foreground">Northern Railway • New Delhi</div>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight">
              Operate the station<br/>
              <span className="text-gradient">with one pane of glass.</span>
            </h1>
            <p className="text-muted-foreground max-w-md text-lg">
              Live train timeline, predictive crowd analytics, unified incident response and SOP-driven coordination across RPF, Medical and Ticketing — built for {STATION.name}.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md pt-4">
              {[
                { k: "16", v: "Platforms" },
                { k: "480+", v: "Trains/day" },
                { k: "500k", v: "Footfall" },
              ].map((s) => (
                <div key={s.v} className="panel p-4">
                  <div className="text-2xl font-bold text-gradient">{s.k}</div>
                  <div className="text-xs text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Secure operational console • All actions are audit-logged
          </div>
        </div>

        {/* Login form */}
        <div className="flex items-center justify-center p-6 lg:p-12">
          <form onSubmit={submit} className="w-full max-w-md panel p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Sign in to console</h2>
              <p className="text-sm text-muted-foreground mt-1">Select your duty role to enter the live dashboard.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_META) as Role[]).map((r) => {
                const m = ROLE_META[r];
                const active = role === r;
                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      active
                        ? "border-primary bg-primary/10 glow-primary"
                        : "border-border hover:border-primary/50 hover:bg-secondary/40"
                    }`}
                  >
                    <div className="text-xl">{m.emoji}</div>
                    <div className="text-sm font-medium mt-1">{m.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {r === "station-master" ? "Full station view" : "Role + assist view"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Officer Name</label>
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. R. Sharma"
                  className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Badge / Employee ID</label>
                <input
                  value={badge} onChange={(e) => setBadge(e.target.value)}
                  placeholder="NR-00231"
                  className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg font-semibold text-primary-foreground transition-transform active:scale-[0.99] glow-primary"
              style={{ background: "var(--gradient-primary)" }}
            >
              Enter Command Center →
            </button>

            <div className="text-[11px] text-muted-foreground text-center">
              Demo console · works fully offline · data persists locally
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
