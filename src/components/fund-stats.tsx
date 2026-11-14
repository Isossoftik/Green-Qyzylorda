import { fundStats } from "@/lib/fund-data";
import { conditions } from "@/lib/green";
export async function FundStats() {
  const s = await fundStats();
  return (
    <section className="panel form-card fund-stats">
      <h2>Зелёный фонд · за всё время</h2>
      <dl className="stat-grid">
        {[
          ["Деревья", s.total],
          ["Территории", s.zones],
          ["Запланировано", s.planned],
          ["Подтверждено", s.done],
          ["Просрочено", s.late],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd data-stat={label}>{value}</dd>
          </div>
        ))}
      </dl>
      <h2>Состояние деревьев</h2>
      {conditions.map((c) => (
        <div className="bar-row" key={c}>
          <span>{c}</span>
          <b>{s.trees.filter((t) => t.condition === c).length}</b>
          <progress
            value={s.trees.filter((t) => t.condition === c).length}
            max={s.total || 1}
          />
        </div>
      ))}
    </section>
  );
}
