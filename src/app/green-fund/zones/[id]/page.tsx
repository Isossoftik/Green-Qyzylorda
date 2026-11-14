import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { demoRole } from "@/lib/role";
import { fund } from "@/lib/green";
import { FundHeading } from "@/components/fund-shell";
import { ServiceHistory, historyInclude } from "@/components/service-history";
import Link from "next/link";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const z = await db.zone.findUnique({
    where: { id },
    include: { crew: true, trees: true, tasks: { include: historyInclude } },
  });
  if (!z) notFound();
  return (
    <>
      <FundHeading
        title={z.name}
        desc={z.kind + " · " + z.address}
        active="zones"
      />
      <div className="detail-grid">
        <section className="panel form-card">
          <h2>Паспорт территории</h2>
          <dl>
            {[
              ["Координаты", z.lat + ", " + z.lng],
              ["Площадь", z.area === null ? "Не указана" : z.area + " га"],
              ["Ответственная бригада", z.crew.name],
              ["Состояние", z.condition],
              ["Зарегистрировано деревьев", z.trees.length],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {z.trees.map((t) => (
            <Link
              className="text-link"
              key={t.id}
              href={fund + "/trees/" + t.id}
            >
              {t.species} №{t.id}
            </Link>
          ))}
          {(await demoRole()) === "OPERATOR" && (
            <Link
              className="primary"
              href={fund + "/new/work?target=zone:" + id}
            >
              Запланировать работу
            </Link>
          )}
        </section>
        <ServiceHistory tasks={z.tasks} />
      </div>
    </>
  );
}
