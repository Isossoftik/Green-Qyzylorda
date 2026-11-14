import { PrismaClient } from "@prisma/client";
import path from "node:path";
const cache = globalThis as unknown as { greenDb?: PrismaClient };
export const testMode = process.env.GREEN_TEST === "1";
export const db =
  cache.greenDb ??
  new PrismaClient(
    testMode
      ? { datasourceUrl: "file:" + path.resolve(".tools/test/demo.db") }
      : undefined,
  );
if (process.env.NODE_ENV !== "production") cache.greenDb = db;
export const uploads = path.resolve(
  testMode ? ".tools/test/uploads" : "uploads",
);
export function listReports() {
  return db.report.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      address: true,
      status: true,
      lat: true,
      lng: true,
      createdAt: true,
      task: { select: { id: true, dueAt: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
