"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { SessionDTO } from "@/server/sessions";
import { runTypeLabel, formatDistanceKm } from "@/lib/format";
import { sessionDurationMinutes, formatDurationCompact } from "@/lib/duration";
import { deleteSession } from "@/app/actions";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { SessionFormModal } from "@/components/session-form/SessionFormModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RUN_TYPE_STYLES: Record<string, string> = {
  EF: "bg-emerald-100 text-emerald-900 border-emerald-200",
  FRACTIONNE: "bg-rose-100 text-rose-900 border-rose-200",
  SORTIE_LONGUE: "bg-sky-100 text-sky-900 border-sky-200",
  EVOLUTIVE: "bg-amber-100 text-amber-900 border-amber-200",
  AUTRE: "bg-slate-100 text-slate-900 border-slate-200",
};

interface SessionPillProps {
  session: SessionDTO;
}

export function SessionPill({ session }: SessionPillProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const duration = formatDurationCompact(
    sessionDurationMinutes(session.startTime, session.endTime),
  );

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteSession(session.id);
      if (result.ok) {
        toast.success("Séance supprimée");
        setDeleteOpen(false);
      } else {
        toast.error(result.error ?? "Échec de la suppression");
      }
    });
  };

  return (
    <>
      <div
        className={cn(
          "rounded border text-[11px] leading-tight px-1.5 py-1",
          RUN_TYPE_STYLES[session.runType] ?? RUN_TYPE_STYLES.AUTRE,
        )}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="font-semibold truncate">
            {runTypeLabel(session.runType, session.customRunType)}
          </div>
          <div className="flex gap-0.5 -mr-1 -mt-0.5">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="p-0.5 rounded hover:bg-black/10"
              aria-label="Éditer"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="p-0.5 rounded hover:bg-black/10"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex justify-between text-[10px] opacity-90">
          <span>{formatDistanceKm(session.distanceKm)}</span>
          <span>{duration}</span>
        </div>
      </div>

      <SessionFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        dayKey={session.dayKey}
        session={session}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette séance ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
