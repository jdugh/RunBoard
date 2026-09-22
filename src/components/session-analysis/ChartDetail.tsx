"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_PACE_WINDOW_S,
  PACE_WINDOW_OPTIONS,
  seriesStats,
} from "@/lib/track-analysis";
import {
  MAX_OVERLAY_SERIES,
  METRICS,
  METRIC_ORDER,
  xAxisLabel,
  type MetricId,
  type XAxisKey,
} from "@/lib/track-metrics";
import type { TrackPoint } from "@/lib/track";

import { SeriesSummary } from "./SeriesSummary";
import { TrackChart, type ChartSeriesInput } from "./TrackChart";
import { buildChartSeries, isPaceSmoothed } from "./build-series";

interface ChartDetailProps {
  points: TrackPoint[];
  // Metrics pre-selected on open — the chart the reader clicked "Agrandir" on.
  initialMetrics: MetricId[];
  onBack: () => void;
}

// Two y-scales on one frame is the reason this view exists — reading pace
// against heart rate is the whole point — but it only stays legible while
// there are two. A third unit switches to stacked panels sharing the x-axis
// rather than cramming a third scale into the same frame.
type Layout = "overlay" | "stacked";

export function ChartDetail({
  points,
  initialMetrics,
  onBack,
}: ChartDetailProps) {
  const [selected, setSelected] = useState<MetricId[]>(initialMetrics);
  const [xAxis, setXAxis] = useState<XAxisKey>("time");
  const [paceWindowS, setPaceWindowS] = useState<number>(
    DEFAULT_PACE_WINDOW_S,
  );
  const [layout, setLayout] = useState<Layout>("overlay");
  // Shared across the stacked panels, exactly as in the overview.
  const [hoverT, setHoverT] = useState<number | null>(null);

  const paceSmoothed = useMemo(() => isPaceSmoothed(points), [points]);

  // Only metrics this particular track actually recorded are offered.
  const available = useMemo(
    () =>
      METRIC_ORDER.filter(
        (id) => buildChartSeries(id, points, paceWindowS) !== null,
      ),
    [points, paceWindowS],
  );

  const series = useMemo(
    () =>
      selected
        .map((id) => buildChartSeries(id, points, paceWindowS))
        .filter((s): s is ChartSeriesInput => s !== null),
    [selected, points, paceWindowS],
  );

  const units = useMemo(
    () => Array.from(new Set(series.map((s) => s.axisKey))),
    [series],
  );

  // One stable single-element array per series: a fresh literal on each render
  // would make every stacked panel re-resolve its samples on every hover.
  const singles = useMemo(() => series.map((s) => [s]), [series]);
  // Three scales cannot share one frame, so the layout falls back on its own
  // and the caption below says why.
  const effectiveLayout: Layout =
    layout === "overlay" && units.length > 2 ? "stacked" : layout;

  const toggle = (id: MetricId) =>
    setSelected((current) => {
      if (current.includes(id)) return current.filter((m) => m !== id);
      if (current.length >= MAX_OVERLAY_SERIES) return current;
      return [...current, id];
    });

  // Two metrics sharing a colour must never be on screen together: the palette
  // only guarantees four mutually distinguishable hues.
  const takenColors = new Set(selected.map((id) => METRICS[id].color));

  const disabledReason = (id: MetricId): string | null => {
    if (selected.includes(id)) return null;
    if (selected.length >= MAX_OVERLAY_SERIES)
      return `Maximum ${MAX_OVERLAY_SERIES} courbes`;
    if (takenColors.has(METRICS[id].color))
      return "Une autre courbe utilise déjà cette couleur";
    return null;
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux graphiques
      </button>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <Control label="Courbes">
          <div className="flex flex-wrap gap-1.5">
            {available.map((id) => {
              const metric = METRICS[id];
              const active = selected.includes(id);
              const reason = disabledReason(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  disabled={reason !== null}
                  aria-pressed={active}
                  title={reason ?? undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    active
                      ? "border-foreground/30 bg-muted font-medium"
                      : "hover:bg-muted/60",
                    reason !== null && "cursor-not-allowed opacity-40",
                  )}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: active ? metric.color : "transparent",
                      boxShadow: active
                        ? undefined
                        : `inset 0 0 0 1.5px ${metric.color}`,
                    }}
                  />
                  {metric.label}
                </button>
              );
            })}
          </div>
        </Control>

        <Control label="Axe horizontal">
          <Segmented
            options={[
              { value: "time", label: "Temps" },
              { value: "distance", label: "Distance" },
            ]}
            value={xAxis}
            onChange={(v) => setXAxis(v as XAxisKey)}
          />
        </Control>

        <Control label="Disposition">
          <Segmented
            options={[
              { value: "overlay", label: "Superposé" },
              { value: "stacked", label: "Empilé" },
            ]}
            value={layout}
            onChange={(v) => setLayout(v as Layout)}
          />
        </Control>

        {paceSmoothed && selected.includes("pace") && (
          <Control label="Lissage allure">
            <Segmented
              options={PACE_WINDOW_OPTIONS.map((w) => ({
                value: String(w),
                label: `${w} s`,
              }))}
              value={String(paceWindowS)}
              onChange={(v) => setPaceWindowS(Number(v))}
            />
          </Control>
        )}
      </div>

      {series.length > 0 && <Legend series={series} />}

      {series.length === 0 ? (
        <p className="rounded-md border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Sélectionnez au moins une courbe.
        </p>
      ) : effectiveLayout === "overlay" ? (
        <TrackChart
          series={series}
          xAxis={xAxis}
          height={440}
          hoverT={hoverT}
          onHoverT={setHoverT}
        />
      ) : (
        <div className="space-y-3">
          {series.map((s, i) => (
            <div key={s.id}>
              <p className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label} ({s.unit})
              </p>
              <TrackChart
                series={singles[i]}
                xAxis={xAxis}
                height={Math.max(130, 440 / series.length)}
                hoverT={hoverT}
                onHoverT={setHoverT}
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Axe horizontal : {xAxisLabel(xAxis).toLowerCase()}.</p>
        {effectiveLayout === "overlay" && units.length === 2 && (
          <p>
            Deux échelles : {axisCaption(series, units[0])} à gauche,{" "}
            {axisCaption(series, units[1])} à droite. Les hauteurs des deux
            courbes ne se comparent donc pas entre elles — seules leurs formes
            se comparent.
          </p>
        )}
        {layout === "overlay" && units.length > 2 && (
          <p>
            Trois unités différentes ne tiennent pas sur un seul cadre :
            affichage empilé, axe horizontal commun.
          </p>
        )}
        {paceSmoothed && selected.includes("pace") && (
          <p>
            Allure recalculée depuis la distance cumulée, moyenne glissante sur{" "}
            {paceWindowS} s : cet import ne contient pas la vitesse seconde par
            seconde.
          </p>
        )}
      </div>
    </div>
  );
}

function axisCaption(series: ChartSeriesInput[], axisKey: string): string {
  const owners = series.filter((s) => s.axisKey === axisKey);
  return `${owners.map((s) => s.label).join(" / ")} (${owners[0]?.unit ?? ""})`;
}

// Doubles as the legend and the per-series min/moy/max readout.
function Legend({ series }: { series: ChartSeriesInput[] }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
      {series.map((s) => {
        const stats = seriesStats(s.samples, { harmonic: s.harmonicMean });
        return (
          <li key={s.id} className="flex items-baseline gap-2">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-muted-foreground">
                {s.label} ({s.unit})
              </span>
            </span>
            {stats && <SeriesSummary stats={stats} format={s.format} />}
          </li>
        );
      })}
    </ul>
  );
}

function Control({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-md border p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded px-2.5 py-1 text-xs transition-colors",
            value === option.value
              ? "bg-muted font-medium"
              : "text-muted-foreground hover:bg-muted/60",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
