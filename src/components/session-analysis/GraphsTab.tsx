"use client";

import { useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";

import {
  DEFAULT_PACE_WINDOW_S,
  seriesStats,
  type SeriesStats,
} from "@/lib/track-analysis";
import { DEFAULT_STACK, type MetricId } from "@/lib/track-metrics";
import type { TrackPoint } from "@/lib/track";

import { ChartDetail } from "./ChartDetail";
import { RouteMap } from "./RouteMap";
import { SeriesSummary } from "./SeriesSummary";
import { TrackChart, type ChartSeriesInput } from "./TrackChart";
import { buildChartSeries, isPaceSmoothed } from "./build-series";

interface GraphsTabProps {
  points: TrackPoint[];
  // Which metrics the detailed view is showing, or null for the overview.
  // Owned by the modal because the dialog widens while it is open — and
  // because a nested dialog would be dismissed along with its parent.
  expanded: MetricId[] | null;
  onExpand: (metrics: MetricId[]) => void;
  onCollapse: () => void;
}

interface StackedChart {
  id: MetricId;
  series: ChartSeriesInput;
  // Pre-wrapped so the array identity is stable across hover renders: a new
  // array literal would re-resolve and re-decimate every series on every
  // pointer move.
  seriesList: ChartSeriesInput[];
  stats: SeriesStats | null;
}

export function GraphsTab({
  points,
  expanded,
  onExpand,
  onCollapse,
}: GraphsTabProps) {
  // The instant under the cursor, shared by every chart and the map, so
  // hovering one curve reads out the same moment everywhere at once.
  const [hoverT, setHoverT] = useState<number | null>(null);

  const paceSmoothed = useMemo(() => isPaceSmoothed(points), [points]);

  const charts = useMemo<StackedChart[]>(
    () =>
      DEFAULT_STACK.map((id) => {
        const series = buildChartSeries(id, points, DEFAULT_PACE_WINDOW_S);
        return series
          ? {
              id,
              series,
              seriesList: [series],
              stats: seriesStats(series.samples, {
                harmonic: series.harmonicMean,
              }),
            }
          : null;
      }).filter((c): c is StackedChart => c !== null),
    [points],
  );

  if (expanded) {
    return (
      <ChartDetail
        points={points}
        initialMetrics={expanded}
        onBack={onCollapse}
      />
    );
  }

  return (
    <div className="space-y-5">
      <RouteMap points={points} hoverT={hoverT} />

      {charts.length === 0 ? (
        <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
          Aucune donnée traçable sur cette séance.
        </p>
      ) : (
        charts.map(({ id, series, seriesList, stats }) => (
          <section key={id} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
                <span className="font-normal text-muted-foreground">
                  ({series.unit})
                </span>
              </h3>
              <div className="flex items-baseline gap-3">
                {stats && (
                  <SeriesSummary stats={stats} format={series.format} />
                )}
                <button
                  type="button"
                  onClick={() => onExpand([id])}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Maximize2 className="h-3 w-3" />
                  Agrandir
                </button>
              </div>
            </div>

            {id === "pace" && paceSmoothed && (
              <p className="text-xs text-muted-foreground">
                Donnée recalculée : allure dérivée de la distance cumulée,
                moyenne glissante sur {DEFAULT_PACE_WINDOW_S} s.
              </p>
            )}

            <TrackChart
              series={seriesList}
              xAxis="time"
              hoverT={hoverT}
              onHoverT={setHoverT}
            />
          </section>
        ))
      )}
    </div>
  );
}
