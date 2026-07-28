import { formatDistanceTotal } from "@/lib/format";
import { formatDurationFromMinutes } from "@/lib/duration";
import type { PeriodTotals } from "@/lib/stats";

interface WeekStatsCellProps {
  totals: PeriodTotals;
}

export function WeekStatsCell({ totals }: WeekStatsCellProps) {
  const empty = totals.sessionCount === 0;
  return (
    <div className="min-h-[110px] border-b p-2 bg-muted/30 flex flex-col justify-center gap-1 text-xs">
      {empty ? (
        <span className="text-muted-foreground italic">—</span>
      ) : (
        <>
          <div>
            <div className="text-muted-foreground">Distance</div>
            <div className="font-semibold tabular-nums">
              {formatDistanceTotal(totals.distanceKm)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Durée</div>
            <div className="font-semibold tabular-nums">
              {formatDurationFromMinutes(totals.durationMinutes)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
