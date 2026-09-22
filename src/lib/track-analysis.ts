// Derivations over a recorded track: chart series and the splits ("circuits")
// table. Pure functions with no React or DOM dependency so they can run on
// either side and stay easy to reason about.

import type { TrackPoint } from "@/lib/track";

// ---------------------------------------------------------------------------
// Laps / splits
// ---------------------------------------------------------------------------

export interface LapDTO {
  lapIndex: number;
  startOffsetS: number | null;
  totalTimerS: number | null;
  totalElapsedS: number | null;
  totalMovingS: number | null;
  distanceM: number | null;
  avgSpeedMps: number | null;
  maxSpeedMps: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgCadenceSpm: number | null;
  maxCadenceSpm: number | null;
  ascentM: number | null;
  descentM: number | null;
}

export interface SplitRow {
  index: number;
  durationS: number;
  cumulativeS: number;
  distanceKm: number;
  paceSecPerKm: number | null;
  avgHr: number | null;
  maxHr: number | null;
  ascentM: number | null;
  avgCadenceSpm: number | null;
}

// "device" rows come from the watch's own lap messages; "computed" rows are
// recut from the track every `splitMeters`. The UI labels them differently
// because the device's elevation figures are filtered and ours are not.
export type SplitsSource = "device" | "computed";

export interface SplitsResult {
  rows: SplitRow[];
  total: SplitRow | null;
  source: SplitsSource;
}

export const DEFAULT_SPLIT_METERS = 1000;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

// Barometric altitude drifts by a few tenths of a meter every second, so
// summing raw deltas inflates the climb several-fold (~14 m of "ascent" on a
// flat 1.4 km loop). Only commit a change once it clears `thresholdM` from the
// last committed reference, which is the same idea as the watch's own filter.
export function ascentDescent(
  altitudes: (number | null | undefined)[],
  thresholdM = 1,
): { ascentM: number; descentM: number } {
  let ascentM = 0;
  let descentM = 0;
  let reference: number | null = null;

  for (const alt of altitudes) {
    if (alt == null || !Number.isFinite(alt)) continue;
    if (reference === null) {
      reference = alt;
      continue;
    }
    const delta = alt - reference;
    if (Math.abs(delta) >= thresholdM) {
      if (delta > 0) ascentM += delta;
      else descentM -= delta;
      reference = alt;
    }
  }

  return { ascentM, descentM };
}

function paceFromDistanceAndTime(
  distanceM: number | null,
  seconds: number | null,
): number | null {
  if (!distanceM || distanceM <= 0 || !seconds || seconds <= 0) return null;
  return (seconds / distanceM) * 1000;
}

export function splitsFromLaps(laps: LapDTO[]): SplitsResult {
  const rows: SplitRow[] = [];
  let cumulativeS = 0;

  for (const lap of laps) {
    const durationS = lap.totalTimerS ?? lap.totalElapsedS ?? 0;
    cumulativeS += durationS;
    rows.push({
      index: lap.lapIndex,
      durationS,
      cumulativeS,
      distanceKm: (lap.distanceM ?? 0) / 1000,
      paceSecPerKm:
        lap.avgSpeedMps && lap.avgSpeedMps > 0
          ? 1000 / lap.avgSpeedMps
          : paceFromDistanceAndTime(lap.distanceM, durationS),
      avgHr: lap.avgHeartRate,
      maxHr: lap.maxHeartRate,
      ascentM: lap.ascentM,
      avgCadenceSpm: lap.avgCadenceSpm,
    });
  }

  return { rows, total: totalRow(rows), source: "device" };
}

// Recuts the track into fixed-distance splits. Used when the session predates
// lap persistence, or was imported from a file without lap messages.
export function splitsFromTrack(
  points: TrackPoint[],
  splitMeters = DEFAULT_SPLIT_METERS,
): SplitsResult {
  const usable = points.filter((p) => p.d != null);
  if (usable.length < 2) {
    return { rows: [], total: null, source: "computed" };
  }

  const rows: SplitRow[] = [];
  let boundary = usable[0];
  let nextTarget = (boundary.d as number) + splitMeters;
  let hrs: number[] = [];
  let cadences: number[] = [];
  let altitudes: (number | null)[] = [boundary.alt];

  const flush = (end: TrackPoint) => {
    const distanceM = (end.d as number) - (boundary.d as number);
    if (distanceM <= 0) return;
    const durationS = end.t - boundary.t;
    rows.push({
      index: rows.length + 1,
      durationS,
      cumulativeS: end.t - usable[0].t,
      distanceKm: distanceM / 1000,
      paceSecPerKm: paceFromDistanceAndTime(distanceM, durationS),
      avgHr: roundOrNull(mean(hrs)),
      maxHr: hrs.length > 0 ? Math.max(...hrs) : null,
      ascentM: Math.round(ascentDescent(altitudes).ascentM),
      avgCadenceSpm: roundOrNull(mean(cadences)),
    });
    boundary = end;
    hrs = [];
    cadences = [];
    altitudes = [end.alt];
  };

  for (const point of usable) {
    if (point.hr != null) hrs.push(point.hr);
    // A zero reading is the watch reporting "not running", not a real cadence.
    if (point.cad != null && point.cad > 0) cadences.push(point.cad);
    altitudes.push(point.alt);

    if ((point.d as number) >= nextTarget) {
      flush(point);
      nextTarget = (point.d as number) + splitMeters;
    }
  }

  // Trailing partial split, mirroring how a watch reports the last lap.
  const last = usable[usable.length - 1];
  if ((last.d as number) - (boundary.d as number) > 10) {
    flush(last);
  }

  return { rows, total: totalRow(rows), source: "computed" };
}

// Weighted recap row, matching the footer Garmin puts under its splits table.
// Averages are weighted by split duration so a short trailing split does not
// count as much as a full kilometer.
function totalRow(rows: SplitRow[]): SplitRow | null {
  if (rows.length === 0) return null;

  let durationS = 0;
  let distanceKm = 0;
  let ascentM = 0;
  let hasAscent = false;
  let hrWeight = 0;
  let hrSum = 0;
  let cadWeight = 0;
  let cadSum = 0;
  let maxHr: number | null = null;

  for (const row of rows) {
    durationS += row.durationS;
    distanceKm += row.distanceKm;
    if (row.ascentM != null) {
      ascentM += row.ascentM;
      hasAscent = true;
    }
    if (row.avgHr != null) {
      hrSum += row.avgHr * row.durationS;
      hrWeight += row.durationS;
    }
    if (row.avgCadenceSpm != null) {
      cadSum += row.avgCadenceSpm * row.durationS;
      cadWeight += row.durationS;
    }
    if (row.maxHr != null) maxHr = Math.max(maxHr ?? 0, row.maxHr);
  }

  return {
    index: 0,
    durationS,
    cumulativeS: durationS,
    distanceKm,
    paceSecPerKm: distanceKm > 0 ? durationS / distanceKm : null,
    avgHr: hrWeight > 0 ? Math.round(hrSum / hrWeight) : null,
    maxHr,
    ascentM: hasAscent ? ascentM : null,
    avgCadenceSpm: cadWeight > 0 ? Math.round(cadSum / cadWeight) : null,
  };
}

function roundOrNull(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}

// ---------------------------------------------------------------------------
// Chart series
// ---------------------------------------------------------------------------

// A sample positioned on both possible x-axes, so switching between "temps"
// and "distance" never needs a recompute. `y === null` breaks the line.
export interface SeriesSample {
  t: number; // seconds from start
  d: number | null; // cumulative meters
  y: number | null;
}

export type PaceOrigin = "recorded" | "smoothed";

export interface PaceSeries {
  samples: SeriesSample[];
  origin: PaceOrigin;
  windowS: number;
}

export const PACE_WINDOW_OPTIONS = [10, 30, 60] as const;
export const DEFAULT_PACE_WINDOW_S = 30;

// Anything slower than this is standing still or walking a crossing; plotting
// it would stretch the axis until the running range is a flat line, so those
// samples become gaps instead.
const MAX_PLOTTABLE_PACE_SEC_PER_KM = 20 * 60;

function paceFromSpeed(speedMps: number | undefined): number | null {
  if (speedMps == null || speedMps <= 0) return null;
  const pace = 1000 / speedMps;
  return pace > MAX_PLOTTABLE_PACE_SEC_PER_KM ? null : pace;
}

// Pace has two possible provenances and the UI tells them apart:
//
//   - "recorded": the watch stored a per-second speed and we just invert it.
//   - "smoothed": older imports only kept cumulative distance, so pace is
//     rebuilt as Δdistance/Δtime over a trailing window. Raw 1 s deltas are
//     far too noisy to read (p95 above 12 min/km on an otherwise steady run),
//     hence the window.
export function paceSeries(
  points: TrackPoint[],
  windowS = DEFAULT_PACE_WINDOW_S,
): PaceSeries {
  const hasRecordedSpeed = points.some((p) => p.v != null);

  if (hasRecordedSpeed) {
    return {
      samples: points.map((p) => ({ t: p.t, d: p.d, y: paceFromSpeed(p.v) })),
      origin: "recorded",
      windowS: 0,
    };
  }

  const samples: SeriesSample[] = [];
  let left = 0;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    // Advance the trailing edge so the window covers at most `windowS`.
    while (left < i && point.t - points[left].t > windowS) left++;

    const from = points[left];
    const dt = point.t - from.t;
    const dd =
      point.d != null && from.d != null ? point.d - from.d : null;

    let y: number | null = null;
    // Need most of the window and at least a meter covered, otherwise the
    // ratio is dominated by GPS jitter.
    if (dt >= Math.min(windowS, 5) && dd != null && dd > 1) {
      const pace = (dt / dd) * 1000;
      y = pace > MAX_PLOTTABLE_PACE_SEC_PER_KM ? null : pace;
    }
    samples.push({ t: point.t, d: point.d, y });
  }

  return { samples, origin: "smoothed", windowS };
}

// Lifts a plain per-point field into a series. Zero cadence means "not
// running" rather than a measured zero, so it is treated as a gap.
export function fieldSeries(
  points: TrackPoint[],
  read: (p: TrackPoint) => number | null | undefined,
  { zeroIsGap = false }: { zeroIsGap?: boolean } = {},
): SeriesSample[] {
  return points.map((p) => {
    const raw = read(p);
    const value = raw == null || !Number.isFinite(raw) ? null : raw;
    return {
      t: p.t,
      d: p.d,
      y: value !== null && zeroIsGap && value === 0 ? null : value,
    };
  });
}

export function hasAnyValue(samples: SeriesSample[]): boolean {
  return samples.some((s) => s.y !== null);
}

export interface SeriesStats {
  min: number;
  max: number;
  avg: number;
}

// Computed over the full-resolution samples, so the figures match what the
// tooltip reports rather than what the decimated line happens to draw. Gaps
// (sensor dropouts, stopped seconds) are excluded from all three.
//
// `harmonic` is for rates expressed as time-per-distance. Averaging min/km
// arithmetically is simply the wrong statistic: each sample covers one second,
// not one kilometer, so the slow ones get far too much weight. The harmonic
// mean of the paces equals total distance over total time, which is what
// "allure moyenne" means. (It is therefore a *moving* average — the stopped
// seconds are gaps — and reads faster than the session's overall pace, which
// divides by elapsed time.)
export function seriesStats(
  samples: SeriesSample[],
  { harmonic = false }: { harmonic?: boolean } = {},
): SeriesStats | null {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let reciprocalSum = 0;
  let count = 0;

  for (const sample of samples) {
    const y = sample.y;
    if (y === null) continue;
    if (y < min) min = y;
    if (y > max) max = y;
    sum += y;
    if (y > 0) reciprocalSum += 1 / y;
    count++;
  }

  if (count === 0) return null;
  const avg =
    harmonic && reciprocalSum > 0 ? count / reciprocalSum : sum / count;
  return { min, max, avg };
}

// Reduces a series to at most `maxPoints` by averaging within buckets. Only
// affects what is drawn — tooltips read the full-resolution array — so the
// line stays light without hiding anything the reader can inspect.
export function decimate(
  samples: SeriesSample[],
  maxPoints: number,
): SeriesSample[] {
  if (samples.length <= maxPoints || maxPoints < 2) return samples;

  const bucketSize = samples.length / maxPoints;
  const out: SeriesSample[] = [];

  for (let i = 0; i < maxPoints; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(samples.length, Math.floor((i + 1) * bucketSize));
    if (end <= start) continue;

    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      const y = samples[j].y;
      if (y !== null) {
        sum += y;
        count++;
      }
    }
    const middle = samples[Math.floor((start + end - 1) / 2)];
    out.push({
      t: middle.t,
      d: middle.d,
      // A bucket with no reading stays a gap rather than being bridged.
      y: count > 0 ? sum / count : null,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export interface LatLng {
  lat: number;
  lng: number;
}

// The GPS may take a while to lock at the start, leaving a run of points with
// no position. Those are dropped rather than interpolated: the map then starts
// where the fix does, which is honest about what was recorded.
export function routeLatLngs(points: TrackPoint[]): LatLng[] {
  const out: LatLng[] = [];
  for (const p of points) {
    if (p.lat != null && p.lng != null) out.push({ lat: p.lat, lng: p.lng });
  }
  return out;
}

// The recorded position at (or nearest to) `t`, for the marker the map shows
// while a chart is hovered. Points without a fix are skipped rather than
// interpolated, so the marker only ever sits where the watch actually was.
export function positionAtTime(
  points: TrackPoint[],
  t: number,
): LatLng | null {
  let best: TrackPoint | null = null;
  let bestDelta = Infinity;

  for (const point of points) {
    if (point.lat == null || point.lng == null) continue;
    const delta = Math.abs(point.t - t);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = point;
    }
    // Samples are in chronological order: once we start moving away from the
    // target there is nothing closer left to find.
    else if (point.t > t) break;
  }

  return best ? { lat: best.lat as number, lng: best.lng as number } : null;
}

// True when the track starts with positionless points — the map caption says
// so, since the drawn route is then shorter than the run.
export function missingLeadingFixSeconds(points: TrackPoint[]): number {
  const firstFix = points.findIndex((p) => p.lat != null && p.lng != null);
  if (firstFix <= 0) return 0;
  return points[firstFix].t - points[0].t;
}
