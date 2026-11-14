-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportId" INTEGER,
    "treeId" INTEGER,
    "actorId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "action" TEXT,
    "image" TEXT,
    "source" TEXT NOT NULL,
    "candidateId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewDecision_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewDecision_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewDecision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestKey" TEXT NOT NULL,
    "treeId" INTEGER,
    "zoneId" INTEGER,
    "assigneeId" INTEGER NOT NULL,
    "workType" TEXT NOT NULL,
    "startDay" TEXT NOT NULL,
    "endDay" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CareSchedule_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CareSchedule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CareSchedule_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Occurrence" (
    "scheduleId" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "taskId" INTEGER NOT NULL,

    PRIMARY KEY ("scheduleId", "day"),
    CONSTRAINT "Occurrence_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CareSchedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Occurrence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "treeId" INTEGER,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seedKey" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "contact" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "clarification" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Report_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("address", "authorId", "category", "clarification", "contact", "createdAt", "description", "id", "lat", "lng", "seedKey", "status", "title", "updatedAt", "version") SELECT "address", "authorId", "category", "clarification", "contact", "createdAt", "description", "id", "lat", "lng", "seedKey", "status", "title", "updatedAt", "version" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE UNIQUE INDEX "Report_seedKey_key" ON "Report"("seedKey");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ReviewDecision_reportId_kind_id_idx" ON "ReviewDecision"("reportId", "kind", "id");

-- CreateIndex
CREATE INDEX "ReviewDecision_treeId_image_id_idx" ON "ReviewDecision"("treeId", "image", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CareSchedule_requestKey_key" ON "CareSchedule"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "Occurrence_taskId_key" ON "Occurrence"("taskId");
