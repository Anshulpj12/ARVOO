import { useApp, type Incident, type IncidentType, ROLE_META } from "@/lib/store";
import { useState } from "react";

const typeMeta: Record<IncidentType, { label: string; color: string; icon: string }> = {
  medical:   { label: "Medical", color: "success",     icon: "✚" },
  intrusion: { label: "Intrusion", color: "info",      icon: "⚠" },
  crowd:     { label: "Crowd Surge", color: "destructive", icon: "👥" },
  fire:      { label: "Fire / Smoke", color: "destructive", icon: "🔥" },
};

interface Props {
  onSelect: (i: Incident) => void;
  selectedId?: string;
}

export function IncidentList({ onSelect, selectedId }: Props) {
  const { incidents, session, createIncident } = useApp();
  const [show, setShow] = useState(false);
  const [type, setType] = useState<IncidentType>("medical");
  const [platform, setPlatform] = useState(1);
  const [zone, setZone] = useState<Incident["zone"]>("middle");
  const [desc, setDesc] = useState("");

  const role = session.role!;
  const myAlerts = role === "station-master" ? incidents : incidents.filter(
    (i) => i.primaryRole === role || i.assistRoles.includes(role),
  );
  const sorted = [...myAlerts].sort((a, b) =>
    Number(a.status === "resolved") - Number(b.status === "resolved") || b.createdAt - a.createdAt,
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const primaryRole: Incident["primaryRole"] =
      type === "medical" ? "medical" : type === "intrusion" ? "rpf" : type === "fire" ? "rpf" : "station-master";
    const assistRoles: Incident["assistRoles"] =
      type === "medical"   ? ["rpf", "station-master"] :
      type === "intrusion" ? ["medical", "station-master"] :
      type === "fire"      ? ["medical", "ticket", "station-master"] :
                             ["rpf", "medical", "ticket"];
    createIncident({
      type, platform, zone, description: desc || `${typeMeta[type].label} reported on PF${platform}`,
      primaryRole, assistRoles, reportedBy: role,
    });
    setDesc(""); setShow(false);
  };

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Incidents</div>
          <div className="font-semibold">
            {role === "station-master" ? "All station alerts" : `Priority + assist for ${ROLE_META[role].label}`}
          </div>
        </div>
        <button
          onClick={() => setShow(true)}
          className="text-xs px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold"
        >
          + Report
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {sorted.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <div className="text-4xl mb-2">✓</div>
            No active alerts. Station operating normally.
          </div>
        )}
        {sorted.map((i) => {
          const tm = typeMeta[i.type];
          const done = i.sop.filter((t) => t.done).length;
          const isPriority = i.primaryRole === role;
          return (
            <button
              key={i.id}
              onClick={() => onSelect(i)}
              className={`w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors relative ${
                selectedId === i.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
              } ${i.status === "resolved" ? "opacity-60" : ""}`}
            >
              {isPriority && role !== "station-master" && i.status !== "resolved" && (
                <span className="absolute top-2 right-3 text-[9px] font-bold uppercase tracking-wider text-destructive">
                  ◆ Priority
                </span>
              )}
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center text-base shrink-0 border"
                  style={{ background: `var(--color-${tm.color})20`, borderColor: `var(--color-${tm.color})`, color: `var(--color-${tm.color})` }}
                >
                  {tm.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{i.id}</span>
                    <span className="font-semibold text-sm">{tm.label}</span>
                    {i.status === "resolved" && (
                      <span className="text-[9px] uppercase font-bold text-success">Resolved</span>
                    )}
                    {i.status === "responding" && (
                      <span className="text-[9px] uppercase font-bold text-warning">Responding</span>
                    )}
                    {i.status === "active" && (
                      <span className="text-[9px] uppercase font-bold text-destructive">Active</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{i.description}</div>
                  <div className="flex items-center gap-3 mt-2 text-[11px]">
                    <span>PF<span className="font-bold ml-0.5">{i.platform}</span></span>
                    <span className="capitalize text-muted-foreground">· {i.zone}</span>
                    <span className="ml-auto font-mono">
                      <span className="text-success">{done}</span>
                      <span className="text-muted-foreground">/{i.sop.length}</span> SOP
                    </span>
                  </div>
                  {/* Mini SOP progress */}
                  <div className="mt-1.5 h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-success transition-all"
                         style={{ width: `${(done / i.sop.length) * 100}%` }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="relative panel p-6 max-w-md w-full space-y-4">
            <div>
              <h3 className="text-lg font-bold">Report new incident</h3>
              <p className="text-xs text-muted-foreground">Logged under {ROLE_META[role].label} · {session.badge}</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Type</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {(Object.keys(typeMeta) as IncidentType[]).map((k) => (
                  <button type="button" key={k} onClick={() => setType(k)}
                    className={`p-2 rounded-md border text-xs ${type === k ? "border-primary bg-primary/10" : "border-border"}`}>
                    <div className="text-lg">{typeMeta[k].icon}</div>
                    {typeMeta[k].label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Platform</label>
                <select value={platform} onChange={(e) => setPlatform(+e.target.value)}
                        className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 font-mono">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>PF {p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Zone</label>
                <select value={zone} onChange={(e) => setZone(e.target.value as Incident["zone"])}
                        className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 capitalize">
                  <option value="front">Front</option>
                  <option value="middle">Middle</option>
                  <option value="rear">Rear</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
                placeholder="Brief details for responding units…"
                className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShow(false)}
                className="flex-1 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button type="submit"
                className="flex-1 py-2 rounded-lg font-semibold text-destructive-foreground"
                style={{ background: "var(--gradient-danger)" }}>
                Raise alert
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
