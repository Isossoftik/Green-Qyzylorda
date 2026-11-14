import assert from "node:assert/strict";
export async function greenCycle({ base, db, photo }) {
  const suffix = Date.now();
  async function submit(role, action, fields, expected = 200) {
    const body = new FormData();
    body.set("action", action);
    for (const [k, v] of Object.entries(fields))
      body.set(k, v instanceof File ? v : String(v));
    const r = await fetch(base + "/api/green", {
      method: "POST",
      headers: { Origin: base, Cookie: "demo-role=" + role },
      body,
    });
    const json = await r.json();
    assert.equal(r.status, expected, action + ": " + JSON.stringify(json));
    return json.id;
  }
  const op = (action, d, status) => submit("OPERATOR", action, d, status);
  const worker = (action, d, status) => submit("EXECUTOR", action, d, status);
  const geo = { lat: 44.843, lng: 65.49, address: "DEMO · тестовая аллея" };
  const zoneInput = {
    ...geo,
    name: "DEMO · тест " + suffix,
    kind: "Аллея",
    condition: "Хорошее",
    crewId: 3,
    area: 1.7,
  };
  await submit("RESIDENT", "zone-create", zoneInput, 403);
  const zoneId = await op("zone-create", zoneInput);
  const values = {
    ...geo,
    zoneId,
    species: "Тестовый вяз " + suffix,
    condition: "Требует ухода",
    comment: "Учебный осмотр",
    photo,
  };
  await op("tree-create", { ...values, lat: 0 }, 400);
  const treeId = await op("tree-create", values);
  const tree = await db.tree.findUniqueOrThrow({ where: { id: treeId } });
  assert.equal(tree.zoneId, zoneId);
  assert.ok(tree.photo);
  assert.equal((await fetch(base + "/api/photos/" + tree.photo)).status, 200);
  const review = new FormData();
  for (const [key, value] of Object.entries({
    action: "photo-review", object: "tree", id: String(treeId), image: tree.photo,
    category: "Повреждение дерева", reason: "Демонстрационный осмотр", next: "Проверить дерево",
  })) review.set(key, value);
  assert.equal((await fetch(base + "/api/analysis", {
    method: "POST", headers: { Origin: base, Cookie: "demo-role=OPERATOR" }, body: review,
  })).status, 200);
  const edit = {
    ...values,
    id: treeId,
    version: 0,
    condition: "Повреждено",
    photo,
  };
  await op("tree-edit", edit);
  assert.equal((await fetch(base + "/api/photos/" + tree.photo)).status, 200);
  await op("tree-edit", edit, 409);
  const treeHtml = await (
    await fetch(base + "/green-fund/trees/" + treeId)
  ).text();
  assert.ok(treeHtml.includes("Повреждено"));
  assert.ok(treeHtml.includes("Дата осмотра не указана"));
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const plan = {
    target: "tree:" + treeId,
    assigneeId: 3,
    workType: "Полив",
    scheduled: tomorrow,
    due: tomorrow,
  };
  const id = await op("plan", plan);
  const t = await db.task.findUniqueOrThrow({ where: { id } });
  assert.equal(t.assigneeId, 3);
  assert.equal(t.treeId, treeId);
  await op("tree-delete", { id: treeId, version: 1 }, 409);
  await worker("begin", { id });
  await worker("submit", { id, comment: "Полив выполнен" }, 400);
  await worker("submit", { id, comment: "Полив выполнен", photo });
  await worker("approve", { id }, 403);
  await op("approve", { id });
  await op("approve", { id }, 409);
  const result = await db.task.findUniqueOrThrow({
    where: { id },
    include: { events: true },
  });
  assert.equal(result.status, "CLOSED");
  assert.equal(result.events.length, 4);
  assert.ok(result.events.some((e) => e.photo));
  const temp = await op("tree-create", { ...values, photo: "" });
  await op("tree-delete", { id: temp, version: 0 });
  assert.equal(await db.tree.count({ where: { id: temp } }), 0);
  const analytics = await (await fetch(base + "/analytics")).text();
  for (const [label, value] of [
    ["Деревья", await db.tree.count()],
    ["Территории", await db.zone.count()],
    [
      "Запланировано",
      await db.task.count({ where: { reportId: null, status: "ASSIGNED" } }),
    ],
    [
      "Подтверждено",
      await db.task.count({ where: { reportId: null, status: "CLOSED" } }),
    ],
    [
      "Просрочено",
      await db.task.count({
        where: {
          reportId: null,
          status: { in: ["ASSIGNED", "IN_PROGRESS"] },
          dueAt: { lt: new Date() },
        },
      }),
    ],
  ]) {
    assert.ok(
      analytics.includes('data-stat="' + label + '">' + value + "</dd>"),
      label,
    );
  }
}
