import "server-only";
import FitParser from "fit-file-parser";

// One sampled point of the activity track (second-by-second).
export interface TrackPoint {
  t: number; // seconds from start
  lat: number | null;
  lng: number | null;
  alt: number | null; // meters
  hr: number | null; // bpm
  cad: number | null; // steps per minute
  d: number | null; // cumulative distance, meters
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
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

export async function parseFitActivity(
  buffer: ArrayBuffer,
): Promise<ActivitySummary> {
  const parser = new FitParser({
    mode: "list",
    lengthUnit: "m",
    speedUnit: "m/s",
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

  const track: TrackPoint[] = (data.records ?? []).map((r) => ({
    t: Math.max(0, Math.round((toDate(r.timestamp).getTime() - startMs) / 1000)),
      lat: numOrNull(r.position_lat),
      lng: numOrNull(r.position_long),
      alt: numOrNull(r.enhanced_altitude ?? r.altitude),
      hr: numOrNull(r.heart_rate),
      cad: toSpm(r.cadence, r.fractional_cadence),
      d: numOrNull(r.distance),
  }));

  return {
    startTime,
    durationSeconds: numOrNull(session.total_timer_time ?? session.total_elapsed_time),
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
  };
}
