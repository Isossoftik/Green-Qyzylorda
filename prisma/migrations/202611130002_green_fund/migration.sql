-- CreateTable
CREATE TABLE "Tree" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seedKey" TEXT,
    "species" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "address" TEXT NOT NULL,
    "zoneId" INTEGER,
    "planted" DATETIME,
    "inspected" DATETIME,
    "condition" TEXT NOT NULL,
    "photo" TEXT,
    "comment" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Tree_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seedKey" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "address" TEXT NOT NULL,
    "area" REAL,
    "condition" TEXT NOT NULL,
    "crewId" INTEGER NOT NULL,
    CONSTRAINT "Zone_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "photo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportId" INTEGER,
    "treeId" INTEGER,
    "zoneId" INTEGER,
    "workType" TEXT,
    "scheduledAt" DATETIME,
    "seedKey" TEXT,
    "assigneeId" INTEGER NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK (("reportId" IS NOT NULL AND "treeId" IS NULL AND "zoneId" IS NULL AND "workType" IS NULL AND "scheduledAt" IS NULL) OR ("reportId" IS NULL AND (("treeId" IS NOT NULL) + ("zoneId" IS NOT NULL)) = 1 AND "workType" IS NOT NULL AND "scheduledAt" IS NOT NULL)),
    CONSTRAINT "Task_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assigneeId", "comment", "createdAt", "dueAt", "id", "reportId", "status", "updatedAt") SELECT "assigneeId", "comment", "createdAt", "dueAt", "id", "reportId", "status", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_reportId_key" ON "Task"("reportId");
CREATE UNIQUE INDEX "Task_seedKey_key" ON "Task"("seedKey");
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Tree_seedKey_key" ON "Tree"("seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Tree_photo_key" ON "Tree"("photo");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_seedKey_key" ON "Zone"("seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceEvent_photo_key" ON "ServiceEvent"("photo");
