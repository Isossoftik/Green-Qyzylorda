export const conditions = [
  "Здоровое",
  "Требует ухода",
  "Повреждено",
  "Засохло",
];
export const zoneConditions = ["Хорошее", "Требует ухода", "Повреждено"];
export const zoneTypes = [
  "Парк",
  "Сквер",
  "Аллея",
  "Дворовая территория",
  "Другая зелёная зона",
];
export const works = [
  "Полив",
  "Уборка",
  "Обрезка",
  "Осмотр",
  "Лечение",
  "Посадка деревьев",
];
export const fund = "/green-fund";
export const dayKey = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
export function overdue(
  task: { status: string; dueAt: Date },
  now = Date.now(),
) {
  return ["ASSIGNED", "IN_PROGRESS"].includes(task.status) && +task.dueAt < now;
}
export function recommendations(
  tree: { condition: string; inspected: Date | null },
  now = Date.now(),
) {
  const result: { reason: string; work: string }[] = [];
  if (!tree.inspected || now - +tree.inspected > 90 * 86400000)
    result.push({
      reason: tree.inspected
        ? "Прошло более 90 дней с последнего осмотра."
        : "Дата осмотра не указана.",
      work: "Осмотр",
    });
  if (tree.condition === "Требует ухода" || tree.condition === "Повреждено")
    result.push({
      reason:
        "Состояние дерева — «" +
        tree.condition +
        "». Требуется оценка специалиста.",
      work: "Лечение",
    });
  return result;
}
export type GreenPin = {
  name: string;
  lat: number;
  lng: number;
  kind: "green" | "tree" | "task";
  detail: string;
  href: string;
  condition?: string;
};
