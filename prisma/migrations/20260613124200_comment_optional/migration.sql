-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RunningSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "distanceKm" REAL NOT NULL,
    "averageHeartRate" INTEGER NOT NULL,
    "maxHeartRate" INTEGER NOT NULL,
    "averagePace" TEXT NOT NULL,
    "maxPace" TEXT NOT NULL,
    "runType" TEXT NOT NULL,
    "customRunType" TEXT,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RunningSession" ("averageHeartRate", "averagePace", "comment", "createdAt", "customRunType", "date", "distanceKm", "endTime", "id", "maxHeartRate", "maxPace", "runType", "startTime", "updatedAt") SELECT "averageHeartRate", "averagePace", "comment", "createdAt", "customRunType", "date", "distanceKm", "endTime", "id", "maxHeartRate", "maxPace", "runType", "startTime", "updatedAt" FROM "RunningSession";
DROP TABLE "RunningSession";
ALTER TABLE "new_RunningSession" RENAME TO "RunningSession";
CREATE INDEX "RunningSession_date_idx" ON "RunningSession"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
