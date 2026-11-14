import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { demoRole } from "@/lib/role";
import { FundHeading } from "@/components/fund-shell";
import { GreenForm, PlanForm } from "@/components/green-forms";
export default async function Page() {
  const [role, rows, users, trees, zones] = await Promise.all([
    demoRole(),
    db.careSchedule.findMany({
      include: {
        tree: true,
        zone: true,
        assignee: true,
        _count: { select: { occurrences: true } },
      },
      orderBy: { id: "desc" },
    }),
    db.user.findMany({ where: { role: "EXECUTOR" } }),
    db.tree.findMany(),
    db.zone.findMany(),
  ]);
  return (
    <>
      <FundHeading
        active="schedules"
        title="Повторяющиеся графики"
        desc="Плановые работы формируются до выбранной даты включительно."
      />
      <div className="detail-grid">
        <section className="panel form-card">
          <h2>Графики обслуживания · {rows.length}</h2>
          {rows.map((s) => (
            <div key={s.id}>
              <h3>
                {s.workType} №{s.id} · {s.tree?.species ?? s.zone?.name}
              </h3>
              <p>
                {s.startDay} — {s.endDay} · интервал {s.intervalDays} дн.
              </p>
              <small>
                {s.assignee.name} · заданий {s._count.occurrences}
              </small>
              {role === "OPERATOR" && (
                <GreenForm
                  action="regenerate"
                  id={s.id}
                  label="Сформировать недостающие задания"
                />
              )}
            </div>
          ))}
          {!rows.length && <p>Графиков пока нет.</p>}
        </section>
        {role === "OPERATOR" && (
          <div>
            <h2>Новый график</h2>
            <PlanForm
              key={randomUUID()}
              scheduleKey={randomUUID()}
              users={users}
              zones={zones}
              trees={trees.map((t) => ({ id: t.id, name: t.species }))}
            />
          </div>
        )}
      </div>
    </>
  );
}
