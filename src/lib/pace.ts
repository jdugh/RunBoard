// Allure (pace) is expressed as "mm:ss" per kilometer.
// Internally we convert to seconds-per-km for comparisons.

const PACE_REGEX = /^(\d{1,2}):([0-5]\d)$/;

export function isValidPace(value: string): boolean {
  return PACE_REGEX.test(value.trim());
}

export function paceToSeconds(value: string): number | null {
  const m = value.trim().match(PACE_REGEX);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function secondsToPace(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatPace(value: string): string {
  // Accept "m:ss" or "mm:ss"; output normalized "m:ss".
  if (!isValidPace(value)) return value;
  const [m, s] = value.trim().split(":");
  return `${Number(m)}:${s}`;
}
