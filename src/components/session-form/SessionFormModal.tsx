"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title ??
              (mode === "edit" ? "Modifier la séance" : "Ajouter une séance")}
          </DialogTitle>
        </DialogHeader>
        <SessionForm
          initial={initial}
          mode={mode}
          importExtras={importExtras}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Convenience wrapper for the "+" button on a day cell.
export function useSessionModalState() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
