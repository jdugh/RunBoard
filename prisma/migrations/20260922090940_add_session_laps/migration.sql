-- CreateTable
CREATE TABLE "SessionLap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "lapIndex" INTEGER NOT NULL,
    "startOffsetS" INTEGER,
    "totalTimerS" REAL,
    "totalElapsedS" REAL,
    "totalMovingS" REAL,
    "distanceM" REAL,
    "avgSpeedMps" REAL,
    "maxSpeedMps" REAL,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "minHeartRate" INTEGER,
    "avgCadenceSpm" INTEGER,
    "maxCadenceSpm" INTEGER,
    "steps" INTEGER,
    "calories" INTEGER,
    "ascentM" INTEGER,
    "descentM" INTEGER,
    "avgPower" INTEGER,
    "maxPower" INTEGER,
    "normalizedPower" INTEGER,
    "avgStanceTimeMs" REAL,
    "avgStanceTimeBalance" REAL,
    "avgVerticalOscMm" REAL,
    "avgStepLengthMm" REAL,
    "avgVerticalRatio" REAL,
    "avgTemperature" REAL,
    "maxTemperature" REAL,
    "avgAltitudeM" REAL,
    "startLat" REAL,
    "startLng" REAL,
    "endLat" REAL,
    "endLng" REAL,
    "lapTrigger" TEXT,
    "intensity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionLap_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RunningSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SessionLap_sessionId_idx" ON "SessionLap"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionLap_sessionId_lapIndex_key" ON "SessionLap"("sessionId", "lapIndex");
