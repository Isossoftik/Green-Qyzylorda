import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { priority, matches } from "../src/lib/analysis/rules.ts";
export async function analysisCycle({ base, db, photo }) {
  const now = Date.now(),
    day = 86400000;
  const row = {
    id: 1,
    category: "Другое",
    description: "Мусор возле входа на аллею",
    lat: 44.844,
    lng: 65.49,
    createdAt: new Date(now),
  };
  assert.equal(priority(row, [], now).level, "LOW");
  const damage = { ...row, category: "Повреждённое дерево" };
  assert.equal(priority(damage, [], now).level, "MEDIUM");
  const old = { ...damage, createdAt: new Date(now - 8 * day) };
  assert.equal(priority(old, [], now).level, "HIGH");
  const severe = {
    ...old,
    tree: { zoneId: 1, condition: "Повреждено" },
    task: { dueAt: new Date(now - day), status: "ASSIGNED" },
  };
  const score = priority(severe, [{ ...old, id: 2 }], now);
  assert.equal(score.level, "CRITICAL");
  assert.deepEqual(
    score.reasons.map((r) => r.points),
    [3, 3, 1, 3, 3],
  );
  const near = { ...row, id: 2, lat: 44.8441 };
  assert.equal(matches(row, [near]).length, 1);
  for (const peer of [
    { ...near, lat: 45 },
    { ...near, category: "Мусор" },
    { ...near, description: "Свежие саженцы требуют полива" },
    { ...near, createdAt: new Date(now - 31 * day) },
    row,
  ])
    assert.equal(matches(row, [peer]).length, 0);
  async function post(api, role, action, fields, status = 200) {
    const body = new FormData();
    body.set("action", action);
    for (const [k, v] of Object.entries(fields))
      body.set(k, v instanceof File ? v : String(v));
    const res = await fetch(base + "/api/" + api, {
      method: "POST",
      headers: { Cookie: "demo-role=" + role, Origin: base },
      body,
    });
    const result = await res.json();
    assert.equal(res.status, status, JSON.stringify(result));
    return result;
  }
  const tree = await db.tree.findFirstOrThrow({
    where: { condition: "Повреждено" },
  });
  const input = {
    category: damage.category,
    title: "Контрольный осмотр",
    description: "Надлом ствола возле подъезда " + randomUUID(),
    lat: 44.878,
    lng: 65.58,
    address: "Учебный участок",
    treeId: tree.id,
    contact: "demo@example.test",
    photo,
  };
  const first = await post("workflow", "RESIDENT", "create", input),
    second = await post("workflow", "OPERATOR", "create", input);
  assert.ok(second.candidates.some((m) => m.id === first.id));
  const id = second.id;
  const page = await (
    await fetch(base + "/ai-workspace?report=" + id, {
      headers: { Cookie: "demo-role=OPERATOR" },
    })
  ).text();
  assert.ok(page.includes("AI не настроен"));
  assert.ok(page.includes("Связанное дерево"));
  assert.ok(page.includes("Rule-based scoring"));
  const expected = page.match(
    /name="expected" value="(LOW|MEDIUM|HIGH|CRITICAL)"/,
  )?.[1];
  assert.ok(expected);
  await post("analysis", "RESIDENT", "priority", { id, expected }, 403);
  await post("analysis", "OPERATOR", "priority", { id, expected });
  await post("analysis", "OPERATOR", "duplicate", {
    id,
    candidateId: first.id,
    verdict: "Возможный повтор подтверждён",
  });
  const img = await db.reportPhoto.findFirstOrThrow({
    where: { reportId: id },
  });
  const args = { id, object: "report", image: img.filename };
  const failed = await post("analysis", "OPERATOR", "classify", args, 503);
  assert.equal(failed.confidence, undefined);
  assert.equal(
    await db.reviewDecision.count({ where: { reportId: id, kind: "PHOTO" } }),
    0,
  );
  await post("analysis", "OPERATOR", "photo-review", {
    ...args,
    category: "Повреждение дерева",
    reason: "Оператор проверил ствол",
    next: "Назначить осмотр",
  });
  assert.equal(
    (await db.report.findUniqueOrThrow({ where: { id } })).status,
    "NEW",
  );
  assert.equal(await db.reviewDecision.count({ where: { reportId: id } }), 3);
  const start = new Date(now + day).toISOString().slice(0, 10),
    end = new Date(now + 15 * day).toISOString().slice(0, 10);
  const schedule = {
    requestKey: randomUUID(),
    target: "tree:" + tree.id,
    workType: "Полив",
    assigneeId: 3,
    scheduled: start,
    due: end,
    intervalDays: 7,
  };
  await post("green", "RESIDENT", "schedule", schedule, 403);
  const series = await post("green", "OPERATOR", "schedule", schedule);
  await post("green", "OPERATOR", "schedule", schedule);
  await post("green", "OPERATOR", "regenerate", { id: series.id });
  const entries = await db.occurrence.findMany({
    where: { scheduleId: series.id },
    include: { task: true },
    orderBy: { day: "asc" },
  });
  assert.equal(entries.length, 3);
  assert.equal(entries[0].day, start);
  assert.equal(entries[2].day, end);
  const task = entries[0].taskId;
  await post("green", "EXECUTOR", "begin", { id: task });
  await post("green", "EXECUTOR", "submit", {
    id: task,
    comment: "Работы выполнены",
    photo,
  });
  await post("green", "OPERATOR", "approve", { id: task });
  await post("green", "OPERATOR", "regenerate", { id: series.id });
  assert.equal(
    (await db.task.findUniqueOrThrow({ where: { id: task } })).status,
    "CLOSED",
  );
}
