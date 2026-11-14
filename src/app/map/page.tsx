import { SectionHeading } from "@/components/section";
import { MapPanel } from "@/components/map-panel";
import { listReports } from "@/lib/db";
import { greenPins } from "@/lib/fund-data";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tree?: string }>;
}) {
  return (
    <>
      <SectionHeading
        title="Карта города"
        description="Зелёные территории и зарегистрированные обращения Кызылорды."
      />
      <MapPanel
        focus={"/green-fund/trees/" + (await searchParams).tree}
        full
        pins={await greenPins()}
        rows={await listReports()}
      />
    </>
  );
}
