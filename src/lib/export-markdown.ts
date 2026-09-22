// Builds the markdown document handed to a chatbot (ChatGPT / Claude) so it can
// answer questions about the user's running sessions. Values are deliberately
// written with a dot decimal separator and plain units, which LLMs parse more
// reliably than the fr-FR display formatting used in the UI.

import { sessionDurationMinutes } from "./duration";
import { runTypeLabel } from "./format";
import type { ExportSessionDTO } from "@/server/sessions";

export interface ExportMeta {
  userName: string;
  // Inclusive bounds as day keys; null means unbounded on that side.
  rangeStartKey: string | null;
  rangeEndKey: string | null;
  generatedOnKey: string;
}

const WEEKDAYS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

function frDate(dayKey: string): string {
  const [y, m, d] = dayKey.split("-");
  return `${d}/${m}/${y}`;
}

function weekdayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

// Elapsed seconds of a session: the precise FIT duration when available, else
// the start/end difference used everywhere else in the app.
function durationSecondsOf(session: ExportSessionDTO): number {
  if (session.durationSeconds && session.durationSeconds > 0) {
    return session.durationSeconds;
  }
  return sessionDurationMinutes(session.startTime, session.endTime) * 60;
}

function formatHms(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function num(value: number, decimals = 0): string {
  return value.toFixed(decimals);
}

// A markdown table cell must never contain a raw pipe or newline, or the row
// breaks apart.
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value)
    .replace(/\|/g, String.raw`\|`)
    .replace(/\s*\r?\n\s*/g, " ");
}

const COLUMNS = [
  "Date",
  "Jour",
  "Début",
  "Fin",
  "Type",
  "Distance (km)",
  "Durée (h:mm:ss)",
  "Allure moy. (min/km)",
  "Allure max (min/km)",
  "FC moy. (bpm)",
  "FC max (bpm)",
  "Cadence moy. (ppm)",
  "D+ (m)",
  "D- (m)",
  "Calories (kcal)",
  "Commentaire",
] as const;

function periodLabel(meta: ExportMeta): string {
  if (!meta.rangeStartKey && !meta.rangeEndKey) return "toutes les données";
  if (meta.rangeStartKey && meta.rangeEndKey) {
    return `du ${frDate(meta.rangeStartKey)} au ${frDate(meta.rangeEndKey)}`;
  }
  if (meta.rangeStartKey) return `depuis le ${frDate(meta.rangeStartKey)}`;
  return `jusqu'au ${frDate(meta.rangeEndKey as string)}`;
}

export function buildSessionsMarkdown(
  sessions: ExportSessionDTO[],
  meta: ExportMeta,
): string {
  // Totals are recomputed here rather than reused from lib/stats so they stay
  // consistent with the per-row durations printed in the table (which prefer
  // the precise FIT duration over the start/end difference).
  let totalKm = 0;
  let totalSeconds = 0;
  let hrWeightedSum = 0;
  let hrWeight = 0;

  const rows = sessions.map((session) => {
    const seconds = durationSecondsOf(session);
    totalKm += session.distanceKm;
    totalSeconds += seconds;
    if (session.averageHeartRate > 0) {
      const weight = seconds > 0 ? seconds : 1;
      hrWeightedSum += session.averageHeartRate * weight;
      hrWeight += weight;
    }

    return [
      session.dayKey,
      weekdayLabel(session.dayKey),
      session.startTime,
      session.endTime,
      runTypeLabel(session.runType, session.customRunType),
      num(session.distanceKm, 2),
      formatHms(seconds),
      session.averagePace,
      session.maxPace,
      session.averageHeartRate || "",
      session.maxHeartRate || "",
      session.avgCadenceSpm,
      session.elevationGainM,
      session.elevationLossM,
      session.calories,
      session.comment,
    ].map(cell);
  });

  const averageHeartRate =
    hrWeight > 0 ? Math.round(hrWeightedSum / hrWeight) : null;
  const averagePaceSeconds =
    totalKm > 0 && totalSeconds > 0 ? totalSeconds / totalKm : null;

  const lines: string[] = [];
  lines.push(`# Séances de course à pied — ${meta.userName}`);
  lines.push("");
  lines.push(`- Période : ${periodLabel(meta)}`);
  lines.push(`- Nombre de séances : ${sessions.length}`);
  lines.push(`- Distance totale : ${num(totalKm, 2)} km`);
  lines.push(`- Durée totale : ${formatHms(totalSeconds)}`);
  if (averagePaceSeconds !== null) {
    lines.push(
      `- Allure moyenne globale : ${formatPaceFromSeconds(averagePaceSeconds)} min/km`,
    );
  }
  if (averageHeartRate !== null) {
    lines.push(
      `- FC moyenne (pondérée par la durée) : ${averageHeartRate} bpm`,
    );
  }
  lines.push(`- Export généré le ${frDate(meta.generatedOnKey)}`);
  lines.push("");
  lines.push(`| ${COLUMNS.join(" | ")} |`);
  lines.push(`| ${COLUMNS.map(() => "---").join(" | ")} |`);
  for (const row of rows) {
    lines.push(`| ${row.join(" | ")} |`);
  }
  lines.push("");
  lines.push("## Notes de lecture");
  lines.push("");
  lines.push("- Les dates sont au format AAAA-MM-JJ, les heures en HH:mm (Europe/Paris).");
  lines.push("- Les allures sont en minutes:secondes par kilomètre : plus la valeur est petite, plus la course est rapide.");
  lines.push("- « D+ » et « D- » sont les dénivelés positif et négatif cumulés, en mètres.");
  lines.push("- Une cellule vide signifie que la donnée n'a pas été enregistrée pour cette séance.");
  lines.push("");

  return lines.join("\n");
}

function formatPaceFromSeconds(secondsPerKm: number): string {
  const safe = Math.round(secondsPerKm);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
