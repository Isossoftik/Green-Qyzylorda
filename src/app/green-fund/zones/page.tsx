import Link from "next/link";
import { db } from "@/lib/db";
import { demoRole } from "@/lib/role";
import { fund } from "@/lib/green";
import { FundHeading } from "@/components/fund-shell";
export default async function Page() {
  const zones = await db.zone.findMany({
    include: { crew: true, _count: { select: { trees: true } } },
  });
  return (
    <>
      <FundHeading
        active="zones"
        title="Зелёные территории"
        desc="Парки, скверы и участки, закреплённые за бригадами."
      />
      <section className="panel">
        <div className="panel-head">
          <h2>Территории · {zones.length}</h2>
          {(await demoRole()) === "OPERATOR" && (
            <Link className="primary" href={fund + "/new/zone"}>
              Добавить территорию
            </Link>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["Название", "Тип", "Деревья", "Бригада", "Состояние"].map(
                  (s) => (
                    <th key={s}>{s}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id}>
                  <td>
                    <Link className="text-link" href={fund + "/zones/" + z.id}>
                      {z.name}
                    </Link>
                  </td>
                  <td>{z.kind}</td>
                  <td>{z._count.trees}</td>
                  <td>{z.crew.name}</td>
                  <td>{z.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!zones.length && (
          <p className="empty">Территории ещё не зарегистрированы.</p>
        )}
      </section>
    </>
  );
}
