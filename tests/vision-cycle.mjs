import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
export async function visionCycle({ base, db, id, timeout = false }) {
  async function send(fields) {
    const body = new FormData();
    for (const [k, v] of Object.entries({
      ...fields,
      id: String(id),
      workspace: "1",
    }))
      body.set(k, v);
    const r = await fetch(base + "/api/analysis", {
      method: "POST",
      body,
      headers: { Origin: base, Cookie: "demo-role=OPERATOR" },
    });
    return { status: r.status, result: await r.json() };
  }
  const bytes = await readFile("tests/vision-data/dry/1.jpg");
  const r = await send({
    action: "attach-classify",
    photo: new File([bytes], "sample.jpg", { type: "image/jpeg" }),
  });
  if (timeout) {
    assert.equal(r.status, 503);
    assert.match(r.result.error, /время обработки/);
    return;
  }
  assert.equal(r.status, 200, JSON.stringify(r.result));
  const row = await db.reviewDecision.findFirstOrThrow({
    where: {
      reportId: id,
      kind: "PHOTO",
      source: { startsWith: "CLIP ViT-B/32 INT8" },
    },
    orderBy: { id: "desc" },
  });
  assert.match(row.source, /6b7c523703ae/);
  assert.equal(row.value, "Засохшее дерево");
  const target = path.resolve(".tools/test/uploads", row.image);
  const good = await readFile(target);
  try {
    await writeFile(target, "broken-test-image");
    const bad = await send({ action: "classify", image: row.image });
    assert.equal(bad.status, 503);
    assert.match(bad.result.error, /прочитать/);
  } finally {
    await writeFile(target, good);
  }
  const manual = await send({
    image: row.image,
    action: "photo-review",
    category: row.value,
    reason: "Визуально проверено оператором",
    next: "Осмотр участка",
  });
  assert.equal(manual.status, 200);
  assert.equal(
    await db.reviewDecision.count({
      where: { reportId: id, image: row.image },
    }),
    2,
  );
}
