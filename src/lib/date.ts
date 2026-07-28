import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";

export const TIMEZONE = "Europe/Paris";

// A "day key" is the canonical YYYY-MM-DD string identifying a calendar day.
// Stored DB dates are UTC midnight of the day they represent.

export function todayKey(): string {
  const now = new Date();
  const paris = new Date(
    now.toLocaleString("en-US", { timeZone: TIMEZONE }),
  );
  return format(paris, "yyyy-MM-dd");
}

export function dayKeyFromDate(date: Date): string {
  // The stored Date is UTC midnight; we read its UTC components.
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayKeyToDate(dayKey: string): Date {
  // Parse YYYY-MM-DD into a UTC-midnight Date.
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function dayKeyFromYMD(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

// "month key": YYYY-MM
export function todayMonthKey(): string {
  return todayKey().slice(0, 7);
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    const t = todayMonthKey();
    const [ty, tm] = t.split("-").map(Number);
    return { year: ty, month: tm };
  }
  return { year: y, month: m };
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const { year, month } = parseMonthKey(monthKey);
  const ref = new Date(year, month - 1, 1);
  const shifted = delta >= 0 ? addMonths(ref, delta) : subMonths(ref, -delta);
  return formatMonthKey(shifted.getFullYear(), shifted.getMonth() + 1);
}

export function monthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const ref = new Date(year, month - 1, 1);
  return format(ref, "LLLL yyyy", { locale: fr });
}

// Calendar grid model: 6 weeks x 7 days, week starts Monday.
export interface CalendarDay {
  dayKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface CalendarWeek {
  isoWeek: number;
  days: CalendarDay[];
}

export interface CalendarGridModel {
  monthKey: string;
  year: number;
  month: number; // 1-12
  rangeStartKey: string;
  rangeEndKey: string;
  weeks: CalendarWeek[];
}

export function buildCalendarGrid(monthKey: string): CalendarGridModel {
  const { year, month } = parseMonthKey(monthKey);
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = endOfMonth(firstOfMonth);

  const rangeStart = startOfWeek(firstOfMonth, { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(lastOfMonth, { weekStartsOn: 1 });

  const today = todayKey();
  const weeks: CalendarWeek[] = [];
  let cursor = rangeStart;
  while (cursor <= rangeEnd) {
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(cursor, i);
      const key = dayKeyFromYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
      days.push({
        dayKey: key,
        dayNumber: d.getDate(),
        isCurrentMonth: isSameMonth(d, firstOfMonth),
        isToday: key === today,
      });
    }
    weeks.push({
      isoWeek: getISOWeek(cursor),
      days,
    });
    cursor = addDays(cursor, 7);
  }

  return {
    monthKey: formatMonthKey(year, month),
    year,
    month,
    rangeStartKey: dayKeyFromYMD(
      rangeStart.getFullYear(),
      rangeStart.getMonth() + 1,
      rangeStart.getDate(),
    ),
    rangeEndKey: dayKeyFromYMD(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth() + 1,
      rangeEnd.getDate(),
    ),
    weeks,
  };
}

export function formatDayLong(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return format(date, "EEEE d MMMM yyyy", { locale: fr });
}

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Re-export for callers that want raw parse helpers without pulling date-fns.
export { parse, format };
