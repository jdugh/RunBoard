-- CreateTable
CREATE TABLE "RunningSession" (
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
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "RunningSession_date_idx" ON "RunningSession"("date");
