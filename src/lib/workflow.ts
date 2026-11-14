import type { Report, Role, Status } from "@prisma/client";
export const categories = [
  "Засохшее дерево",
  "Повреждённое дерево",
  "Отсутствие полива",
  "Мусор на территории",
  "Повреждение зелёной зоны",
  "Другое",
];
export const labels: Record<Status, string> = {
  NEW: "Новое",
  IN_REVIEW: "На рассмотрении",
  ASSIGNED: "Назначено",
  IN_PROGRESS: "В работе",
  RESOLVED: "На проверке",
  CLOSED: "Закрыто",
  REJECTED: "Отклонено",
};
export const roles: Record<Role, string> = {
  RESIDENT: "Житель",
  OPERATOR: "Оператор",
  EXECUTOR: "Исполнитель",
};
export const actors = { RESIDENT: 1, OPERATOR: 2, EXECUTOR: 3 };
export type Row = Pick<
  Report,
  | "id"
  | "title"
  | "category"
  | "status"
  | "lat"
  | "lng"
  | "address"
  | "createdAt"
> & { task: { id: number; dueAt: Date; status: string } | null };
export const commands = {
  review: {
    role: "OPERATOR",
    from: ["NEW"],
    to: "IN_REVIEW",
    label: "Принять на рассмотрение",
  },
  clarify: {
    role: "OPERATOR",
    from: ["IN_REVIEW"],
    to: "NEW",
    label: "Запросить уточнение",
  },
  reply: {
    role: "RESIDENT",
    from: ["NEW"],
    to: "IN_REVIEW",
    label: "Отправить уточнение",
  },
  reject: {
    role: "OPERATOR",
    from: ["IN_REVIEW"],
    to: "REJECTED",
    label: "Отклонить обращение",
  },
  assign: {
    role: "OPERATOR",
    from: ["IN_REVIEW"],
    to: "ASSIGNED",
    label: "Создать задание",
  },
  start: {
    role: "EXECUTOR",
    from: ["ASSIGNED"],
    to: "IN_PROGRESS",
    label: "Начать выполнение",
  },
  finish: {
    role: "EXECUTOR",
    from: ["IN_PROGRESS"],
    to: "RESOLVED",
    label: "Передать на проверку",
  },
  redo: {
    role: "OPERATOR",
    from: ["RESOLVED"],
    to: "IN_PROGRESS",
    label: "Вернуть на доработку",
  },
  close: {
    role: "OPERATOR",
    from: ["RESOLVED"],
    to: "CLOSED",
    label: "Подтвердить и закрыть",
  },
} as const;
export type Command = keyof typeof commands;
export function allowed(
  action: Command,
  role: Role,
  status: Status,
  clarification: string | null,
) {
  const rule = commands[action];
  return (
    rule.role === role &&
    (rule.from as readonly Status[]).includes(status) &&
    (clarification ? action === "reply" : action !== "reply")
  );
}
export function date(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeZone: "Asia/Qyzylorda",
  }).format(value);
}
