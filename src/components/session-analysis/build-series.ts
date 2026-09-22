import { hasAnyValue, paceSeries } from "@/lib/track-analysis";
import { METRICS, type MetricId } from "@/lib/track-metrics";
import type { TrackPoint } from "@/lib/track";
import type { ChartSeriesInput } from "./TrackChart";

// A pace axis reads in mm:ss, so it snaps to 15/30/60 s rather than the
// decimal 1/2/5 ladder that would produce ticks like 7:23.
const PACE_TICK_STEPS = [10, 15, 30, 60, 120, 300];

// Turns a metric id into something the chart can draw, or null when the
// session carries no reading for it — which is how the picker knows what to
// offer for a given track.
export function buildChartSeries(
  metricId: MetricId,
  points: TrackPoint[],
  paceWindowS: number,
): ChartSeriesInput | null {
  const metric = METRICS[metricId];
  const samples = metric.build(points, paceWindowS);
  if (!hasAnyValue(samples)) return null;

  return {
    id: metric.id,
    label: metric.label,
    color: metric.color,
    unit: metric.unit,
    axisKey: metric.axisKey,
    invert: metric.invert,
    area: metric.area,
    harmonicMean: metric.harmonicMean,
    robustDomain: metric.id === "pace",
    tickSteps: metric.id === "pace" ? PACE_TICK_STEPS : undefined,
    format: metric.format,
    samples,
  };
}

// Whether pace had to be rebuilt from cumulative distance rather than read
// from a recorded per-second speed. Drives the "donnée recalculée" caption,
// which disappears on its own once imports carry the speed field.
export function isPaceSmoothed(points: TrackPoint[]): boolean {
  return paceSeries(points).origin === "smoothed";
}
