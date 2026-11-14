import { Dashboard } from "@/components/dashboard";
import { listReports } from "@/lib/db";
import { FundStats } from "@/components/fund-stats";
export default async function Page() {
  return (
    <>
      <Dashboard analytics rows={await listReports()} now={Date.now()} />
      <FundStats />
    </>
  );
}
