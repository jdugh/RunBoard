-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RunningSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
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
    "externalId" TEXT,
    "durationSeconds" INTEGER,
    "avgCadenceSpm" INTEGER,
    "maxCadenceSpm" INTEGER,
    "steps" INTEGER,
    "calories" INTEGER,
    "restingCalories" INTEGER,
    "elevationGainM" INTEGER,
    "elevationLossM" INTEGER,
    "sweatLossMl" INTEGER,
    "sport" TEXT,
    "subSport" TEXT,
    "sportProfileName" TEXT,
    "numLaps" INTEGER,
    "startLat" REAL,
    "startLng" REAL,
    "endLat" REAL,
    "endLng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RunningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "points" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionTrack_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RunningSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RunningSession_date_idx" ON "RunningSession"("date");

-- CreateIndex
CREATE INDEX "RunningSession_userId_date_idx" ON "RunningSession"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RunningSession_userId_externalId_key" ON "RunningSession"("userId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionTrack_sessionId_key" ON "SessionTrack"("sessionId");
