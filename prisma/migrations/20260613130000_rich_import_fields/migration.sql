-- AlterTable
ALTER TABLE "RunningSession" ADD COLUMN "avgCadenceSpm" INTEGER;
ALTER TABLE "RunningSession" ADD COLUMN "calories" INTEGER;
ALTER TABLE "RunningSession" ADD COLUMN "durationSeconds" INTEGER;
ALTER TABLE "RunningSession" ADD COLUMN "elevationGainM" INTEGER;
ALTER TABLE "RunningSession" ADD COLUMN "elevationLossM" INTEGER;
ALTER TABLE "RunningSession" ADD COLUMN "endLat" REAL;
ALTER TABLE "RunningSession" ADD COLUMN "endLng" REAL;
ALTER TABLE "RunningSession" ADD COLUMN "externalId" TEXT;
ALTER TABLE "RunningSession" ADD COLUMN "maxCadenceSpm" INTEGER;
ALTER TABLE "RunningSession" ADD COLUMN "numLaps" INTEGER;
ALTER TABLE "RunningSession" ADD COLUMN "restingCalories" INTEGER;
ALTER TABLE "RunningSession" ADD COLUMN "sport" TEXT;
ALTER TABLE "RunningSession" ADD COLUMN "sportProfileName" TEXT;
ALTER TABLE "RunningSession" ADD COLUMN "startLat" REAL;
ALTER TABLE "RunningSession" ADD COLUMN "startLng" REAL;
ALTER TABLE "RunningSession" ADD COLUMN "steps" INTEGER;
ALTER TABLE "RunningSession" ADD COLUMN "subSport" TEXT;
ALTER TABLE "RunningSession" ADD COLUMN "sweatLossMl" INTEGER;

-- CreateTable
CREATE TABLE "SessionTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "points" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionTrack_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RunningSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionTrack_sessionId_key" ON "SessionTrack"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RunningSession_externalId_key" ON "RunningSession"("externalId");
