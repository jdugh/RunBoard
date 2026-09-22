"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { decimate, type SeriesSample } from "@/lib/track-analysis";
import {
  formatX,
  formatXTick,
  xValue,
  type XAxisKey,
} from "@/lib/track-metrics";

export interface ChartSeriesInput {
  id: string;
  label: string;
  color: string;
  unit: string;
  // Series sharing an axisKey share a y-axis and its scale.
  axisKey: string;
  invert?: boolean;
  area?: boolean;
  // Average as a harmonic mean rather than arithmetic — see seriesStats.
  harmonicMean?: boolean;
  // Clamp the axis to the 2nd–98th percentile. Used for pace, where a couple
  // of near-stopped seconds would otherwise flatten the whole run.
  robustDomain?: boolean;
  // Preferred tick spacings, for axes that read in mm:ss rather than decimals.
  tickSteps?: number[];
  format: (value: number) => string;
  samples: SeriesSample[];
}

interface TrackChartProps {
  series: ChartSeriesInput[];
  xAxis: XAxisKey;
  height?: number;
  className?: string;
  // Hover is shared across every chart of a session (and the map) by passing
  // the hovered instant around, in seconds from the start. Time is the common
  // currency: it identifies the same moment whichever axis a chart is drawn
  // against. Pass `undefined` to leave the chart self-contained.
  hoverT?: number | null;
  onHoverT?: (t: number | null) => void;
  // Drawn resolution. Tooltips always read the full-resolution samples, so
  // decimation only lightens the path, it never hides a value from the reader.
  maxDrawnPoints?: number;
}

// Chart chrome, one step off the white surface so the data stays the loud part.
const GRID = "#e1e0d9";
const AXIS = "#c3c2b7";
const MUTED_INK = "#898781";
const SURFACE = "#ffffff";

const PAD_TOP = 14;
const PAD_BOTTOM = 26;
const AXIS_WIDTH = 46;

const DECIMAL_STEPS = [1, 2, 2.5, 5, 10];

interface Scale {
  lo: number;
  hi: number;
  ticks: number[];
  invert: boolean;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * p)),
  );
  return sorted[idx];
}

// Tukey fences: the quartile box widened by 1.5 IQR. On a pace axis the full
// range would be dominated by the few seconds spent stopped at a crossing,
// squeezing the whole run into the top of the frame. The fences self-adjust —
// a steady run gets a tight axis, an interval session a wide one — and the
// rare sample outside them runs along the frame edge, where its exact value
// is still one hover away.
function robustDomainOf(sorted: number[]): { lo: number; hi: number } {
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const fence = 1.5 * (q3 - q1);
  return {
    lo: Math.max(sorted[0], q1 - fence),
    hi: Math.min(sorted[sorted.length - 1], q3 + fence),
  };
}

// Rounds a domain outward to the nearest "nice" step and lists the ticks
// inside it. `steps` lets a minutes:seconds axis snap to 15/30/60 s instead of
// the decimal 1/2/5 ladder.
function buildScale(
  values: number[],
  {
    invert = false,
    robust = false,
    steps = DECIMAL_STEPS,
    targetTicks = 4,
  }: {
    invert?: boolean;
    robust?: boolean;
    steps?: number[];
    targetTicks?: number;
  },
): Scale {
  if (values.length === 0) {
    return { lo: 0, hi: 1, ticks: [0, 1], invert };
  }

  const sorted = [...values].sort((a, b) => a - b);
  let { lo, hi } = robust ? robustDomainOf(sorted) : {
    lo: sorted[0],
    hi: sorted[sorted.length - 1],
  };

  if (hi - lo < 1e-6) {
    lo -= 1;
    hi += 1;
  }

  const rawStep = (hi - lo) / targetTicks;
  const step = niceStep(rawStep, steps);

  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;

  const ticks: number[] = [];
  // Guard against a pathological step producing a runaway loop.
  for (let v = lo; v <= hi + step / 2 && ticks.length < 12; v += step) {
    ticks.push(Number(v.toFixed(6)));
  }

  return { lo, hi, ticks, invert };
}

function niceStep(raw: number, steps: number[]): number {
  if (raw <= 0) return 1;
  // A fixed ladder (seconds-per-km axes) is used as-is; a decimal ladder gets
  // scaled to the right power of ten first.
  if (steps !== DECIMAL_STEPS) {
    for (const s of steps) {
      if (raw <= s) return s;
    }
    return steps[steps.length - 1];
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const s of steps) {
    if (raw <= s * magnitude) return s * magnitude;
  }
  return 10 * magnitude;
}

interface Projected {
  x: number; // position on the active axis (seconds or meters)
  t: number; // always seconds, so hover can be shared between charts
  y: number | null;
}

interface ResolvedSeries extends ChartSeriesInput {
  drawn: Projected[];
  lookup: Projected[];
}

export function TrackChart({
  series,
  xAxis,
  height = 170,
  className,
  hoverT,
  onHoverT,
  maxDrawnPoints = 900,
}: TrackChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clipId = useClipId();
  const [width, setWidth] = useState(0);
  // Only used when the caller does not drive the hover itself.
  const [localT, setLocalT] = useState<number | null>(null);
  const activeT = hoverT !== undefined ? hoverT : localT;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Two axes at most: the first two distinct axisKeys take the left and right
  // gutters. Callers cap the picker so a third never reaches here.
  const axisKeys = useMemo(() => {
    const keys: string[] = [];
    for (const s of series) {
      if (!keys.includes(s.axisKey)) keys.push(s.axisKey);
    }
    return keys.slice(0, 2);
  }, [series]);

  const padLeft = AXIS_WIDTH;
  const padRight = axisKeys.length > 1 ? AXIS_WIDTH : 12;
  const plotWidth = Math.max(0, width - padLeft - padRight);
  const plotHeight = Math.max(0, height - PAD_TOP - PAD_BOTTOM);

  const resolved = useMemo<ResolvedSeries[]>(() => {
    return series.map((s) => {
      const toXY = (samples: SeriesSample[]) => {
        const out: Projected[] = [];
        for (const sample of samples) {
          const x = xValue(sample, xAxis);
          if (x === null) continue;
          out.push({ x, t: sample.t, y: sample.y });
        }
        return out;
      };
      return {
        ...s,
        drawn: toXY(decimate(s.samples, maxDrawnPoints)),
        lookup: toXY(s.samples),
      };
    });
  }, [series, xAxis, maxDrawnPoints]);

  const xDomain = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of resolved) {
      for (const p of s.lookup) {
        if (p.x < lo) lo = p.x;
        if (p.x > hi) hi = p.x;
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
      return { lo: 0, hi: 1 };
    }
    return { lo, hi };
  }, [resolved]);

  const scales = useMemo(() => {
    const map = new Map<string, Scale>();
    for (const key of axisKeys) {
      const members = resolved.filter((s) => s.axisKey === key);
      const values: number[] = [];
      for (const s of members) {
        for (const p of s.lookup) {
          if (p.y !== null) values.push(p.y);
        }
      }
      map.set(
        key,
        buildScale(values, {
          invert: members[0]?.invert,
          robust: members[0]?.robustDomain,
          steps: members[0]?.tickSteps,
        }),
      );
    }
    return map;
  }, [axisKeys, resolved]);

  const xScale = useCallback(
    (x: number) =>
      padLeft +
      ((x - xDomain.lo) / (xDomain.hi - xDomain.lo)) * plotWidth,
    [padLeft, plotWidth, xDomain],
  );

  const yScale = useCallback(
    (value: number, scale: Scale) => {
      const ratio = (value - scale.lo) / (scale.hi - scale.lo);
      const fromTop = scale.invert ? ratio : 1 - ratio;
      return PAD_TOP + fromTop * plotHeight;
    },
    [plotHeight],
  );

  // Resolves the shared instant to one sample per series, for the readout. A
  // chart whose own series stop before `activeT` (a dropout, or a shorter
  // series) simply reports "--" rather than snapping to a distant value.
  const hovered = useMemo(() => {
    if (activeT === null) return null;

    const rows = resolved.map((s) => ({
      series: s,
      point: nearestByT(s.lookup, activeT),
    }));
    const anchor = rows.find((r) => r.point)?.point;
    if (!anchor) return null;
    return { x: anchor.x, t: anchor.t, rows };
  }, [activeT, resolved]);

  // Pointer position -> the instant under it, published to whoever listens.
  const reportHoverAt = useCallback(
    (clientOffsetX: number | null) => {
      let next: number | null = null;

      if (clientOffsetX !== null && plotWidth > 0) {
        const ratio = (clientOffsetX - padLeft) / plotWidth;
        if (ratio >= 0 && ratio <= 1) {
          const targetX = xDomain.lo + ratio * (xDomain.hi - xDomain.lo);
          for (const s of resolved) {
            const point = nearestByX(s.lookup, targetX);
            if (point) {
              next = point.t;
              break;
            }
          }
        }
      }

      setLocalT(next);
      onHoverT?.(next);
    },
    [onHoverT, padLeft, plotWidth, resolved, xDomain],
  );

  if (width === 0) {
    return (
      <div
        ref={containerRef}
        className={cn("w-full min-w-0", className)}
        style={{ height }}
      />
    );
  }

  const xTicks = buildXTicks(xDomain.lo, xDomain.hi, plotWidth);
  const baselineY = PAD_TOP + plotHeight;

  return (
    // `min-w-0` plus the SVG's own `max-width` keep the measured width from
    // feeding back into the layout: inside a CSS grid (which the dialog is), a
    // fixed-width SVG would otherwise count as the column's minimum size and
    // hold the whole modal open wider than its max-width.
    <div ref={containerRef} className={cn("relative w-full min-w-0", className)}>
      <svg
        width={width}
        height={height}
        style={{ display: "block", maxWidth: "100%" }}
        role="img"
        aria-label={`Graphique : ${series.map((s) => s.label).join(", ")}`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          reportHoverAt(e.clientX - rect.left);
        }}
        onPointerLeave={() => reportHoverAt(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={padLeft}
              y={PAD_TOP}
              width={plotWidth}
              height={plotHeight}
            />
          </clipPath>
        </defs>

        {/* Horizontal gridlines come from the left axis only: a second set
            from the right axis would draw a lattice that means nothing. */}
        {(scales.get(axisKeys[0])?.ticks ?? []).map((tick) => {
          const y = yScale(tick, scales.get(axisKeys[0]) as Scale);
          if (y < PAD_TOP - 0.5 || y > baselineY + 0.5) return null;
          return (
            <line
              key={`grid-${tick}`}
              x1={padLeft}
              x2={padLeft + plotWidth}
              y1={y}
              y2={y}
              stroke={GRID}
              strokeWidth={1}
            />
          );
        })}

        <line
          x1={padLeft}
          x2={padLeft + plotWidth}
          y1={baselineY}
          y2={baselineY}
          stroke={AXIS}
          strokeWidth={1}
        />

        {xTicks.map((tick) => (
          <text
            key={`xt-${tick}`}
            x={xScale(tick)}
            y={height - 8}
            textAnchor="middle"
            fontSize={10}
            fill={MUTED_INK}
          >
            {formatXTick(tick, xAxis)}
          </text>
        ))}

        {axisKeys.map((key, axisIndex) => {
          const scale = scales.get(key);
          if (!scale) return null;
          const owner = resolved.find((s) => s.axisKey === key);
          return scale.ticks.map((tick) => {
            const y = yScale(tick, scale);
            if (y < PAD_TOP - 0.5 || y > baselineY + 0.5) return null;
            return (
              <text
                key={`yt-${key}-${tick}`}
                x={axisIndex === 0 ? padLeft - 8 : padLeft + plotWidth + 8}
                y={y + 3}
                textAnchor={axisIndex === 0 ? "end" : "start"}
                fontSize={10}
                fill={MUTED_INK}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {owner ? owner.format(tick) : tick}
              </text>
            );
          });
        })}

        <g clipPath={`url(#${clipId})`}>
          {resolved.map((s) => {
            const scale = scales.get(s.axisKey);
            if (!scale) return null;
            const project = (p: Projected) =>
              p.y === null
                ? null
                : { x: xScale(p.x), y: yScale(p.y, scale) };

            return (
              <g key={s.id}>
                {s.area && (
                  <path
                    d={areaPath(s.drawn, project, baselineY)}
                    fill={s.color}
                    fillOpacity={0.1}
                  />
                )}
                <path
                  d={linePath(s.drawn, project)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </g>

        {hovered && (
          <g pointerEvents="none">
            <line
              x1={xScale(hovered.x)}
              x2={xScale(hovered.x)}
              y1={PAD_TOP}
              y2={baselineY}
              stroke={AXIS}
              strokeWidth={1}
            />
            {hovered.rows.map(({ series: s, point }) => {
              const scale = scales.get(s.axisKey);
              if (!scale || !point || point.y === null) return null;
              return (
                <circle
                  key={`dot-${s.id}`}
                  cx={xScale(point.x)}
                  cy={yScale(point.y, scale)}
                  r={4}
                  fill={s.color}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              );
            })}
          </g>
        )}
      </svg>

      {hovered && (
        <Tooltip
          x={xScale(hovered.x)}
          containerWidth={width}
          header={formatX(hovered.x, xAxis)}
          rows={hovered.rows}
        />
      )}
    </div>
  );
}

function Tooltip({
  x,
  containerWidth,
  header,
  rows,
}: {
  x: number;
  containerWidth: number;
  header: string;
  rows: { series: ResolvedSeries; point: Projected | null }[];
}) {
  // Flip to the left of the cursor when there is not enough room on the right.
  const flip = x > containerWidth - 150;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-[7.5rem] rounded-md border bg-background/95 px-2 py-1.5 text-xs shadow-sm"
      style={
        flip
          ? { right: Math.max(4, containerWidth - x + 10) }
          : { left: Math.min(containerWidth - 130, x + 10) }
      }
    >
      <p className="mb-1 font-medium tabular-nums text-muted-foreground">
        {header}
      </p>
      <ul className="space-y-0.5">
        {rows.map(({ series: s, point }) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="ml-auto pl-2 font-medium tabular-nums">
              {point?.y != null ? `${s.format(point.y)} ${s.unit}` : "--"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Breaks the path wherever a sample is null, so a GPS or sensor dropout reads
// as a gap instead of a straight line across it.
function linePath(
  points: Projected[],
  project: (p: Projected) => { x: number; y: number } | null,
): string {
  let d = "";
  let pen = false;
  for (const point of points) {
    const projected = project(point);
    if (!projected) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${projected.x.toFixed(1)} ${projected.y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

function areaPath(
  points: Projected[],
  project: (p: Projected) => { x: number; y: number } | null,
  baselineY: number,
): string {
  let d = "";
  let run: { x: number; y: number }[] = [];

  const flush = () => {
    if (run.length < 2) {
      run = [];
      return;
    }
    d += `M${run[0].x.toFixed(1)} ${baselineY.toFixed(1)}`;
    for (const p of run) d += `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    d += `L${run[run.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)}Z`;
    run = [];
  };

  for (const point of points) {
    const projected = project(point);
    if (!projected) flush();
    else run.push(projected);
  }
  flush();
  return d;
}

function nearestByT(points: Projected[], target: number): Projected | null {
  return nearestBy(points, target, (p) => p.t);
}

function nearestByX(points: Projected[], target: number): Projected | null {
  return nearestBy(points, target, (p) => p.x);
}

// Binary search over a monotonically increasing key. Both `x` and `t` are
// chronological, so the same search serves either.
function nearestBy(
  points: Projected[],
  target: number,
  key: (p: Projected) => number,
): Projected | null {
  if (points.length === 0) return null;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (key(points[mid]) < target) lo = mid + 1;
    else hi = mid;
  }
  const candidate = points[lo];
  const previous = points[Math.max(0, lo - 1)];
  return Math.abs(key(previous) - target) < Math.abs(key(candidate) - target)
    ? previous
    : candidate;
}

// Roughly one label per 90px, snapped to a round value so the axis reads
// cleanly whatever the container width.
function buildXTicks(lo: number, hi: number, plotWidth: number): number[] {
  const count = Math.max(2, Math.min(8, Math.floor(plotWidth / 90)));
  const step = niceStep((hi - lo) / count, DECIMAL_STEPS);
  const ticks: number[] = [];
  for (
    let v = Math.ceil(lo / step) * step;
    v <= hi && ticks.length < 12;
    v += step
  ) {
    ticks.push(v);
  }
  return ticks;
}

// Local id generator: React's useId is fine, but the SVG clipPath reference
// must be a valid CSS url() token and React ids contain colons.
let idCounter = 0;
function useClipId(): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) ref.current = `track-clip-${++idCounter}`;
  return ref.current;
}
