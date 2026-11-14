import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { actors, date } from "@/lib/workflow";
import { demoRole } from "@/lib/role";
export async function ActiveWork() {
  const role = await demoRole();
  const tasks = await db.task.findMany({
    where: {
      status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      ...(role === "EXECUTOR" ? { assigneeId: actors.EXECUTOR } : {}),
      ...(role === "RESIDENT" ? { reportId: null } : {}),
    },
    include: { report: true, tree: true, zone: true },
    orderBy: { dueAt: "asc" },
    take: 4,
  });
  return (
    <section className="panel duty">
      <div className="panel-head">
        <h2>Активные задания</h2>
        <Link
          href="/green-fund/calendar"
          className="icon-link"
          aria-label="Календарь работ"
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {tasks.map((t) => (
        <Link
          className="duty-row"
          href={(t.reportId ? "/tasks/" : "/green-fund/work/") + t.id}
          key={t.id}
        >
          <span className={+t.dueAt < Date.now() ? "due late" : "due"}>
            {date(t.dueAt)}
          </span>
          <strong>{t.workType ?? t.report?.title}</strong>
          <small>{t.tree?.species ?? t.zone?.name ?? t.report?.address}</small>
        </Link>
      ))}
      {!tasks.length && <p className="empty">Активных заданий нет.</p>}
    </section>
  );
}
