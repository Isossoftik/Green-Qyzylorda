import { SectionHeading } from "@/components/section";
import { ReportTable } from "@/components/report-table";
import { listReports } from "@/lib/db";
import { demoRole } from "@/lib/role";
import Link from "next/link";
export default async function Page() {
  return (
    <>
      <div className="directory-head">
        <SectionHeading
          title="Обращения"
          description="Регистрация и обработка сообщений жителей Кызылорды."
        />
        {(await demoRole()) !== "EXECUTOR" && (
          <Link className="primary" href="/reports/new">
            Создать обращение
          </Link>
        )}
      </div>
      <ReportTable rows={await listReports()} />
    </>
  );
}
