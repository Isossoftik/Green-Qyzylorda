import { db } from "@/lib/db";
import { actors, labels, date } from "@/lib/workflow";
import { demoRole } from "@/lib/role";
import Link from "next/link";
import { SectionHeading } from "@/components/section";
import { TaskStatus } from "@prisma/client";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; due?: string }>;
}) {
  const role = await demoRole(),
    { status, due } = await searchParams;
  const rows =
    role === "RESIDENT"
      ? []
      : await db.task.findMany({
          where: {
            ...(role === "EXECUTOR" ? { assigneeId: actors.EXECUTOR } : {}),
            ...(due === "late"
              ? {
                  dueAt: { lt: new Date() },
                  status: { in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] },
                }
              : {}),
            ...(due !== "late" && status && Object.hasOwn(TaskStatus, status)
              ? { status: status as TaskStatus }
              : {}),
          },
          include: { report: true, assignee: true },
          orderBy: { dueAt: "asc" },
        });
  return (
    <>
      <SectionHeading
        title="Задания"
        description="Назначенные работы, сроки и результаты проверки."
      />
      {role === "RESIDENT" ? (
        <div className="panel empty">
          Для работы с заданиями выберите DEMO ROLE «Исполнитель» или
          «Оператор».
        </div>
      ) : (
        <section className="panel table-panel">
          <div className="panel-head">
            <h2>Назначенные задания</h2>
            <Link className="text-link" href="/green-fund/calendar">
              Календарь ухода ↗
            </Link>
          </div>
          <nav className="filter-tabs">
            {["", ...Object.keys(TaskStatus)].map((s) => (
              <Link
                key={s}
                aria-current={
                  due !== "late" && (status || "") === s ? "page" : undefined
                }
                href={s ? "/tasks?status=" + s : "/tasks"}
              >
                {s ? labels[s as TaskStatus] : "Все"}
              </Link>
            ))}
            <Link
              aria-current={due === "late" ? "page" : undefined}
              href="/tasks?due=late"
            >
              Просроченные
            </Link>
          </nav>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {["Задание", "Исполнитель", "Выполнить до", "Статус"].map(
                    (t) => (
                      <th key={t}>{t}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link
                        className="text-link"
                        href={
                          (t.reportId ? "/tasks/" : "/green-fund/work/") + t.id
                        }
                      >
                        №{t.id} · {t.report?.title ?? t.workType}
                      </Link>
                    </td>
                    <td>{t.assignee.name}</td>
                    <td>
                      {date(t.dueAt)}{" "}
                      {["ASSIGNED", "IN_PROGRESS"].includes(t.status) &&
                        +t.dueAt < Date.now() && (
                          <span className="late-tag">Просрочено</span>
                        )}
                    </td>
                    <td>
                      <span className="status" data-state={t.status}>
                        {labels[t.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <p className="empty">Заданий с таким статусом нет.</p>
          )}
        </section>
      )}
    </>
  );
}
