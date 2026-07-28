"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import { formatDistanceTotal } from "@/lib/format";
import { formatDurationFromMinutes } from "@/lib/duration";
import { monthLabel, shiftMonthKey, todayMonthKey } from "@/lib/date";
import type { PeriodTotals } from "@/lib/stats";
import type { UserDTO } from "@/server/users";

import { Button } from "@/components/ui/button";
import { UserSwitcher } from "@/components/user/UserSwitcher";
import { ImportButton } from "./ImportButton";

interface CalendarHeaderProps {
  monthKey: string;
  monthTotals: PeriodTotals;
  currentUser: UserDTO;
  users: UserDTO[];
}

export function CalendarHeader({
  monthKey,
  monthTotals,
  currentUser,
  users,
}: CalendarHeaderProps) {
  const prev = shiftMonthKey(monthKey, -1);
  const next = shiftMonthKey(monthKey, 1);
  const current = todayMonthKey();

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon" aria-label="Mois précédent">
          <Link href={`/?month=${prev}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold capitalize tracking-tight">
            {monthLabel(monthKey)}
          </h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {monthTotals.sessionCount === 0 ? (
              <span className="italic">Aucune séance ce mois-ci</span>
            ) : (
              <>
                {formatDistanceTotal(monthTotals.distanceKm)} ·{" "}
                {formatDurationFromMinutes(monthTotals.durationMinutes)} ·{" "}
                {monthTotals.sessionCount} séance
                {monthTotals.sessionCount > 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>
        <Button asChild variant="outline" size="icon" aria-label="Mois suivant">
          <Link href={`/?month=${next}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {monthKey !== current && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <CalendarDays className="h-4 w-4" />
              Aujourd&apos;hui
            </Link>
          </Button>
        )}
        <ImportButton />
        <UserSwitcher currentUser={currentUser} users={users} />
      </div>
    </header>
  );
}
