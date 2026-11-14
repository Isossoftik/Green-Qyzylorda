import { db } from "@/lib/db";
import { fund, dayKey, overdue } from "@/lib/green";
import { FundHeading } from "@/components/fund-shell";
import { demoRole } from "@/lib/role";
import { labels, date } from "@/lib/workflow";
import Link from "next/link";
export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; late?: string }>;
}) {
  const query = await searchParams,
    month = /^(19|20)\d\d-(0[1-9]|1[012])$/.test(query.month ?? "")
      ? query.month!
      : dayKey(new Date()).slice(0, 7);
  const first = new Date(month + "-01T12:00:00Z");
  const shift = (n: number) =>
    new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + n, 1))
      .toISOString()
      .slice(0, 7);
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const tasks = await db.task.findMany({
    where: { reportId: null },
    include: { tree: true, zone: true, assignee: true },
    orderBy: { scheduledAt: "asc" },
  });
  const late = tasks.filter((t) => overdue(t));
  const rows =
    query.late === "1"
      ? late
      : tasks.filter((t) => dayKey(t.scheduledAt!).startsWith(month));
  return (
    <>
      <FundHeading
        active="calendar"
        title="Календарь ухода"
        desc="Плановые работы по деревьям и зелёным территориям."
      />
      <section className="panel">
        <div className="panel-head">
          <h2>
            {first.toLocaleDateString("ru-RU", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </h2>
          {(await demoRole()) === "OPERATOR" && (
            <Link className="primary" href={fund + "/new/work"}>
              Запланировать работу
            </Link>
          )}
        </div>
        <nav className="filter-tabs">
          <Link href={"?month=" + shift(-1)}>← Предыдущий</Link>
          <Link href={fund + "/calendar"}>Текущий месяц</Link>
          <Link href={"?month=" + shift(1)}>Следующий →</Link>
          <Link
            href="?late=1"
            aria-current={query.late === "1" ? "page" : undefined}
          >
            Просроченные · {late.length}
          </Link>
        </nav>
        {query.late !== "1" && (
          <div className="calendar-grid">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
              <b key={d}>{d}</b>
            ))}
            {Array.from({ length: (first.getUTCDay() + 6) % 7 }, (_, i) => (
              <div key={"gap" + i} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const day = month + "-" + String(i + 1).padStart(2, "0");
              return (
                <div className="cal-day" key={day}>
                  <b>{i + 1}</b>
                  {rows
                    .filter((t) => dayKey(t.scheduledAt!) === day)
                    .map((t) => (
                      <Link
                        className="cal-work"
                        key={t.id}
                        href={fund + "/work/" + t.id}
                      >
                        {t.workType}
                      </Link>
                    ))}
                </div>
              );
            })}
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["Работа", "Объект", "Бригада", "Срок", "Статус"].map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link className="text-link" href={fund + "/work/" + t.id}>
                      {t.workType} №{t.id}
                    </Link>
                  </td>
                  <td>{t.tree?.species ?? t.zone?.name}</td>
                  <td>{t.assignee.name}</td>
                  <td>{date(t.dueAt)}</td>
                  <td>
                    {overdue(t) ? "Просрочено · " : ""}
                    {labels[t.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="empty">Работ в этой выборке нет.</p>}
      </section>
    </>
  );
}
