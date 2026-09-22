// The catalogue of everything a track can plot: label, unit, axis grouping and
// colour. Central so the small stacked charts, the large overlay and its
// legend all name and colour a metric identically.

import { formatClock } from "@/lib/duration";
import { secondsToPace } from "@/lib/pace";
import type { TrackPoint } from "@/lib/track";
import {
  fieldSeries,
  paceSeries,
  type SeriesSample,
} from "@/lib/track-analysis";

export type MetricId =
  | "pace"
  | "hr"
  | "alt"
  | "cad"
  | "power"
  | "gct"
  | "vosc"
  | "steplen"
  | "temp";

// Four hues, validated with the dataviz palette validator against the app's
// white surface on the all-pairs test (worst CVD ΔE 9.2, worst normal-vision
// ΔE 16.3 — both clear of the floors). Eight distinct hues cannot pass that
// test, so metrics share the four and the picker refuses to put two metrics of
// the same colour on screen at once. Assignment is per metric and fixed:
// toggling one series off never repaints the others.
const SERIES_BLUE = "#2a78d6";
const SERIES_ORANGE = "#eb6834";
const SERIES_AQUA = "#1baf7a";
const SERIES_VIOLET = "#4a3aa7";

export interface MetricDef {
  id: MetricId;
  label: string;
  // Axis caption; series sharing an `axisKey` share a y-axis.
  unit: string;
  axisKey: string;
  color: string;
  // Pace is the one metric where a smaller number is better, so its axis is
  // flipped: faster reads higher, the way every running app draws it.
  invert?: boolean;
  // Elevation reads as ground, so it gets the area wash.
  area?: boolean;
  // Average this metric as a harmonic mean — see seriesStats.
  harmonicMean?: boolean;
  format: (value: number) => string;
  build: (points: TrackPoint[], paceWindowS: number) => SeriesSample[];
}

const METRIC_LIST: MetricDef[] = [
  {
    id: "pace",
    label: "Allure",
    unit: "min/km",
    axisKey: "pace",
    color: SERIES_BLUE,
    invert: true,
    harmonicMean: true,
    format: (v) => secondsToPace(v),
    build: (points, paceWindowS) => paceSeries(points, paceWindowS).samples,
  },
  {
    id: "hr",
    label: "Fréquence cardiaque",
    unit: "bpm",
    axisKey: "hr",
    color: SERIES_ORANGE,
    format: (v) => String(Math.round(v)),
    build: (points) => fieldSeries(points, (p) => p.hr, { zeroIsGap: true }),
  },
  {
    id: "alt",
    label: "Altitude",
    unit: "m",
    axisKey: "alt",
    color: SERIES_AQUA,
    area: true,
    format: (v) => `${Math.round(v)}`,
    build: (points) => fieldSeries(points, (p) => p.alt),
  },
  {
    id: "cad",
    label: "Cadence",
    unit: "ppm",
    axisKey: "cad",
    color: SERIES_VIOLET,
    format: (v) => String(Math.round(v)),
    build: (points) => fieldSeries(points, (p) => p.cad, { zeroIsGap: true }),
  },
  {
    id: "power",
    label: "Puissance",
    unit: "W",
    axisKey: "power",
    color: SERIES_BLUE,
    format: (v) => String(Math.round(v)),
    build: (points) => fieldSeries(points, (p) => p.pw),
  },
  {
    id: "gct",
    label: "Temps de contact au sol",
    unit: "ms",
    axisKey: "gct",
    color: SERIES_VIOLET,
    format: (v) => String(Math.round(v)),
    build: (points) => fieldSeries(points, (p) => p.gct),
  },
  {
    id: "vosc",
    label: "Oscillation verticale",
    unit: "cm",
    axisKey: "vosc",
    color: SERIES_VIOLET,
    format: (v) => v.toFixed(1),
    // Stored in millimeters; Garmin shows centimeters.
    build: (points) =>
      fieldSeries(points, (p) => (p.vo == null ? null : p.vo / 10)),
  },
  {
    id: "steplen",
    label: "Longueur de foulée",
    unit: "m",
    axisKey: "steplen",
    color: SERIES_AQUA,
    format: (v) => v.toFixed(2),
    build: (points) =>
      fieldSeries(points, (p) => (p.sl == null ? null : p.sl / 1000)),
  },
  {
    id: "temp",
    label: "Température",
    unit: "°C",
    axisKey: "temp",
    color: SERIES_ORANGE,
    format: (v) => String(Math.round(v)),
    build: (points) => fieldSeries(points, (p) => p.tmp),
  },
];

export const METRICS: Record<MetricId, MetricDef> = Object.fromEntries(
  METRIC_LIST.map((m) => [m.id, m]),
) as Record<MetricId, MetricDef>;

// Display order, most useful first — also the order the picker lists them in.
export const METRIC_ORDER: MetricId[] = METRIC_LIST.map((m) => m.id);

// The three charts shown stacked under the map, in order.
export const DEFAULT_STACK: MetricId[] = ["pace", "hr", "alt"];

// Overlaying more than this many lines stops being readable, and the palette
// only guarantees four mutually distinguishable hues.
export const MAX_OVERLAY_SERIES = 4;

// The x-axis can be wall-clock time into the session or distance covered.
export type XAxisKey = "time" | "distance";

export function xValue(sample: SeriesSample, axis: XAxisKey): number | null {
  return axis === "time" ? sample.t : sample.d;
}

export function formatX(value: number, axis: XAxisKey): string {
  if (axis === "time") return formatClock(value);
  return `${(value / 1000).toFixed(2)} km`;
}

export function xAxisLabel(axis: XAxisKey): string {
  return axis === "time" ? "Temps" : "Distance (km)";
}

// Axis ticks want something shorter than the tooltip's full precision.
export function formatXTick(value: number, axis: XAxisKey): string {
  if (axis === "time") return formatClock(value);
  const km = value / 1000;
  return km >= 10 ? km.toFixed(0) : km.toFixed(1);
}
