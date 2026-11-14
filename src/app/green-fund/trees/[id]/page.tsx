import { PhotoReview } from "@/components/photo-review";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { demoRole } from "@/lib/role";
import { fund, recommendations } from "@/lib/green";
import { FundHeading } from "@/components/fund-shell";
import { GreenForm, TreeForm } from "@/components/green-forms";
import { ServiceHistory, historyInclude } from "@/components/service-history";
import { date } from "@/lib/workflow";
import Link from "next/link";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const t = await db.tree.findUnique({
    where: { id },
    include: { zone: true, tasks: { include: historyInclude } },
  });
  if (!t) notFound();
  const op = (await demoRole()) === "OPERATOR",
    plan = fund + "/new/work?target=tree:" + id;
  return (
    <>
      <FundHeading
        title={t.species + " · №" + id}
        desc={(t.seedKey ? "DEMO · " : "") + (t.zone?.name ?? t.address)}
        active="trees"
      />
      <div className="detail-grid">
        <div className="detail-side">
          <section className="panel form-card">
            <div className="tree-passport">
              <span className="condition" data-condition={t.condition}>
                {t.condition}
              </span>
              <h2>{t.species}</h2>
              <small>Карточка дерева №{id}</small>
            </div>
            <Link className="text-link" href={"/map?tree=" + id}>
              Показать на карте ↗
            </Link>
            <dl>
              {[
                ["Адрес", t.address || "См. территорию"],
                ["Координаты", t.lat + ", " + t.lng],
                ["Посадка", t.planted ? date(t.planted) : "Дата неизвестна"],
                [
                  "Последний осмотр",
                  t.inspected ? date(t.inspected) : "Не указан",
                ],
                ["Комментарий", t.comment || "Нет комментария"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {t.zone && (
              <Link className="text-link" href={fund + "/zones/" + t.zone.id}>
                {t.zone.name}
              </Link>
            )}
            {t.photo && (
              <PhotoReview
                id={id}
                image={t.photo}
                operator={op}
                object="tree"
              />
            )}
            {t.photo && (
              <img
                className="evidence"
                src={"/api/photos/" + t.photo}
                alt={t.species}
              />
            )}
            {op && (
              <Link className="primary" href={plan}>
                Запланировать работу
              </Link>
            )}
          </section>
          {op && (
            <>
              <details>
                <summary>Редактировать карточку</summary>
                <TreeForm
                  tree={t}
                  zones={await db.zone.findMany({
                    select: { id: true, name: true },
                  })}
                />
              </details>
              <GreenForm
                id={id}
                version={t.version}
                label="Удалить дерево"
                action="tree-delete"
              />
            </>
          )}
        </div>
        <div className="detail-side">
          <section className="panel form-card">
            <h2>Рекомендации по правилам</h2>
            {recommendations(t).length ? (
              recommendations(t).map((r) => (
                <div key={r.work}>
                  <p>{r.reason}</p>
                  {op && (
                    <Link
                      className="text-link"
                      href={plan + "&work=" + encodeURIComponent(r.work)}
                    >
                      Запланировать: {r.work}
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <p className="hint">Оснований для рекомендации нет.</p>
            )}
          </section>
          <ServiceHistory tasks={t.tasks} />
        </div>
      </div>
    </>
  );
}
