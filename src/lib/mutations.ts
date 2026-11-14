import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Role } from "@prisma/client";
import { db, uploads } from "./db";
import {
  actors,
  categories,
  commands,
  allowed,
  type Command,
} from "./workflow";
import { caseSelect, matches } from "./analysis/rules";
import bounds from "../../public/map-bounds.json";
export class InputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
export function field(
  data: FormData,
  key: string,
  min: number,
  max: number,
  label: string,
) {
  const raw = data.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length < min || value.length > max)
    throw new InputError(label + ": от " + min + " до " + max + " символов.");
  return value;
}
export function coordinate(data: FormData, key: string, index: number) {
  const raw = data.get(key),
    n = Number(raw);
  if (
    typeof raw !== "string" ||
    !raw.trim() ||
    !Number.isFinite(n) ||
    n < bounds[0][index] ||
    n > bounds[1][index]
  )
    throw new InputError("Выберите точку в пределах карты Кызылорды.");
  return n;
}
export async function savePhoto(
  value: FormDataEntryValue | null,
  required: boolean,
) {
  if (!value || (value instanceof File && !value.size)) {
    if (required) throw new InputError("Приложите фотографию результата.");
    return null;
  }
  if (!(value instanceof File) || value.size > 5 * 1024 * 1024)
    throw new InputError("Файл должен быть не больше 5 МБ.");
  const mime: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/webp": "webp",
  };
  if (!Object.hasOwn(mime, value.type))
    throw new InputError("Допустимы JPEG, PNG и WebP.");
  let image: Buffer;
  try {
    const source = sharp(Buffer.from(await value.arrayBuffer()), {
      limitInputPixels: 25000000,
      failOn: "warning",
    });
    if ((await source.metadata()).format !== mime[value.type]) throw Error();
    image = await source
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new InputError(
      "Содержимое файла не соответствует допустимой фотографии.",
    );
  }
  const filename = randomUUID() + ".webp";
  await mkdir(uploads, { recursive: true });
  const pending = path.join(uploads, filename + ".part");
  try {
    await writeFile(pending, image, { flag: "wx" });
    await rename(pending, path.join(uploads, filename));
  } catch (error) {
    await unlink(pending).catch(() => {});
    throw error;
  }
  return filename;
}
export async function mutate(data: FormData, role: Role) {
  const action = data.get("action");
  const actorId = actors[role];
  if (action === "create") {
    if (role === "EXECUTOR")
      throw new InputError("Регистрация доступна жителю и оператору.", 403);
    const category = field(data, "category", 1, 60, "Категория");
    if (!categories.includes(category))
      throw new InputError("Неизвестная категория.");
    const title = field(data, "title", 3, 140, "Заголовок"),
      description = field(data, "description", 10, 2500, "Описание"),
      address = field(data, "address", 3, 240, "Адрес"),
      contact = field(data, "contact", 5, 160, "Контакт");
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) &&
      !(
        /^\+?[\d\s()-]{7,25}$/.test(contact) &&
        contact.replace(/\D/g, "").length >= 7
      )
    )
      throw new InputError("Укажите телефон или электронную почту.");
    const lat = coordinate(data, "lat", 0),
      lng = coordinate(data, "lng", 1);
    const filename = await savePhoto(data.get("photo"), false);
    try {
      return await db.$transaction(async (tx) => {
        const treeId = data.get("treeId") ? Number(data.get("treeId")) : null;
        if (
          treeId !== null &&
          (!Number.isSafeInteger(treeId) ||
            !(await tx.tree.count({ where: { id: treeId } })))
        )
          throw new InputError("Дерево не найдено.");
        const report = await tx.report.create({
          data: {
            category,
            title,
            description,
            address,
            contact,
            lat,
            lng,
            treeId,
            authorId: actors.RESIDENT,
            history: {
              create: {
                actorId,
                toStatus: "NEW",
                message: "Обращение зарегистрировано",
              },
            },
            ...(filename
              ? { photos: { create: { filename, kind: "REPORT" } } }
              : {}),
          },
          select: caseSelect,
        });
        const peers = await tx.report.findMany({
          where: {
            category,
            createdAt: { gte: new Date(+report.createdAt - 30 * 86400000) },
          },
          select: caseSelect,
        });
        const candidates = matches(report, peers);
        return {
          id: report.id,
          ...(role === "OPERATOR" ? { candidates } : {}),
        };
      });
    } catch (e) {
      if (filename) await unlink(path.join(uploads, filename));
      throw e;
    }
  }
  if (typeof action !== "string" || !Object.hasOwn(commands, action))
    throw new InputError("Неизвестное действие.");
  const command = action as Command,
    rule = commands[command];
  if (rule.role !== role)
    throw new InputError("Это действие недоступно выбранной демороли.", 403);
  const id = Number(data.get("id")),
    version = Number(data.get("version"));
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !data.has("version") ||
    !Number.isSafeInteger(version) ||
    version < 0
  )
    throw new InputError("Некорректный идентификатор или версия.");
  const note = ["clarify", "reply", "reject", "redo", "finish"].includes(
    command,
  )
    ? field(data, "comment", 3, 2000, "Комментарий")
    : "";
  const filename =
    command === "finish" ? await savePhoto(data.get("photo"), true) : null;
  try {
    return await db.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id },
        include: { task: true },
      });
      if (!report) throw new InputError("Обращение не найдено.", 404);
      if (
        version !== report.version ||
        !allowed(command, role, report.status, report.clarification)
      )
        throw new InputError(
          "Действие недоступно для текущего статуса. Обновите карточку.",
          409,
        );
      if (
        (role === "EXECUTOR" && report.task?.assigneeId !== actorId) ||
        (command === "reply" && report.authorId !== actorId)
      )
        throw new InputError("Действие недоступно этому участнику.", 403);
      let message: string = rule.label;
      if (command === "assign") {
        const assigneeId = Number(data.get("assigneeId")),
          day = String(data.get("due") ?? "");
        const dueAt = new Date(day + "T23:59:59.999+05:00");
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
          !Number.isFinite(+dueAt) ||
          dueAt.toISOString().slice(0, 10) !== day ||
          +dueAt < Date.now()
        )
          throw new InputError(
            "Выберите действительный срок, начиная с сегодняшнего дня.",
          );
        const user = Number.isSafeInteger(assigneeId)
          ? await tx.user.findFirst({
              where: { id: assigneeId, role: "EXECUTOR" },
            })
          : null;
        if (!user) throw new InputError("Выберите исполнителя.");
        await tx.task.create({ data: { reportId: id, assigneeId, dueAt } });
        message = "Назначено: " + user.name + " · срок " + day;
      } else if (["start", "finish", "redo", "close"].includes(command)) {
        await tx.task.update({
          where: { reportId: id },
          data: {
            status: rule.to as "IN_PROGRESS" | "RESOLVED" | "CLOSED",
            ...(command === "finish" ? { comment: note } : {}),
          },
        });
      }
      const changed = await tx.report.updateMany({
        where: { id, version },
        data: {
          status: rule.to,
          version: { increment: 1 },
          clarification: command === "clarify" ? note : null,
        },
      });
      if (!changed.count)
        throw new InputError("Карточка уже изменена. Обновите страницу.", 409);
      if (filename)
        await tx.reportPhoto.create({
          data: { reportId: id, filename, kind: "RESULT" },
        });
      await tx.statusHistory.create({
        data: {
          reportId: id,
          actorId,
          fromStatus: report.status,
          toStatus: rule.to,
          message: message + (note ? " · " + note : ""),
        },
      });
      return { id };
    });
  } catch (e) {
    if (filename) await unlink(path.join(uploads, filename));
    throw e;
  }
}
