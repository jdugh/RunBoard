import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKeyFromDate, dayKeyToDate } from "@/lib/date";

export interface SessionDTO {
  id: string;
  dayKey: string;
  startTime: string;
  endTime: string;
  distanceKm: number;
  averageHeartRate: number;
  maxHeartRate: number;
  averagePace: string;
  maxPace: string;
  runType: string;
  customRunType: string | null;
  comment: string | null;
}

// Loads all sessions of a given user whose date falls in
// [rangeStartKey, rangeEndKey] inclusive. Used by the calendar to populate both
// day cells and weekly stats.
export async function getSessionsForRange(
  userId: string,
  rangeStartKey: string,
  rangeEndKey: string,
): Promise<SessionDTO[]> {
  const rows = await prisma.runningSession.findMany({
    where: {
      userId,
      date: {
        gte: dayKeyToDate(rangeStartKey),
        lte: dayKeyToDate(rangeEndKey),
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    dayKey: dayKeyFromDate(row.date),
    startTime: row.startTime,
    endTime: row.endTime,
    distanceKm: row.distanceKm,
    averageHeartRate: row.averageHeartRate,
    maxHeartRate: row.maxHeartRate,
    averagePace: row.averagePace,
    maxPace: row.maxPace,
    runType: row.runType,
    customRunType: row.customRunType,
    comment: row.comment,
  }));
}

// Scoped by userId so a session can never be read across profiles, even with a
// guessed id.
export async function getSessionById(
  userId: string,
  id: string,
): Promise<SessionDTO | null> {
  const row = await prisma.runningSession.findFirst({ where: { id, userId } });
  if (!row) return null;
  return {
    id: row.id,
    dayKey: dayKeyFromDate(row.date),
    startTime: row.startTime,
    endTime: row.endTime,
    distanceKm: row.distanceKm,
    averageHeartRate: row.averageHeartRate,
    maxHeartRate: row.maxHeartRate,
    averagePace: row.averagePace,
    maxPace: row.maxPace,
    runType: row.runType,
    customRunType: row.customRunType,
    comment: row.comment,
  };
}

// Wider projection than SessionDTO: includes the optional metrics filled in by
// the Garmin import, which the markdown export surfaces when present.
export interface ExportSessionDTO {
  dayKey: string;
  startTime: string;
  endTime: string;
  distanceKm: number;
  averageHeartRate: number;
  maxHeartRate: number;
  averagePace: string;
  maxPace: string;
  runType: string;
  customRunType: string | null;
  comment: string | null;
  durationSeconds: number | null;
  avgCadenceSpm: number | null;
  maxCadenceSpm: number | null;
  steps: number | null;
  calories: number | null;
  elevationGainM: number | null;
  elevationLossM: number | null;
  sport: string | null;
}

// Loads the sessions of a user for the export, oldest first. Bounds are
// inclusive; passing null on either side leaves that side unbounded ("toutes
// les données").
export async function getSessionsForExport(
  userId: string,
  rangeStartKey: string | null,
  rangeEndKey: string | null,
): Promise<ExportSessionDTO[]> {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (rangeStartKey) dateFilter.gte = dayKeyToDate(rangeStartKey);
  if (rangeEndKey) dateFilter.lte = dayKeyToDate(rangeEndKey);

  const rows = await prisma.runningSession.findMany({
    where: {
      userId,
      ...(rangeStartKey || rangeEndKey ? { date: dateFilter } : {}),
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return rows.map((row) => ({
    dayKey: dayKeyFromDate(row.date),
    startTime: row.startTime,
    endTime: row.endTime,
    distanceKm: row.distanceKm,
    averageHeartRate: row.averageHeartRate,
    maxHeartRate: row.maxHeartRate,
    averagePace: row.averagePace,
    maxPace: row.maxPace,
    runType: row.runType,
    customRunType: row.customRunType,
    comment: row.comment,
    durationSeconds: row.durationSeconds,
    avgCadenceSpm: row.avgCadenceSpm,
    maxCadenceSpm: row.maxCadenceSpm,
    steps: row.steps,
    calories: row.calories,
    elevationGainM: row.elevationGainM,
    elevationLossM: row.elevationLossM,
    sport: row.sport,
  }));
}
