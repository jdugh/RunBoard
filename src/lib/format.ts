import { formatPace, secondsToPace } from "./pace";

const distanceFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const distanceFormatterTotal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatDistanceKm(km: number): string {
  return `${distanceFormatter.format(km)} km`;
}

export function formatDistanceTotal(km: number): string {
  return `${distanceFormatterTotal.format(km)} km`;
}

export function formatHeartRate(bpm: number): string {
  return `${Math.round(bpm)} bpm`;
}

// Allure stored as "mm:ss" per km, rendered with its unit.
export function formatPaceKm(pace: string): string {
  return `${formatPace(pace)}/km`;
}

export function formatPaceFromSeconds(secondsPerKm: number): string {
  return `${secondsToPace(secondsPerKm)}/km`;
}

export const RUN_TYPE_LABELS: Record<string, string> = {
  EF: "EF",
  FRACTIONNE: "Fractionné",
  SORTIE_LONGUE: "Sortie longue",
  EVOLUTIVE: "Évolutive",
  AUTRE: "Autre",
};

export function runTypeLabel(runType: string, customRunType?: string | null): string {
  if (runType === "AUTRE" && customRunType && customRunType.trim()) {
    return customRunType.trim();
  }
  return RUN_TYPE_LABELS[runType] ?? runType;
}
