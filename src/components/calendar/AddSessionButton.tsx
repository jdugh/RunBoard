"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { SessionFormModal } from "@/components/session-form/SessionFormModal";

interface AddSessionButtonProps {
  dayKey: string;
}

export function AddSessionButton({ dayKey }: AddSessionButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Ajouter une séance"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <SessionFormModal
        open={open}
        onOpenChange={setOpen}
        dayKey={dayKey}
      />
    </>
  );
}
