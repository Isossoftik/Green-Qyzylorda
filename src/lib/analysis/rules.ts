const DAY = 86400000;
type Location = { lat: number; lng: number };
export type Case = Location & {
  id: number;
  category: string;
  description: string;
  createdAt: Date;
  tree?: { condition: string; zoneId: number | null } | null;
  task?: { status: string; dueAt: Date } | null;
};
export const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
function metres(a: Location, b: Location) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((a.lat - b.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((a.lng - b.lng) * rad) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function words(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replaceAll("ё", "е")
      .match(/[\p{L}\p{N}]{3,}/gu) ?? [],
  );
}
export function matches(row: Case, others: Case[]) {
  const a = words(row.description);
  return others
    .flatMap((other) => {
      const elapsed = Math.abs(+row.createdAt - +other.createdAt);
      if (
        other.id === row.id ||
        row.category !== other.category ||
        elapsed > 30 * DAY
      )
        return [];
      const distance = metres(row, other);
      if (distance > 200) return [];
      const b = words(other.description);
      const common = [...a].filter((w) => b.has(w)).length;
      const similarity = common / Math.max(1, a.size + b.size - common);
      return similarity >= 0.35
        ? [
            {
              id: other.id,
              distance: Math.round(distance),
              days: Math.floor(elapsed / DAY),
              similarity: Math.round(similarity * 100),
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        b.similarity - a.similarity || a.distance - b.distance || a.id - b.id,
    );
}
export function priority(row: Case, others: Case[], now = Date.now()) {
  const reasons: { label: string; points: number }[] = [];
  const age = Math.max(0, Math.floor((now - +row.createdAt) / DAY));
  const nearby = others.filter(
    (o) =>
      o.id !== row.id &&
      o.category === row.category &&
      +o.createdAt >= now - 30 * DAY &&
      ((row.tree?.zoneId != null && row.tree.zoneId === o.tree?.zoneId) ||
        metres(row, o) <= 200),
  ).length;
  const category =
    row.category === "Повреждённое дерево"
      ? 3
      : row.category === "Засохшее дерево"
        ? 2
        : row.category === "Другое"
          ? 0
          : 1;
  reasons.push(
    { label: row.category, points: category },
    {
      label: "С регистрации: " + age + " дн.",
      points: age >= 7 ? 3 : age >= 2 ? 1 : 0,
    },
    {
      label:
        "Других обращений той же категории за 30 дней в пределах 200 м или на той же территории: " +
        nearby,
      points: Math.min(nearby, 2),
    },
    {
      label: row.tree
        ? "Связанное дерево: " + row.tree.condition
        : "Связанное дерево не указано",
      points:
        row.tree && ["Повреждено", "Засохло"].includes(row.tree.condition)
          ? 3
          : row.tree?.condition === "Требует ухода"
            ? 1
            : 0,
    },
  );
  const late =
    !!row.task &&
    ["ASSIGNED", "IN_PROGRESS"].includes(row.task.status) &&
    +row.task.dueAt < now;
  reasons.push({
    label: late ? "Задание просрочено" : "Просроченного задания нет",
    points: late ? 3 : 0,
  });
  const score = reasons.reduce((n, r) => n + r.points, 0);
  return {
    score,
    level: priorities[score >= 9 ? 3 : score >= 6 ? 2 : score >= 3 ? 1 : 0],
    reasons,
  };
}
export const activeStatuses = [
  "NEW",
  "IN_REVIEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
];
export const caseSelect = {
  id: true,
  category: true,
  description: true,
  lat: true,
  lng: true,
  createdAt: true,
  tree: { select: { condition: true, zoneId: true } },
  task: { select: { status: true, dueAt: true } },
} as const;
