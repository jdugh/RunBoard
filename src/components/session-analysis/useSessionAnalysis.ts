"use client";

import { useEffect, useRef, useState } from "react";

import { loadSessionAnalysis } from "@/app/analysis-actions";
import type { SessionAnalysisDTO } from "@/server/session-analysis";

interface AnalysisState {
  // Which session the other fields describe. The modal is reused across
  // sessions, so results are only trusted when this matches.
  loadedFor: string | null;
  analysis: SessionAnalysisDTO | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: AnalysisState = {
  loadedFor: null,
  analysis: null,
  loading: false,
  error: null,
};

// Fetches the track once, the first time `enabled` turns true — the analysis
// tabs are opt-in, so a session whose charts are never opened never pays for
// its thousand track points.
export function useSessionAnalysis(
  sessionId: string | undefined,
  enabled: boolean,
): {
  analysis: SessionAnalysisDTO | null;
  loading: boolean;
  error: string | null;
} {
  const [state, setState] = useState<AnalysisState>(EMPTY);
  // Held in a ref rather than in state: "a request has been issued" must not
  // be an effect dependency, or the state update the request itself triggers
  // re-runs the effect and its cleanup cancels the in-flight promise.
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    if (requestedFor.current === sessionId) return;
    requestedFor.current = sessionId;

    let cancelled = false;
    setState({ ...EMPTY, loadedFor: sessionId, loading: true });

    void loadSessionAnalysis(sessionId)
      .then((result) => {
        if (cancelled) return;
        setState({
          loadedFor: sessionId,
          analysis: result.ok ? (result.analysis ?? null) : null,
          loading: false,
          error: result.ok ? null : (result.error ?? "Échec du chargement"),
        });
      })
      .catch(() => {
        // A rejected action (network drop, stale deployment) must surface as
        // an error rather than leave the pane spinning forever. Clearing the
        // ref lets reopening the tab try again.
        if (cancelled) return;
        requestedFor.current = null;
        setState({
          loadedFor: sessionId,
          analysis: null,
          loading: false,
          error: "Échec du chargement de la trace",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, sessionId]);

  // Another session in the same modal instance: report "still loading" rather
  // than briefly handing back the previous session's track.
  if (state.loadedFor !== (sessionId ?? null)) {
    return { analysis: null, loading: enabled, error: null };
  }
  return {
    analysis: state.analysis,
    loading: state.loading,
    error: state.error,
  };
}
