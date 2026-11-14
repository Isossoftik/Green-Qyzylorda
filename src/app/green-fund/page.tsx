import Link from "next/link";
import { db } from "@/lib/db";
import { demoRole } from "@/lib/role";
import { conditions, fund } from "@/lib/green";
import { FundHeading } from "@/components/fund-shell";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; condition?: string; zone?: string }>;
}) {
  const { q = "", condition = "", zone = "" } = await searchParams;
  const [all, zones, role] = await Promise.all([
    db.tree.findMany({ include: { zone: true }, orderBy: { id: "desc" } }),
    db.zone.findMany(),
    demoRole(),
  ]);
  const trees = all.filter(
    (t) =>
      (!condition || t.condition === condition) &&
      (!zone || String(t.zoneId) === zone) &&
      [t.species, t.address, t.zone?.name ?? "", String(t.id)].some((v) =>
        v.toLocaleLowerCase("ru").includes(q.trim().toLocaleLowerCase("ru")),
      ),
  );
  return (
    <>
      <FundHeading
        active="trees"
        title="Зелёный фонд"
        desc="Инвентаризация деревьев и обслуживание городских территорий."
      />
      <div className="inventory-summary">
        <span>
          <b>{all.length}</b> деревьев
        </span>
        <span>
          <b>{zones.length}</b> территории
        </span>
        <span>
          <b>{all.filter((t) => t.condition === "Требует ухода").length}</b>{" "}
          требуют ухода
        </span>
      </div>
      <section className="panel table-panel">
        <div className="panel-head">
          <h2>Реестр деревьев · {trees.length}</h2>
          {role === "OPERATOR" && (
            <Link className="primary" href={fund + "/new/tree"}>
              Добавить дерево
            </Link>
          )}
        </div>
        <form className="filters fund-search">
          <label>
            Поиск
            <input
              name="q"
              defaultValue={q}
              placeholder="Порода, адрес или номер"
            />
          </label>
          <label>
            Состояние
            <select name="condition" defaultValue={condition}>
              <option value="">Все состояния</option>
              {conditions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Территория
            <select name="zone" defaultValue={zone}>
              <option value="">Все территории</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button">Найти</button>
        </form>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Дерево",
                  "Состояние",
                  "Расположение",
                  "Последний осмотр",
                ].map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trees.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link className="text-link" href={fund + "/trees/" + t.id}>
                      {t.species} · №{t.id}
                    </Link>
                    {t.seedKey && <small>DEMO</small>}
                  </td>
                  <td>
                    <span className="condition" data-condition={t.condition}>
                      {t.condition}
                    </span>
                  </td>
                  <td>{t.zone?.name || t.address}</td>
                  <td>
                    {t.inspected?.toLocaleDateString("ru-RU", {
                      timeZone: "Asia/Qyzylorda",
                    }) ?? "Не указан"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!trees.length && (
          <p className="empty">Деревьев по этим условиям нет.</p>
        )}
      </section>
    </>
  );
}
