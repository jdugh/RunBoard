import {
  formatDistanceTotal,
  formatHeartRate,
  formatPaceFromSeconds,
} from "@/lib/format";
import { formatDurationCompact } from "@/lib/duration";
import type { PeriodTotals } from "@/lib/stats";

interface WeekStatsCellProps {
  totals: PeriodTotals;
}

export function WeekStatsCell({ totals }: WeekStatsCellProps) {
  const empty = totals.sessionCount === 0;
  return (
    <div className="min-h-[5rem] border-b p-2 bg-muted/30 flex flex-col justify-center gap-0.5 text-[11px] leading-tight">
      {empty ? (
        <span className="text-muted-foreground italic">—</span>
      ) : (
        <>
          <Stat label="Dist." value={formatDistanceTotal(totals.distanceKm)} />
          <Stat
            label="Durée"
            value={formatDurationCompact(totals.durationMinutes)}
          />
          {totals.averagePaceSeconds !== null && (
            <Stat
              label="Allure"
              value={formatPaceFromSeconds(totals.averagePaceSeconds)}
            />
          )}
          {totals.averageHeartRate !== null && (
            <Stat
              label="FC"
              value={formatHeartRate(totals.averageHeartRate)}
            />
          )}
        </>
      )}
    </div>
  );
}

// Label left, value right — one line per stat so the week column stays short.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
