import "server-only";
import { prisma } from "@/lib/prisma";
import type { TrackPoint } from "@/lib/track";
import type { LapDTO } from "@/lib/track-analysis";

// Everything the analysis tabs need for one session: the full track, the laps
// the watch recorded, and the summary metrics the header line shows.
//
// Deliberately kept out of SessionDTO — a month of sessions would otherwise
// pull tens of thousands of track points into the calendar payload. The tabs
// fetch this on demand, once, when they are first opened.
export interface SessionAnalysisDTO {
  id: string;
  distanceKm: number;
  durationSeconds: number | null;
  averagePace: string;
  avgCadenceSpm: number | null;
  calories: number | null;
  elevationGainM: number | null;
  elevationLossM: number | null;
  sport: string | null;
  points: TrackPoint[];
  laps: LapDTO[];
}

// A track written before a field was captured simply lacks the key, so parsing
// is tolerant by design: unknown or missing keys stay undefined and every
// consumer already treats them as optional.
function parsePoints(raw: string): TrackPoint[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrackPoint[]) : [];
  } catch {
    return [];
  }
}

// Scoped by userId so a track can never be read across profiles, even with a
// guessed id — same rule as getSessionById.
export async function getSessionAnalysis(
  userId: string,
  id: string,
): Promise<SessionAnalysisDTO | null> {
  const row = await prisma.runningSession.findFirst({
    where: { id, userId },
    include: {
      track: true,
      laps: { orderBy: { lapIndex: "asc" } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    distanceKm: row.distanceKm,
    durationSeconds: row.durationSeconds,
    averagePace: row.averagePace,
    avgCadenceSpm: row.avgCadenceSpm,
    calories: row.calories,
    elevationGainM: row.elevationGainM,
    elevationLossM: row.elevationLossM,
    sport: row.sport,
    points: row.track ? parsePoints(row.track.points) : [],
    laps: row.laps.map((lap) => ({
      lapIndex: lap.lapIndex,
      startOffsetS: lap.startOffsetS,
      totalTimerS: lap.totalTimerS,
      totalElapsedS: lap.totalElapsedS,
      totalMovingS: lap.totalMovingS,
      distanceM: lap.distanceM,
      avgSpeedMps: lap.avgSpeedMps,
      maxSpeedMps: lap.maxSpeedMps,
      avgHeartRate: lap.avgHeartRate,
      maxHeartRate: lap.maxHeartRate,
      avgCadenceSpm: lap.avgCadenceSpm,
      maxCadenceSpm: lap.maxCadenceSpm,
      ascentM: lap.ascentM,
      descentM: lap.descentM,
    })),
  };
}
