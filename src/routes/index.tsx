import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import type { Train } from "@/lib/ndls-data";
import type { Incident } from "@/lib/store";

import { Login } from "@/components/dashboard/Login";
import { TopBar } from "@/components/dashboard/TopBar";
import { Ticker } from "@/components/dashboard/Ticker";
import { ConnectionBanner } from "@/components/dashboard/ConnectionStatus";
import { StationMap } from "@/components/dashboard/StationMap";
import { TrainList } from "@/components/dashboard/TrainList";
import { TrainPanel } from "@/components/dashboard/TrainPanel";
import { IncidentList } from "@/components/dashboard/IncidentList";
import { IncidentDrawer } from "@/components/dashboard/IncidentDrawer";
import { SafetyScore, CrowdPrediction, StaffAllocation, EmergencyButton } from "@/components/dashboard/Widgets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NDLS Command Center · Live Station Operations" },
      { name: "description", content: "Unified real-time command console for New Delhi Railway Station — live trains, predictive crowd analytics, incident response and SOP-driven coordination across RPF, Medical and Ticketing." },
      { property: "og:title", content: "NDLS Command Center" },
      { property: "og:description", content: "Live operational dashboard for India's busiest railway station." },
    ],
  }),
  component: Page,
});

function Page() {
  const { session, tickTrains, online } = useApp();
  const [train, setTrain] = useState<Train | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);

  // simulate live updates every 5 sec when online
  useEffect(() => {
    if (!online) return;
    const i = setInterval(() => tickTrains(), 5000);
    return () => clearInterval(i);
  }, [online, tickTrains]);

  if (!session.role) return <Login />;

  const isMaster = session.role === "station-master";

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <ConnectionBanner />
      <Ticker />

      <main className="flex-1 grid gap-3 p-3 lg:p-4"
            style={{ gridTemplateColumns: "minmax(0,1fr) 380px", gridTemplateRows: "1fr auto" }}>
        {/* Map (top-left, spans rows for master) */}
        <section className={isMaster ? "row-span-1" : "row-span-1"}>
          <StationMap onSelectTrain={setTrain} onSelectIncident={setIncident} />
        </section>

        {/* Right column: incidents + trains stacked */}
        <section className="row-span-2 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-[280px]">
            <IncidentList onSelect={setIncident} selectedId={incident?.id} />
          </div>
          <div className="flex-1 min-h-[280px]">
            <TrainList onSelect={setTrain} selectedId={train?.id} />
          </div>
        </section>

        {/* Bottom widgets row */}
        <section className="grid gap-3" style={{ gridTemplateColumns: "1fr 1.2fr 1.4fr 0.9fr" }}>
          <SafetyScore />
          <CrowdPrediction />
          <StaffAllocation />
          <div className="flex items-center"><EmergencyButton /></div>
        </section>
      </main>

      <TrainPanel train={train} onClose={() => setTrain(null)} />
      <IncidentDrawer incident={incident} onClose={() => setIncident(null)} />
    </div>
  );
}
