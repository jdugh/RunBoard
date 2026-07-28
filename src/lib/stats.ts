import { sessionDurationMinutes } from "./duration";

export interface SessionForStats {
  dayKey: string;
  startTime: string;
  endTime: string;
  distanceKm: number;
}

export interface PeriodTotals {
  distanceKm: number;
  durationMinutes: number;
  sessionCount: number;
}

export function aggregate(sessions: SessionForStats[]): PeriodTotals {
  let distanceKm = 0;
  let durationMinutes = 0;
  for (const s of sessions) {
    distanceKm += s.distanceKm;
    durationMinutes += sessionDurationMinutes(s.startTime, s.endTime);
  }
  return {
    distanceKm,
    durationMinutes,
    sessionCount: sessions.length,
  };
}

// dayKeys is the ordered list of YYYY-MM-DD strings for a single week row.
export function aggregateForWeek(
  sessions: SessionForStats[],
  dayKeys: string[],
): PeriodTotals {
  const set = new Set(dayKeys);
  return aggregate(sessions.filter((s) => set.has(s.dayKey)));
}

// Filters sessions whose dayKey falls within the given calendar month (1-12).
export function aggregateForMonth(
  sessions: SessionForStats[],
  year: number,
  month: number,
): PeriodTotals {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return aggregate(sessions.filter((s) => s.dayKey.startsWith(prefix)));
}
