import { buildCalendarGrid } from "@/lib/date";
import { getSessionsForRange } from "@/server/sessions";
import { aggregateForMonth } from "@/lib/stats";
import type { UserDTO } from "@/server/users";

import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";

interface CalendarViewProps {
  monthKey: string;
  currentUser: UserDTO;
  users: UserDTO[];
}

export async function CalendarView({
  monthKey,
  currentUser,
  users,
}: CalendarViewProps) {
  const grid = buildCalendarGrid(monthKey);
  const sessions = await getSessionsForRange(
    currentUser.id,
    grid.rangeStartKey,
    grid.rangeEndKey,
  );
  const monthTotals = aggregateForMonth(sessions, grid.year, grid.month);

  return (
    <div className="flex flex-col gap-4">
      <CalendarHeader
        monthKey={grid.monthKey}
        monthTotals={monthTotals}
        currentUser={currentUser}
        users={users}
      />
      <CalendarGrid grid={grid} sessions={sessions} />
    </div>
  );
}
