import { generate } from "./analysis/recurrence";
import { Prisma, type Role } from "@prisma/client";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db, uploads } from "./db";
import { InputError, field, coordinate, savePhoto } from "./mutations";
import { actors, allowed, commands } from "./workflow";
import { conditions, zoneConditions, zoneTypes, works, dayKey } from "./green";
function choice(data: FormData, key: string, values: string[]) {
  const value = field(data, key, 1, 100, key);
  if (!values.includes(value))
    throw new InputError("Недопустимое значение: " + key);
  return value;
}
function integer(data: FormData, key: string, min = 1) {
  const raw = data.get(key);
  const n = Number(raw);
  if (
    typeof raw !== "string" ||
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(n) ||
    n < min
  )
    throw new InputError("Некорректное значение: " + key);
  return n;
}
function day(data: FormData, key: string, required = false) {
  const value = data.get(key);
  if (!value && !required) return null;
  const d = new Date(value + "T12:00:00+05:00");
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(+d) ||
    dayKey(d) !== value
  )
    throw new InputError("Некорректная дата.");
  return d;
}
export async function greenMutation(data: FormData, role: Role) {
  const action = data.get("action");
  const worker = action === "begin" || action === "submit";
  if (role !== (worker ? "EXECUTOR" : "OPERATOR"))
    throw new InputError("Действие недоступно выбранной роли.", 403);
  const actorId = actors[role];
  let filename: string | null = null,
    obsolete: string | null = null;
  if (action === "tree-create" || action === "tree-edit" || action === "submit")
    filename = await savePhoto(data.get("photo"), action === "submit");
  let result: { id: number; href: string };
  try {
    result = await db.$transaction(async (tx) => {
      if (action === "tree-create" || action === "tree-edit") {
        const species = field(data, "species", 2, 100, "Порода"),
          address = field(data, "address", 0, 220, "Адрес"),
          comment = field(data, "comment", 0, 2000, "Комментарий");
        const zoneId = data.get("zoneId") ? integer(data, "zoneId") : null;
        if (!address && !zoneId)
          throw new InputError("Укажите адрес или территорию.");
        if (zoneId && !(await tx.zone.count({ where: { id: zoneId } })))
          throw new InputError("Территория не найдена.");
        const planted = day(data, "planted"),
          inspected = day(data, "inspected"),
          today = dayKey(new Date());
        if (
          [planted, inspected].some((v) => v && dayKey(v) > today) ||
          (planted && inspected && planted > inspected)
        )
          throw new InputError("Проверьте даты посадки и осмотра.");
        const values = {
          species,
          lat: coordinate(data, "lat", 0),
          lng: coordinate(data, "lng", 1),
          address,
          zoneId,
          comment,
          planted,
          inspected,
          condition: choice(data, "condition", conditions),
          ...(filename ? { photo: filename } : {}),
        };
        let id: number;
        if (action === "tree-edit") {
          id = integer(data, "id");
          const old = await tx.tree.findUniqueOrThrow({ where: { id } });
          if (filename && old.photo && !(await tx.reviewDecision.count({
            where: { treeId: id, image: old.photo },
          }))) obsolete = old.photo;
          await tx.tree.update({
            where: { id, version: integer(data, "version", 0) },
            data: { ...values, version: { increment: 1 } },
          });
        } else {
          id = (await tx.tree.create({ data: values })).id;
        }
        return { id, href: "/green-fund/trees/" + id };
      }
      if (action === "tree-delete") {
        const id = integer(data, "id");
        if (await tx.task.count({ where: { treeId: id } }))
          throw new InputError(
            "Дерево связано с заданиями. История обслуживания должна сохраниться.",
            409,
          );
        obsolete = (
          await tx.tree.delete({
            where: { id, version: integer(data, "version", 0) },
          })
        ).photo;
        return { id, href: "/green-fund" };
      }
      if (action === "zone-create") {
        const crewId = integer(data, "crewId");
        if (!(await tx.user.count({ where: { id: crewId, role: "EXECUTOR" } })))
          throw new InputError("Выберите ответственную бригаду.");
        const area = data.get("area") ? Number(data.get("area")) : null;
        if (area !== null && (!Number.isFinite(area) || area <= 0))
          throw new InputError("Площадь должна быть положительной.");
        const zone = await tx.zone.create({
          data: {
            name: field(data, "name", 2, 140, "Название"),
            kind: choice(data, "kind", zoneTypes),
            condition: choice(data, "condition", zoneConditions),
            address: field(data, "address", 2, 220, "Расположение"),
            lat: coordinate(data, "lat", 0),
            lng: coordinate(data, "lng", 1),
            area,
            crewId,
          },
        });
        return { id: zone.id, href: "/green-fund/zones/" + zone.id };
      }
      if (action === "regenerate") {
        const schedule = await tx.careSchedule.findUniqueOrThrow({
          where: { id: integer(data, "id") },
        });
        const count = await generate(tx, schedule, actorId);
        return { id: schedule.id, href: "/green-fund/schedules", count };
      }
      if (action === "plan" || action === "schedule") {
        const target = String(data.get("target") ?? "").match(
          /^(tree|zone):([1-9]\d*)$/,
        );
        if (!target) throw new InputError("Выберите объект обслуживания.");
        const key = Number(target[2]);
        if (
          !Number.isSafeInteger(key) ||
          !(target[1] === "tree"
            ? await tx.tree.count({ where: { id: key } })
            : await tx.zone.count({ where: { id: key } }))
        )
          throw new InputError("Объект не найден.");
        const assigneeId = integer(data, "assigneeId");
        if (
          !(await tx.user.count({
            where: { id: assigneeId, role: "EXECUTOR" },
          }))
        )
          throw new InputError("Исполнитель не найден.");
        const scheduledAt = day(data, "scheduled", true)!,
          due = day(data, "due", true)!;
        if (due < scheduledAt || dayKey(scheduledAt) < dayKey(new Date()))
          throw new InputError("Проверьте дату начала и срок выполнения.");
        if (action === "schedule") {
          const intervalDays = integer(data, "intervalDays");
          if (
            intervalDays > 365 ||
            +due - +scheduledAt > 365 * 86400000 ||
            Math.floor((+due - +scheduledAt) / (intervalDays * 86400000)) + 1 >
              90
          )
            throw new InputError("Допустимо до 90 работ и до года на график.");
          const requestKey = String(data.get("requestKey"));
          if (!/^[0-9a-f-]{36}$/.test(requestKey))
            throw new InputError("Обновите форму графика.");
          const workType = choice(data, "workType", [
            "Полив",
            "Осмотр",
            "Уборка",
          ]);
          const schedule = await tx.careSchedule.upsert({
            where: { requestKey },
            update: {},
            create: {
              requestKey,
              workType,
              ...(target[1] === "tree" ? { treeId: key } : { zoneId: key }),
              assigneeId,
              startDay: dayKey(scheduledAt),
              endDay: dayKey(due),
              intervalDays,
            },
          });
          await generate(tx, schedule, actorId);
          return { id: schedule.id, href: "/green-fund/schedules" };
        }
        const task = await tx.task.create({
          data: {
            ...(target[1] === "tree" ? { treeId: key } : { zoneId: key }),
            workType: choice(data, "workType", works),
            scheduledAt,
            dueAt: new Date(dayKey(due) + "T23:59:59.999+05:00"),
            assigneeId,
            events: {
              create: {
                actorId,
                status: "ASSIGNED",
                message: "Работа запланирована",
              },
            },
          },
        });
        return { id: task.id, href: "/green-fund/work/" + task.id };
      }
      const command =
        action === "begin"
          ? "start"
          : action === "submit"
            ? "finish"
            : action === "approve"
              ? "close"
              : null;
      if (!command) throw new InputError("Неизвестное действие.");
      const id = integer(data, "id");
      const task = await tx.task.findFirstOrThrow({
        where: { id, reportId: null },
      });
      if (worker && task.assigneeId !== actorId)
        throw new InputError("Задание назначено другой бригаде.", 403);
      if (!allowed(command, role, task.status, null))
        throw new InputError("Переход из текущего статуса невозможен.", 409);
      const status = commands[command].to;
      const message =
        command === "finish"
          ? field(data, "comment", 3, 2000, "Результат")
          : commands[command].label;
      await tx.task.update({
        where: { id, status: task.status },
        data: { status, ...(command === "finish" ? { comment: message } : {}) },
      });
      await tx.serviceEvent.create({
        data: { taskId: id, actorId, status, message, photo: filename },
      });
      if (command === "close" && task.treeId && task.workType === "Осмотр") {
        const inspected = (
          await tx.serviceEvent.findFirstOrThrow({
            where: { taskId: id, status: "RESOLVED" },
            orderBy: { id: "desc" },
          })
        ).createdAt;
        await tx.tree.updateMany({
          where: {
            id: task.treeId,
            OR: [{ inspected: null }, { inspected: { lt: inspected } }],
          },
          data: { inspected, version: { increment: 1 } },
        });
      }
      return { id, href: "/green-fund/work/" + id };
    });
  } catch (e) {
    if (filename) await unlink(path.join(uploads, filename));
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2025", "P2003"].includes(e.code)
    )
      throw new InputError(
        "Объект изменён, удалён или связан с историей. Обновите страницу.",
        409,
      );
    throw e;
  }
  if (obsolete && /^[0-9a-f-]{36}\.webp$/.test(obsolete)) await unlink(path.join(uploads, obsolete)).catch(console.error);
  return result;
}
