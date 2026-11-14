import { categories, labels } from "@/lib/workflow";
export function Filters({
  category,
  status,
  onCategory,
  onStatus,
}: {
  category: string;
  status: string;
  onCategory: (v: string) => void;
  onStatus: (v: string) => void;
}) {
  return (
    <div className="filters">
      <label>
        Категория
        <select value={category} onChange={(e) => onCategory(e.target.value)}>
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Статус
        <select value={status} onChange={(e) => onStatus(e.target.value)}>
          <option value="">Все статусы</option>
          {Object.entries(labels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
