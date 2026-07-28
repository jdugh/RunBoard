import { WEEKDAY_LABELS, type CalendarGridModel } from "@/lib/date";
import type { SessionDTO } from "@/server/sessions";
import { aggregateForWeek } from "@/lib/stats";

import { CalendarDayCell } from "./CalendarDayCell";
import { WeekStatsCell } from "./WeekStatsCell";

interface CalendarGridProps {
  grid: CalendarGridModel;
  sessions: SessionDTO[];
}

export function CalendarGrid({ grid, sessions }: CalendarGridProps) {
  // Group sessions by dayKey once for O(1) lookup per cell.
  const byDay = new Map<string, SessionDTO[]>();
  for (const s of sessions) {
    const arr = byDay.get(s.dayKey);
    if (arr) arr.push(s);
    else byDay.set(s.dayKey, [s]);
  }

  // Grid layout: [week#][Mon][Tue][Wed][Thu][Fri][Sat][Sun][stats]  → 9 columns
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div
        className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))_7rem] border-b text-xs font-medium"
        aria-label="En-tête du calendrier"
      >
        <div className="border-r p-2 text-center text-muted-foreground">
          Sem.
        </div>
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r p-2 text-center text-muted-foreground"
          >
            {label}
          </div>
        ))}
        <div className="p-2 text-center text-muted-foreground">
          Total semaine
        </div>
      </div>

      {grid.weeks.map((week, weekIdx) => {
        const totals = aggregateForWeek(
          sessions,
          week.days.map((d) => d.dayKey),
        );
        return (
          <div
            key={weekIdx}
            className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))_7rem]"
          >
            <div className="border-r border-b p-2 flex items-center justify-center text-xs font-medium text-muted-foreground tabular-nums bg-muted/30">
              {week.isoWeek}
            </div>
            {week.days.map((day) => (
              <CalendarDayCell
                key={day.dayKey}
                day={day}
                sessions={byDay.get(day.dayKey) ?? []}
              />
            ))}
            <WeekStatsCell totals={totals} />
          </div>
        );
      })}
    </div>
  );
}
