import test from "node:test";
import { visionCycle } from "./vision-cycle.mjs";
import { analysisCycle } from "./analysis-cycle.mjs";
import { greenCycle } from "./green-cycle.mjs";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, copyFile, cp, open } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import http from "node:http";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
const dir = path.resolve(".tools/test");
const env = {
  ...process.env,
  GREEN_TEST: "1",
  GREEN_CLIP_DIR: path.resolve(".tools/test/missing-vision-model"),
  NODE_ENV: "production",
};
const cli = (file, args) =>
  execFileSync(process.execPath, [file, ...args], { env, stdio: "pipe" });
test(
  "Регистрация → уточнение → назначение → результат → проверка → перезапуск",
  { timeout: 150000 },
  async (suite) => {
    await mkdir(dir, { recursive: true });
    await copyFile("prisma/schema.prisma", path.join(dir, "schema.prisma"));
    await cp("prisma/migrations", path.join(dir, "migrations"), {
      recursive: true,
    });
    await (await open(path.join(dir, "demo.db"), "a")).close();
    cli("node_modules/prisma/build/index.js", [
      "migrate",
      "deploy",
      "--schema",
      path.join(dir, "schema.prisma"),
    ]);
    cli("scripts/seed.mjs", []);
    const db = new PrismaClient({
      datasourceUrl: "file:" + path.join(dir, "demo.db"),
    });
    const socket = net.createServer();
    socket.listen(0, "127.0.0.1");
    await once(socket, "listening");
    const port = socket.address().port;
    await new Promise((r) => socket.close(r));
    const base = "http://127.0.0.1:" + port;
    let server,
      logs = "";
    async function start(extraEnv = {}) {
      server = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "-H",
          "127.0.0.1",
          "-p",
          String(port),
        ],
        { env: { ...env, ...extraEnv }, stdio: ["ignore", "pipe", "pipe"] },
      );
      server.stderr.on("data", (s) => (logs += s));
      server.stdout.on("data", (s) => (logs += s));
      for (let i = 0; i < 100; i++) {
        if (server.exitCode !== null) throw Error(logs);
        try {
          if ((await fetch(base + "/settings")).ok) return;
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
      }
      throw Error(logs);
    }
    async function stop() {
      if (!server || server.exitCode !== null || server.signalCode) return;
      const ended = once(server, "exit");
      server.kill();
      await ended;
    }
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#229955" },
    })
      .png()
      .toBuffer();
    const photo = new File([bytes], "../../unsafe.png", { type: "image/png" });
    let id,
      version = 0;
    async function post(role, action, fields = {}, status = 200) {
      const form = new FormData();
      if (id) {
        form.set("id", String(id));
        form.set("version", String(version));
      }
      form.set("action", action);
      for (const [k, v] of Object.entries(fields)) form.set(k, v);
      const response = await fetch(base + "/api/workflow", {
        method: "POST",
        headers: { Cookie: "demo-role=" + role, Origin: base },
        body: form,
      });
      const result = await response.json();
      assert.equal(
        response.status,
        status,
        action + " " + JSON.stringify(result) + " " + logs.slice(-1200),
      );
      if (status === 200 && action !== "create") version++;
      return result;
    }
    try {
      await start();
      await suite.test("Локальный DEMO: Host, Origin, повреждённая и потоковая форма", async () => {
        const status = await new Promise((resolve, reject) => {
          http.get(base + "/settings", { headers: { Host: "demo.example" } }, res => {
            res.resume();
            resolve(res.statusCode);
          }).on("error", reject);
        });
        assert.equal(status, 403);
        for (const endpoint of ["workflow", "analysis", "green"]) {
          const url = base + "/api/" + endpoint;
          for (const origin of ["https://outside.test", "null"]) {
            assert.equal((await fetch(url, {method: "POST", headers: {Origin: origin}, body: "x"})).status, 403);
          }
          assert.equal((await fetch(url, {method: "POST", body: "x"})).status, 400);
        }
        async function* chunks() {
          for (let i = 0; i < 7; i++) yield Buffer.alloc(1024 * 1024);
        }
        assert.equal((await fetch(base + "/api/workflow", {method: "POST", duplex: "half", body: chunks()})).status, 413);
        assert.equal((await fetch(base + "/api/photos/..%5Cdemo.db")).status, 404);
      });
      await suite.test(
        "Зелёный фонд: CRUD, полив, фото, роли, история и показатели",
        () => greenCycle({ base, db, photo }),
      );
      await suite.test(
        "Приоритет, повторы, недоступная модель, ручная оценка и графики",
        () => analysisCycle({ base, db, photo }),
      );
      const input = {
        category: "Отсутствие полива",
        title: "Тест полива",
        description: "Просим проверить подачу воды деревьям.",
        address: "мкр. Арай",
        lat: "44.844",
        lng: "65.49",
        contact: "test@example.test",
        photo,
      };
      await post("RESIDENT", "create", { ...input, lat: "0" }, 400);
      await post(
        "RESIDENT",
        "create",
        {
          ...input,
          photo: new File(["fake"], "bad.png", { type: "image/png" }),
        },
        400,
      );
      id = (await post("RESIDENT", "create", input)).id;
      await post("OPERATOR", "close", {}, 409);
      await post("OPERATOR", "review");
      await post("OPERATOR", "clarify", { comment: "Уточните номер дома" });
      await post("RESIDENT", "reply", { comment: "У дома 10" });
      const due = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await post(
        "OPERATOR",
        "assign",
        { assigneeId: "3", due: "2000-01-01" },
        400,
      );
      await post("OPERATOR", "assign", { assigneeId: "3", due });
      await post("OPERATOR", "assign", { assigneeId: "3", due }, 409);
      await post("EXECUTOR", "start");
      await post("EXECUTOR", "finish", { comment: "Работы выполнены" }, 400);
      await post("EXECUTOR", "finish", { comment: "Работы выполнены", photo });
      await post("EXECUTOR", "close", {}, 403);
      await post("OPERATOR", "redo", { comment: "Проверьте вторую линию" });
      await post("EXECUTOR", "finish", {
        comment: "Вторая линия проверена",
        photo,
      });
      await post("OPERATOR", "close");
      const before = await db.report.findUniqueOrThrow({
        where: { id },
        include: { task: true, photos: true, history: true },
      });
      assert.equal(before.status, "CLOSED");
      assert.equal(before.task.status, "CLOSED");
      assert.equal(before.task.assigneeId, 3);
      assert.equal(before.history.length, version + 1);
      assert.equal(before.photos.length, 3);
      await stop();
      const localDir =
        process.env.GREEN_CLIP_DIR || path.resolve(".tools/vision");
      await start({ GREEN_CLIP_DIR: localDir });
      await suite.test(
        "Реальное фото на CPU, история SQLite, повреждённый файл",
        () => visionCycle({ base, db, id }),
      );
      const html = await (await fetch(base + "/reports/" + id)).text();
      assert.ok(html.includes("Вторая линия проверена"));
      assert.ok(html.includes("Закрыто"));
      for (const image of before.photos) {
        assert.match(image.filename, /^[a-f0-9-]+\.webp$/);
        const res = await fetch(base + "/api/photos/" + image.filename);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("content-type"), "image/webp");
      }
      await stop();
      await start({ GREEN_CLIP_DIR: localDir, GREEN_VISION_TIMEOUT_MS: "1" });
      await suite.test("Принудительный тайм-аут инференса", () =>
        visionCycle({ base, db, id, timeout: true }),
      );
    } finally {
      await stop();
      await db.$disconnect();
    }
  },
);
