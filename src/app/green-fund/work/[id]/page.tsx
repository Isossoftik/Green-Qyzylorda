import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { demoRole } from "@/lib/role";
import { fund, overdue } from "@/lib/green";
import { FundHeading } from "@/components/fund-shell";
import { GreenForm } from "@/components/green-forms";
import { ServiceHistory, historyInclude } from "@/components/service-history";
import { actors, date, labels } from "@/lib/workflow";
import Link from "next/link";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const t = await db.task.findFirst({
    where: { id, reportId: null },
    include: { ...historyInclude, tree: true, zone: true, assignee: true },
  });
  if (!t) notFound();
  const role = await demoRole(),
    worker = role === "EXECUTOR" && t.assigneeId === actors.EXECUTOR;
  return (
    <>
      <FundHeading
        active="calendar"
        title={t.workType + " · №" + id}
        desc={(t.seedKey ? "DEMO · " : "") + labels[t.status]}
      />
      <div className="detail-grid">
        <div className="detail-side">
          <section className="panel form-card">
            <h2>Плановая работа</h2>
            <dl>
              <dt>Объект</dt>
              <dd>
                <Link
                  className="text-link"
                  href={
                    fund +
                    (t.treeId ? "/trees/" + t.treeId : "/zones/" + t.zoneId)
                  }
                >
                  {t.tree?.species ?? t.zone?.name}
                </Link>
              </dd>
              <dt>Исполнитель</dt>
              <dd>{t.assignee.name}</dd>
              <dt>Дата начала</dt>
              <dd>{date(t.scheduledAt!)}</dd>
              <dt>Выполнить до</dt>
              <dd>{date(t.dueAt)}</dd>
            </dl>
            {overdue(t) && (
              <p className="error-msg">
                Срок истёк, работа ещё не передана на проверку.
              </p>
            )}
          </section>
          {worker && t.status === "ASSIGNED" && (
            <GreenForm action="begin" label="Начать выполнение" id={id} />
          )}
          {worker && t.status === "IN_PROGRESS" && (
            <GreenForm action="submit" label="Передать на проверку" id={id}>
              <label>
                Комментарий о результате
                <textarea required minLength={3} name="comment" />
              </label>
              <label>
                Фото результата · до 5 МБ
                <input
                  required
                  type="file"
                  name="photo"
                  accept="image/png,image/webp,image/jpeg"
                />
              </label>
            </GreenForm>
          )}
          {role === "OPERATOR" && t.status === "RESOLVED" && (
            <GreenForm
              action="approve"
              label="Подтвердить выполнение"
              id={id}
            />
          )}
        </div>
        <ServiceHistory tasks={[t]} />
      </div>
    </>
  );
}
