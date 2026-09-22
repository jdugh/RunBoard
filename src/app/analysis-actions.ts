"use server";

import { requireCurrentUserId } from "@/server/current-user";
import {
  getSessionAnalysis,
  type SessionAnalysisDTO,
} from "@/server/session-analysis";

export interface AnalysisResult {
  ok: boolean;
  analysis?: SessionAnalysisDTO;
  error?: string;
}

// Called by the analysis tabs the first time one is opened, so the calendar
// page never carries the track payload.
export async function loadSessionAnalysis(
  id: string,
): Promise<AnalysisResult> {
  if (!id) return { ok: false, error: "Identifiant manquant" };

  let userId: string;
  try {
    userId = await requireCurrentUserId();
  } catch {
    return { ok: false, error: "Aucun utilisateur sélectionné" };
  }

  try {
    const analysis = await getSessionAnalysis(userId, id);
    if (!analysis) return { ok: false, error: "Séance introuvable" };
    return { ok: true, analysis };
  } catch {
    return { ok: false, error: "Échec du chargement de la trace" };
  }
}
