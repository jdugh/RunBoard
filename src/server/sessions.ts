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

// Loads all sessions whose date falls in [rangeStartKey, rangeEndKey] inclusive.
// Used by the calendar to populate both day cells and weekly stats.
export async function getSessionsForRange(
  rangeStartKey: string,
  rangeEndKey: string,
): Promise<SessionDTO[]> {
  const rows = await prisma.runningSession.findMany({
    where: {
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

export async function getSessionById(id: string): Promise<SessionDTO | null> {
  const row = await prisma.runningSession.findUnique({ where: { id } });
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
