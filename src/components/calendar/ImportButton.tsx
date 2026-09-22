"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { parseImport } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { SessionFormModal } from "@/components/session-form/SessionFormModal";
import type {
  ImportedSessionDraft,
  ImportExtras,
} from "@/lib/fit-to-session";

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ImportedSessionDraft | null>(null);
  const [extras, setExtras] = useState<ImportExtras | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await parseImport(formData);
      if (!result.ok || !result.draft) {
        toast.error(result.error ?? "Import impossible");
        return;
      }
      setDraft(result.draft);
      setExtras(result.extras);
      setOpen(true);
    });
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".fit,.zip"
        className="hidden"
        onChange={onFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        className="bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100 hover:text-violet-900"
      >
        <Upload className="h-4 w-4" />
        {isPending ? "Lecture…" : "Importer une séance"}
      </Button>

      {draft && (
        <SessionFormModal
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setDraft(null);
              setExtras(undefined);
            }
          }}
          dayKey={draft.date}
          prefill={draft}
          importExtras={extras}
          title="Vérifier la séance importée"
        />
      )}
    </>
  );
}
