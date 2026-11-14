import { ActiveWork } from "@/components/active-work";
import { demoRole } from "@/lib/role";
import { Dashboard } from "@/components/dashboard";
import { listReports } from "@/lib/db";
import { greenPins } from "@/lib/fund-data";
export default async function Home() {
  return (
    <Dashboard
      activeWork={<ActiveWork />}
      canCreate={(await demoRole()) !== "EXECUTOR"}
      pins={await greenPins()}
      rows={await listReports()}
      now={Date.now()}
    />
  );
}
