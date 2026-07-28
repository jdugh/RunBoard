import { buildCalendarGrid } from "@/lib/date";
import { getSessionsForRange } from "@/server/sessions";
import { aggregateForMonth } from "@/lib/stats";

import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";

interface CalendarViewProps {
  monthKey: string;
}

export async function CalendarView({ monthKey }: CalendarViewProps) {
  const grid = buildCalendarGrid(monthKey);
  const sessions = await getSessionsForRange(grid.rangeStartKey, grid.rangeEndKey);
  const monthTotals = aggregateForMonth(sessions, grid.year, grid.month);

  return (
    <div className="flex flex-col gap-4">
      <CalendarHeader monthKey={grid.monthKey} monthTotals={monthTotals} />
      <CalendarGrid grid={grid} sessions={sessions} />
    </div>
  );
}
