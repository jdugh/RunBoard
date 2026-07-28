import type { CalendarDay } from "@/lib/date";
import type { SessionDTO } from "@/server/sessions";
import { cn } from "@/lib/utils";

import { AddSessionButton } from "./AddSessionButton";
import { SessionPill } from "./SessionPill";

interface CalendarDayCellProps {
  day: CalendarDay;
  sessions: SessionDTO[];
}

export function CalendarDayCell({ day, sessions }: CalendarDayCellProps) {
  return (
    <div
      className={cn(
        "min-h-[110px] border-r border-b p-1 flex flex-col gap-1",
        !day.isCurrentMonth && "bg-muted/40 text-muted-foreground",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium tabular-nums px-1",
            day.isToday &&
              "bg-primary text-primary-foreground rounded-full h-5 w-5 inline-flex items-center justify-center",
          )}
        >
          {day.dayNumber}
        </span>
        <AddSessionButton dayKey={day.dayKey} />
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {sessions.map((s) => (
          <SessionPill key={s.id} session={s} />
        ))}
      </div>
    </div>
  );
}
