"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { splitsFromLaps, splitsFromTrack } from "@/lib/track-analysis";
import { GraphsTab } from "@/components/session-analysis/GraphsTab";
import { SplitsTable } from "@/components/session-analysis/SplitsTable";
import { useSessionAnalysis } from "@/components/session-analysis/useSessionAnalysis";
import type { MetricId } from "@/lib/track-metrics";
import { SessionForm, type InitialValues } from "./SessionForm";
import type { SessionInput } from "@/server/validation";
import type { ImportExtras } from "@/lib/fit-to-session";

interface SessionLike {
  id: string;
  dayKey: string;
  startTime: string;
  endTime: string;
  distanceKm: number;
  averageHeartRate: number;
  maxHeartRate: number;
  averagePace: string;
  maxPace: string;
  runType: string;
  customRunType: string | null;
  comment: string | null;
  hasTrack: boolean;
}

interface SessionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayKey: string;
  session?: SessionLike | null;
  // Create-mode pre-filled values (e.g. from a Garmin import).
  prefill?: Partial<InitialValues>;
  importExtras?: ImportExtras;
  title?: string;
}

type TabKey = "details" | "charts" | "splits";

export function SessionFormModal({
  open,
  onOpenChange,
  dayKey,
  session,
  prefill,
  importExtras,
  title,
}: SessionFormModalProps) {
  const mode = session ? "edit" : "create";
  // The analysis tabs need a persisted track, which only exists once the
  // session has been saved from an import.
  const hasAnalysis = mode === "edit" && session?.hasTrack === true;

  const [tab, setTab] = useState<TabKey>("details");
  // Metrics shown by the detailed chart, or null for the chart overview. Held
  // here rather than in the tab because the dialog grows while it is open.
  const [expanded, setExpanded] = useState<MetricId[] | null>(null);

  // Reopening on another session must not land on a tab that no longer exists.
  useEffect(() => {
    if (!open) {
      setTab("details");
      setExpanded(null);
    }
  }, [open]);

  const { analysis, loading, error } = useSessionAnalysis(
    session?.id,
    hasAnalysis && tab !== "details",
  );

  const initial: InitialValues = session
    ? {
        id: session.id,
        date: session.dayKey,
        startTime: session.startTime,
        endTime: session.endTime,
        distanceKm: session.distanceKm,
        averageHeartRate: session.averageHeartRate,
        maxHeartRate: session.maxHeartRate,
        averagePace: session.averagePace,
        maxPace: session.maxPace,
        runType: session.runType as SessionInput["runType"],
        customRunType: session.customRunType,
        comment: session.comment,
      }
    : { date: dayKey, ...prefill };

  // The watch's own laps win over recut ones: they carry the real boundaries
  // (including manual and interval laps) and a filtered elevation figure.
  const splits = useMemo(() => {
    if (!analysis) return null;
    return analysis.laps.length > 0
      ? splitsFromLaps(analysis.laps)
      : splitsFromTrack(analysis.points);
  }, [analysis]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          hasAnalysis && "max-w-5xl",
          // The detailed chart wants every pixel it can get.
          expanded && "max-w-[min(96rem,95vw)]",
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {title ??
              (mode === "edit" ? "Modifier la séance" : "Ajouter une séance")}
          </DialogTitle>
        </DialogHeader>

        {!hasAnalysis ? (
          <SessionForm
            initial={initial}
            mode={mode}
            importExtras={importExtras}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <Tabs
            className="min-w-0"
            value={tab}
            onValueChange={(v) => {
              setTab(v as TabKey);
              setExpanded(null);
            }}
          >
            <TabsList>
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="charts">Graphiques</TabsTrigger>
              <TabsTrigger value="splits">Circuits</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <SessionForm
                initial={initial}
                mode={mode}
                importExtras={importExtras}
                onSuccess={() => onOpenChange(false)}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>

            <TabsContent value="charts">
              <AnalysisPane loading={loading} error={error} ready={!!analysis}>
                {analysis && (
                  <GraphsTab
                    points={analysis.points}
                    expanded={expanded}
                    onExpand={setExpanded}
                    onCollapse={() => setExpanded(null)}
                  />
                )}
              </AnalysisPane>
            </TabsContent>

            <TabsContent value="splits">
              <AnalysisPane loading={loading} error={error} ready={!!splits}>
                {splits && <SplitsTable splits={splits} />}
              </AnalysisPane>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AnalysisPane({
  loading,
  error,
  ready,
  children,
}: {
  loading: boolean;
  error: string | null;
  ready: boolean;
  children: React.ReactNode;
}) {
  if (error) {
    return <p className="py-8 text-center text-sm text-destructive">{error}</p>;
  }
  if (loading || !ready) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Chargement de la trace…
      </p>
    );
  }
  return <>{children}</>;
}

// Convenience wrapper for the "+" button on a day cell.
export function useSessionModalState() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
