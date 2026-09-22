"use client";

import { cn } from "@/lib/utils";
import type { SeriesStats } from "@/lib/track-analysis";

interface SeriesSummaryProps {
  stats: SeriesStats;
  format: (value: number) => string;
  unit?: string;
  className?: string;
}

// Min / moyenne / max for one series. Values are ordered numerically, which is
// also the right reading for pace: its smallest number is the fastest, the way
// the inverted axis already shows it.
export function SeriesSummary({
  stats,
  format,
  unit,
  className,
}: SeriesSummaryProps) {
  const entries: [string, number][] = [
    ["Min", stats.min],
    ["Moy", stats.avg],
    ["Max", stats.max],
  ];

  return (
    <dl
      className={cn(
        "flex shrink-0 items-baseline gap-3 text-xs text-muted-foreground",
        className,
      )}
    >
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1">
          <dt>{label}</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {format(value)}
          </dd>
        </div>
      ))}
      {unit && <span className="opacity-70">{unit}</span>}
    </dl>
  );
}
