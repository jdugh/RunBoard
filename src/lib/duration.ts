// Session start and end are stored as "HH:mm". A session may cross midnight,
// in which case end is interpreted as the next day.

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_REGEX.test(value.trim());
}

export function timeToMinutes(value: string): number | null {
  const m = value.trim().match(TIME_REGEX);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// Returns the elapsed minutes between two HH:mm times.
// If end < start, the session is considered to cross midnight and we add 24h.
// If end === start, returns 0 (callers should reject this if desired).
export function sessionDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return 0;
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function formatDurationFromMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export function formatDurationCompact(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

// Clock rendering for second-precision durations coming from an imported
// track: "8:28" under an hour, "1:05:01" past it. Distinct from the
// minute-based helpers above, which are for hand-entered sessions.
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h === 0) return `${m}:${String(s).padStart(2, "0")}`;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
