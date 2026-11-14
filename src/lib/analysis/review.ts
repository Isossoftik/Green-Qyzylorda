import type { Role } from "@prisma/client";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db, uploads } from "../db";
import { InputError, field, savePhoto } from "../mutations";
import { actors } from "../workflow";
import { caseSelect, activeStatuses, matches, priority } from "./rules";
import { vision, photoLabels } from "./vision";
export async function review(data: FormData, role: Role) {
  if (role !== "OPERATOR")
    throw new InputError("Требуется роль оператора.", 403);
  const id = Number(data.get("id"));
  if (!Number.isSafeInteger(id) || id < 1)
    throw new InputError("Некорректный объект.");
  const action = data.get("action"),
    actorId = actors.OPERATOR;
  if (
    action === "attach-classify" ||
    action === "classify" ||
    action === "photo-review"
  ) {
    const tree = data.get("object") === "tree";
    let image = String(data.get("image"));
    if (action === "attach-classify") {
      if (tree || !(await db.report.count({ where: { id } })))
        throw new InputError("Обращение не найдено.", 404);
      const filename = await savePhoto(data.get("photo"), true);
      if (!filename) throw new InputError("Выберите фото.");
      try {
        await db.reportPhoto.create({
          data: { reportId: id, kind: "REPORT", filename },
        });
      } catch (e) {
        await unlink(path.join(uploads, filename));
        throw e;
      }
      image = filename;
    }
    if (!/^[0-9a-f-]{36}\.webp$/.test(image))
      throw new InputError("Некорректное фото.");
    const where = tree ? { treeId: id } : { reportId: id };
    async function exists() {
      return tree
        ? db.tree.count({ where: { id, photo: image } })
        : db.reportPhoto.count({ where: { reportId: id, filename: image } });
    }
    if (!(await exists()))
      throw new InputError("Фотография изменена или отсутствует.", 409);
    let value: string, explanation: string, next: string, source: string;
    if (action !== "photo-review") {
      try {
        const result = await vision.analyze(path.join(uploads, image));
        value = result.category;
        explanation = result.explanation;
        next = result.action;
        source = result.source;
      } catch (e) {
        if (
          e instanceof Error &&
          [
            "Модель занята. Повторите после завершения анализа.",
            "Истекло время обработки.",
            "Файл не удалось прочитать.",
          ].includes(e.message)
        )
          throw new InputError(e.message, 503);
        throw new InputError(
          "Локальный AI недоступен. Фото сохранено, доступна ручная оценка.",
          503,
        );
      }
    } else {
      value = field(data, "category", 1, 80, "Категория");
      if (!photoLabels.includes(value))
        throw new InputError("Неизвестная категория.");
      explanation = field(data, "reason", 3, 1000, "Обоснование");
      next = field(data, "next", 3, 400, "Предлагаемое действие");
      source = "Оператор";
    }
    await db.$transaction(async (tx) => {
      if (
        !(tree
          ? await tx.tree.count({ where: { id, photo: image } })
          : await tx.reportPhoto.count({
              where: { reportId: id, filename: image },
            }))
      )
        throw new InputError("Фотография изменилась.", 409);
      await tx.reviewDecision.create({
        data: {
          ...where,
          kind: "PHOTO",
          image,
          actorId,
          value,
          explanation,
          action: next,
          source,
        },
      });
    });
    return {
      href:
        data.get("workspace") === "1"
          ? "/ai-workspace?" + (tree ? "tree=" : "report=") + id
          : (tree ? "/green-fund/trees/" : "/reports/") + id,
    };
  }
  return db.$transaction(async (tx) => {
    const row = await tx.report.findUnique({
      where: { id },
      select: { ...caseSelect, status: true },
    });
    if (!row || !activeStatuses.includes(row.status))
      throw new InputError("Обращение вне активной очереди.", 409);
    const others = await tx.report.findMany({ select: caseSelect });
    let value: string,
      explanation: string,
      candidateId: number | null = null;
    if (action === "priority") {
      const score = priority(row, others);
      if (data.get("expected") !== score.level)
        throw new InputError("Приоритет изменился. Обновите очередь.", 409);
      value = score.level;
      explanation = score.reasons
        .map((r) => r.label + " (+" + r.points + ")")
        .join(" · ");
    } else if (action === "duplicate") {
      candidateId = Number(data.get("candidateId"));
      const hit = matches(row, others).find((m) => m.id === candidateId);
      if (!hit) throw new InputError("Совпадение не найдено.", 409);
      value = String(data.get("verdict"));
      if (
        !["Возможный повтор подтверждён", "Совпадение отклонено"].includes(
          value,
        )
      )
        throw new InputError("Некорректное решение.");
      explanation =
        "№" +
        candidateId +
        " · " +
        hit.distance +
        " м · " +
        hit.days +
        " дн. · совпадение слов " +
        hit.similarity +
        "%";
    } else throw new InputError("Неизвестное действие.");
    await tx.reviewDecision.create({
      data: {
        reportId: id,
        actorId,
        kind: action === "priority" ? "PRIORITY" : "DUPLICATE",
        candidateId,
        value,
        explanation,
        source: "Оператор",
      },
    });
    return { href: "/ai-workspace?report=" + id };
  });
}
