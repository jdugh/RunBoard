import { sessionDurationMinutes } from "./duration";

export interface SessionForStats {
  dayKey: string;
  startTime: string;
  endTime: string;
  distanceKm: number;
  averageHeartRate: number;
}

export interface PeriodTotals {
  distanceKm: number;
  durationMinutes: number;
  sessionCount: number;
  // Time-weighted mean of the sessions' average heart rates, so a long run
  // counts more than a short one. null when no session carries a usable FC.
  averageHeartRate: number | null;
}

export function aggregate(sessions: SessionForStats[]): PeriodTotals {
  let distanceKm = 0;
  let durationMinutes = 0;
  let hrWeightedSum = 0;
  let hrWeight = 0;
  for (const s of sessions) {
    const minutes = sessionDurationMinutes(s.startTime, s.endTime);
    distanceKm += s.distanceKm;
    durationMinutes += minutes;
    if (s.averageHeartRate > 0) {
      // Zero-length sessions would otherwise carry no weight at all: fall back
      // to counting them once so their FC is not silently dropped.
      const weight = minutes > 0 ? minutes : 1;
      hrWeightedSum += s.averageHeartRate * weight;
      hrWeight += weight;
    }
  }
  return {
    distanceKm,
    durationMinutes,
    sessionCount: sessions.length,
    averageHeartRate: hrWeight > 0 ? Math.round(hrWeightedSum / hrWeight) : null,
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
