import "server-only";
import FitParser from "fit-file-parser";

import type { TrackPoint } from "@/lib/track";

export type { TrackPoint };

// One lap ("circuit") as delimited by the watch — auto-lap every kilometer by
// default, or manual/interval boundaries. Mirrors the FIT lap message; every
// metric is optional because availability depends on the device and sensors.
export interface ActivityLap {
  lapIndex: number; // 1-based, in recording order
  startOffsetS: number | null; // seconds between session start and lap start
  totalTimerS: number | null;
  totalElapsedS: number | null;
  totalMovingS: number | null;
  distanceM: number | null;
  avgSpeedMps: number | null;
  maxSpeedMps: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  minHeartRate: number | null;
  avgCadenceSpm: number | null;
  maxCadenceSpm: number | null;
  steps: number | null;
  calories: number | null;
  ascentM: number | null;
  descentM: number | null;
  avgPower: number | null;
  maxPower: number | null;
  normalizedPower: number | null;
  avgStanceTimeMs: number | null;
  avgStanceTimeBalance: number | null;
  avgVerticalOscMm: number | null;
  avgStepLengthMm: number | null;
  avgVerticalRatio: number | null;
  avgTemperature: number | null;
  maxTemperature: number | null;
  avgAltitudeM: number | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  lapTrigger: string | null;
  intensity: string | null;
}

// Normalized summary of a single running activity extracted from a .FIT file.
// Units are kept raw (meters, m/s, seconds) so the mapping layer can convert
// them consistently. Most metrics are optional — they may be absent depending
// on the watch and sensors used.
export interface ActivitySummary {
  startTime: Date;
  durationSeconds: number | null; // moving/timer time
  elapsedSeconds: number | null; // wall-clock elapsed (used for end time)
  distanceMeters: number | null;
  avgSpeedMps: number | null;
  maxSpeedMps: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgCadenceSpm: number | null;
  maxCadenceSpm: number | null;
  steps: number | null;
  calories: number | null;
  restingCalories: number | null;
  elevationGainM: number | null;
  elevationLossM: number | null;
  sweatLossMl: number | null;
  sport: string | null;
  subSport: string | null;
  sportProfileName: string | null;
  numLaps: number | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  track: TrackPoint[];
  laps: ActivityLap[];
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Integer columns reject floats, and a FIT file may well report 2.0 or even
// 12.6 where the profile says "integer" — the session mapping already guards
// against this, and lap fields need the same treatment.
function intOrNull(value: unknown): number | null {
  const n = numOrNull(value);
  return n === null ? null : Math.round(n);
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// FIT cadence is in revolutions/min (one cycle = two steps for running).
// Combine the integer and fractional parts and convert to steps per minute.
function toSpm(cadence: unknown, fractional: unknown): number | null {
  const c = numOrNull(cadence);
  if (c === null) return null;
  const frac = numOrNull(fractional) ?? 0;
  return Math.round((c + frac) * 2);
}

function toDate(value: unknown): Date {
  const d = value instanceof Date ? value : new Date(String(value));
  return d;
}

// Seconds between the activity start and a message timestamp, or null when the
// message carries no usable timestamp.
function offsetSeconds(value: unknown, startMs: number): number | null {
  if (value == null) return null;
  const ms = toDate(value).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.round((ms - startMs) / 1000));
}

type OptionalPointKey = "v" | "pw" | "gct" | "vo" | "sl" | "tmp";

// Copies `value` onto `target[key]` only when it is a usable number, so the
// serialized track carries no keys for sensors the watch does not have.
function putIfNumber(
  target: TrackPoint,
  key: OptionalPointKey,
  value: unknown,
): void {
  const n = numOrNull(value);
  if (n !== null) target[key] = n;
}

export async function parseFitActivity(
  buffer: ArrayBuffer,
): Promise<ActivitySummary> {
  const parser = new FitParser({
    mode: "list",
    lengthUnit: "m",
    speedUnit: "m/s",
    temperatureUnit: "celsius",
    force: true,
  });

  const data = await parser.parseAsync(buffer);
  const session = data.sessions?.[0];
  if (!session) {
    throw new Error("Aucune séance trouvée dans le fichier FIT.");
  }

  const startTime = toDate(session.start_time);
  if (Number.isNaN(startTime.getTime())) {
    throw new Error("Date de début invalide dans le fichier FIT.");
  }
  const startMs = startTime.getTime();

  const totalCycles = numOrNull(session.total_cycles);

  const track: TrackPoint[] = (data.records ?? []).map((r) => {
    const point: TrackPoint = {
      t: Math.max(
        0,
        Math.round((toDate(r.timestamp).getTime() - startMs) / 1000),
      ),
      lat: numOrNull(r.position_lat),
      lng: numOrNull(r.position_long),
      alt: numOrNull(r.enhanced_altitude ?? r.altitude),
      hr: numOrNull(r.heart_rate),
      cad: toSpm(r.cadence, r.fractional_cadence),
      d: numOrNull(r.distance),
    };
    putIfNumber(point, "v", r.enhanced_speed ?? r.speed);
    putIfNumber(point, "pw", r.power);
    putIfNumber(point, "gct", r.stance_time);
    putIfNumber(point, "vo", r.vertical_oscillation);
    putIfNumber(point, "sl", r.step_length);
    putIfNumber(point, "tmp", r.temperature);
    return point;
  });

  const laps: ActivityLap[] = (data.laps ?? []).map((l, i) => {
    const lapCycles = numOrNull(l.total_cycles);
    return {
      lapIndex: i + 1,
      startOffsetS: offsetSeconds(l.start_time, startMs),
      totalTimerS: numOrNull(l.total_timer_time),
      totalElapsedS: numOrNull(l.total_elapsed_time),
      totalMovingS: numOrNull(l.total_moving_time),
      distanceM: numOrNull(l.total_distance),
      avgSpeedMps: numOrNull(l.enhanced_avg_speed ?? l.avg_speed),
      maxSpeedMps: numOrNull(l.enhanced_max_speed ?? l.max_speed),
      avgHeartRate: intOrNull(l.avg_heart_rate),
      maxHeartRate: intOrNull(l.max_heart_rate),
      minHeartRate: intOrNull(l.min_heart_rate),
      avgCadenceSpm: toSpm(l.avg_cadence, l.avg_fractional_cadence),
      maxCadenceSpm: toSpm(l.max_cadence, l.max_fractional_cadence),
      steps: lapCycles !== null ? Math.round(lapCycles * 2) : null,
      calories: intOrNull(l.total_calories),
      ascentM: intOrNull(l.total_ascent),
      descentM: intOrNull(l.total_descent),
      avgPower: intOrNull(l.avg_power),
      maxPower: intOrNull(l.max_power),
      normalizedPower: intOrNull(l.normalized_power),
      avgStanceTimeMs: numOrNull(l.avg_stance_time),
      avgStanceTimeBalance: numOrNull(l.avg_stance_time_balance),
      avgVerticalOscMm: numOrNull(l.avg_vertical_oscillation),
      avgStepLengthMm: numOrNull(l.avg_step_length),
      avgVerticalRatio: numOrNull(l.avg_vertical_ratio),
      avgTemperature: numOrNull(l.avg_temperature),
      maxTemperature: numOrNull(l.max_temperature),
      avgAltitudeM: numOrNull(l.enhanced_avg_altitude ?? l.avg_altitude),
      startLat: numOrNull(l.start_position_lat),
      startLng: numOrNull(l.start_position_long),
      endLat: numOrNull(l.end_position_lat),
      endLng: numOrNull(l.end_position_long),
      lapTrigger: strOrNull(l.lap_trigger),
      intensity: strOrNull(l.intensity),
    };
  });

  return {
    startTime,
    durationSeconds: numOrNull(
      session.total_timer_time ?? session.total_elapsed_time,
    ),
    elapsedSeconds: numOrNull(session.total_elapsed_time),
    distanceMeters: numOrNull(session.total_distance),
    avgSpeedMps: numOrNull(session.avg_speed ?? session.enhanced_avg_speed),
    maxSpeedMps: numOrNull(session.max_speed ?? session.enhanced_max_speed),
    avgHeartRate: numOrNull(session.avg_heart_rate),
    maxHeartRate: numOrNull(session.max_heart_rate),
    avgCadenceSpm: toSpm(session.avg_cadence, session.avg_fractional_cadence),
    maxCadenceSpm: toSpm(session.max_cadence, session.max_fractional_cadence),
    steps: totalCycles !== null ? Math.round(totalCycles * 2) : null,
    calories: numOrNull(session.total_calories),
    restingCalories: numOrNull(session.resting_calories),
    elevationGainM: numOrNull(session.total_ascent),
    elevationLossM: numOrNull(session.total_descent),
    sweatLossMl: numOrNull(session.est_sweat_loss),
    sport: strOrNull(session.sport),
    subSport: strOrNull(session.sub_sport),
    sportProfileName: strOrNull(session.sport_profile_name),
    numLaps: numOrNull(session.num_laps),
    startLat: numOrNull(session.start_position_lat),
    startLng: numOrNull(session.start_position_long),
    endLat: numOrNull(session.end_position_lat),
    endLng: numOrNull(session.end_position_long),
    track,
    laps,
  };
}
