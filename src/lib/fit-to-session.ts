import { formatInTimeZone } from "date-fns-tz";

import { secondsToPace } from "@/lib/pace";
import { TIMEZONE } from "@/lib/date";
import type { ActivityLap, ActivitySummary, TrackPoint } from "@/lib/fit";

// A draft pre-filled from an imported activity. Every metric is optional:
// missing values leave the corresponding form field empty so the user can
// complete it before saving. `runType` and `comment` are intentionally left
// out — Garmin does not provide our training taxonomy, and the comment is
// optional.
export interface ImportedSessionDraft {
  date: string; // yyyy-MM-dd (Europe/Paris)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  distanceKm?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePace?: string; // mm:ss/km
  maxPace?: string; // mm:ss/km
}

// Rich, non-editable metrics carried alongside the editable draft and persisted
// as-is when the imported session is saved.
export interface ImportExtras {
  externalId?: string;
  durationSeconds?: number;
  avgCadenceSpm?: number;
  maxCadenceSpm?: number;
  steps?: number;
  calories?: number;
  restingCalories?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  sweatLossMl?: number;
  sport?: string;
  subSport?: string;
  sportProfileName?: string;
  numLaps?: number;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  track?: TrackPoint[];
  laps?: ActivityLap[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function u<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

// Integer metrics may arrive as floats from the FIT file (e.g. timer time
// 3006.007s); the DB columns are integers, so round before persisting.
function ri(value: number | null): number | undefined {
  return value === null ? undefined : Math.round(value);
}

export function activityToExtras(
  a: ActivitySummary,
  externalId: string,
): ImportExtras {
  return {
    externalId,
    durationSeconds: ri(a.durationSeconds),
    avgCadenceSpm: ri(a.avgCadenceSpm),
    maxCadenceSpm: ri(a.maxCadenceSpm),
    steps: ri(a.steps),
    calories: ri(a.calories),
    restingCalories: ri(a.restingCalories),
    elevationGainM: ri(a.elevationGainM),
    elevationLossM: ri(a.elevationLossM),
    sweatLossMl: ri(a.sweatLossMl),
    sport: u(a.sport),
    subSport: u(a.subSport),
    sportProfileName: u(a.sportProfileName),
    numLaps: ri(a.numLaps),
    startLat: u(a.startLat),
    startLng: u(a.startLng),
    endLat: u(a.endLat),
    endLng: u(a.endLng),
    track: a.track.length > 0 ? a.track : undefined,
    laps: a.laps.length > 0 ? a.laps : undefined,
  };
}

// Average pace in seconds/km, preferring the reported average speed and
// falling back to distance/elapsed time.
function avgPaceSeconds(a: ActivitySummary): number | null {
  if (a.avgSpeedMps && a.avgSpeedMps > 0) {
    return 1000 / a.avgSpeedMps;
  }
  if (a.distanceMeters && a.distanceMeters > 0 && a.elapsedSeconds) {
    return a.elapsedSeconds / (a.distanceMeters / 1000);
  }
  return null;
}

export function activityToDraft(a: ActivitySummary): ImportedSessionDraft {
  const start = a.startTime;
  const end =
    a.elapsedSeconds != null
      ? new Date(start.getTime() + a.elapsedSeconds * 1000)
      : start;

  const avgPace = avgPaceSeconds(a);
  const maxPace =
    a.maxSpeedMps && a.maxSpeedMps > 0 ? 1000 / a.maxSpeedMps : null;

  return {
    date: formatInTimeZone(start, TIMEZONE, "yyyy-MM-dd"),
    startTime: formatInTimeZone(start, TIMEZONE, "HH:mm"),
    endTime:
      a.elapsedSeconds != null
        ? formatInTimeZone(end, TIMEZONE, "HH:mm")
        : undefined,
    distanceKm:
      a.distanceMeters != null ? round2(a.distanceMeters / 1000) : undefined,
    averageHeartRate:
      a.avgHeartRate != null ? Math.round(a.avgHeartRate) : undefined,
    maxHeartRate: a.maxHeartRate != null ? Math.round(a.maxHeartRate) : undefined,
    averagePace: avgPace != null ? secondsToPace(avgPace) : undefined,
    maxPace: maxPace != null ? secondsToPace(maxPace) : undefined,
  };
}
