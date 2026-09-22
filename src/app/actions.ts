"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  dayKeyToDate,
  endOfMonthDayKey,
  shiftDayKeyByMonths,
  startOfMonthDayKey,
  todayKey,
} from "@/lib/date";
import {
  sessionInputSchema,
  importExtrasSchema,
  exportRangeSchema,
  type ExportRangeInput,
} from "@/server/validation";
import { parseFitActivity } from "@/lib/fit";
import {
  activityToDraft,
  activityToExtras,
  type ImportedSessionDraft,
  type ImportExtras,
} from "@/lib/fit-to-session";
import { extractFit, externalIdFromFileName } from "@/lib/import-file";
import { getCurrentUser, requireCurrentUserId } from "@/server/current-user";
import { getSessionsForExport } from "@/server/sessions";
import { buildSessionsMarkdown } from "@/lib/export-markdown";

export interface ActionResult {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  error?: string;
}

export interface ExportResult {
  ok: boolean;
  markdown?: string;
  fileName?: string;
  sessionCount?: number;
  fieldErrors?: Record<string, string>;
  error?: string;
}

export interface ImportResult {
  ok: boolean;
  draft?: ImportedSessionDraft;
  extras?: ImportExtras;
  error?: string;
}

// Extracts the optional imported extras carried on the create payload under the
// `__import` key, validating them independently of the editable form fields.
function readExtras(input: unknown): ImportExtras | null {
  if (
    !input ||
    typeof input !== "object" ||
    !("__import" in input) ||
    !(input as { __import?: unknown }).__import
  ) {
    return null;
  }
  const parsed = importExtrasSchema.safeParse(
    (input as { __import: unknown }).__import,
  );
  return parsed.success ? parsed.data : null;
}

function flatten(error: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  ) {
    for (const issue of (error as { issues: { path: (string | number)[]; message: string }[] }).issues) {
      const path = issue.path.join(".") || "_";
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createSession(input: unknown): Promise<ActionResult> {
  const parsed = sessionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) };
  }
  const data = parsed.data;
  const extras = readExtras(input);
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    return { ok: false, error: "Aucun utilisateur sélectionné" };
  }
  try {
    await prisma.runningSession.create({
      data: {
        userId,
        date: dayKeyToDate(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        distanceKm: data.distanceKm,
        averageHeartRate: data.averageHeartRate,
        maxHeartRate: data.maxHeartRate,
        averagePace: data.averagePace,
        maxPace: data.maxPace,
        runType: data.runType,
        customRunType:
          data.runType === "AUTRE" ? data.customRunType?.trim() || null : null,
        comment: data.comment?.trim() || null,
        externalId: extras?.externalId ?? null,
        durationSeconds: extras?.durationSeconds ?? null,
        avgCadenceSpm: extras?.avgCadenceSpm ?? null,
        maxCadenceSpm: extras?.maxCadenceSpm ?? null,
        steps: extras?.steps ?? null,
        calories: extras?.calories ?? null,
        restingCalories: extras?.restingCalories ?? null,
        elevationGainM: extras?.elevationGainM ?? null,
        elevationLossM: extras?.elevationLossM ?? null,
        sweatLossMl: extras?.sweatLossMl ?? null,
        sport: extras?.sport ?? null,
        subSport: extras?.subSport ?? null,
        sportProfileName: extras?.sportProfileName ?? null,
        numLaps: extras?.numLaps ?? null,
        startLat: extras?.startLat ?? null,
        startLng: extras?.startLng ?? null,
        endLat: extras?.endLat ?? null,
        endLng: extras?.endLng ?? null,
        track:
          extras?.track && extras.track.length > 0
            ? { create: { points: JSON.stringify(extras.track) } }
            : undefined,
      },
    });
  } catch (error) {
    // Unique violation on externalId means the activity was already imported.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { ok: false, error: "Cette séance a déjà été importée." };
    }
    return { ok: false, error: "Échec de l'enregistrement" };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function updateSession(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Identifiant manquant" };
  const parsed = sessionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) };
  }
  const data = parsed.data;
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    return { ok: false, error: "Aucun utilisateur sélectionné" };
  }
  try {
    // updateMany scopes the write to the current user: a session belonging to
    // another profile matches zero rows and is left untouched.
    const result = await prisma.runningSession.updateMany({
      where: { id, userId },
      data: {
        date: dayKeyToDate(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        distanceKm: data.distanceKm,
        averageHeartRate: data.averageHeartRate,
        maxHeartRate: data.maxHeartRate,
        averagePace: data.averagePace,
        maxPace: data.maxPace,
        runType: data.runType,
        customRunType:
          data.runType === "AUTRE" ? data.customRunType?.trim() || null : null,
        comment: data.comment?.trim() || null,
      },
    });
    if (result.count === 0) {
      return { ok: false, error: "Séance introuvable" };
    }
  } catch {
    return { ok: false, error: "Échec de la modification" };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function parseImport(formData: FormData): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Aucun fichier sélectionné." };
  }
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    return { ok: false, error: "Aucun utilisateur sélectionné" };
  }
  try {
    const { bytes, fitFileName } = await extractFit(file);
    const externalId = externalIdFromFileName(fitFileName);

    // Duplicate check is per user: two profiles may each import the same
    // Garmin activity independently.
    const existing = await prisma.runningSession.findFirst({
      where: { userId, externalId },
    });
    if (existing) {
      return { ok: false, error: "Cette séance a déjà été importée." };
    }

    const activity = await parseFitActivity(bytes);
    return {
      ok: true,
      draft: activityToDraft(activity),
      extras: activityToExtras(activity, externalId),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Échec de la lecture du fichier.",
    };
  }
}

export async function deleteSession(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Identifiant manquant" };
  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    return { ok: false, error: "Aucun utilisateur sélectionné" };
  }
  try {
    // Scoped delete: another profile's session matches zero rows.
    const result = await prisma.runningSession.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      return { ok: false, error: "Séance introuvable" };
    }
  } catch {
    return { ok: false, error: "Échec de la suppression" };
  }
  revalidatePath("/");
  return { ok: true };
}

// Resolves a preset to inclusive day-key bounds. "Mois en cours" covers the
// whole month (planned sessions included); the rolling windows end today.
function resolveExportRange(
  input: ExportRangeInput,
): { startKey: string | null; endKey: string | null } {
  const today = todayKey();
  switch (input.preset) {
    case "CURRENT_MONTH":
      return {
        startKey: startOfMonthDayKey(today),
        endKey: endOfMonthDayKey(today),
      };
    case "LAST_3_MONTHS":
      return { startKey: shiftDayKeyByMonths(today, -3), endKey: today };
    case "LAST_6_MONTHS":
      return { startKey: shiftDayKeyByMonths(today, -6), endKey: today };
    case "ALL":
      return { startKey: null, endKey: null };
    case "CUSTOM":
      return {
        startKey: input.startDate ?? null,
        endKey: input.endDate ?? null,
      };
  }
}

function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "coureur"
  );
}

export async function exportSessionsMarkdown(
  input: unknown,
): Promise<ExportResult> {
  const parsed = exportRangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Aucun utilisateur sélectionné" };
  }

  const { startKey, endKey } = resolveExportRange(parsed.data);
  let sessions;
  try {
    sessions = await getSessionsForExport(user.id, startKey, endKey);
  } catch {
    return { ok: false, error: "Échec de l'export" };
  }
  if (sessions.length === 0) {
    return { ok: false, error: "Aucune séance sur cette période." };
  }

  const markdown = buildSessionsMarkdown(sessions, {
    userName: user.name,
    rangeStartKey: startKey,
    rangeEndKey: endKey,
    generatedOnKey: todayKey(),
  });

  const suffix =
    startKey && endKey ? `${startKey}_${endKey}` : "tout-historique";

  return {
    ok: true,
    markdown,
    fileName: `seances-${slugify(user.name)}-${suffix}.md`,
    sessionCount: sessions.length,
  };
}
