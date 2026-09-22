"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Download, FileDown } from "lucide-react";
import { toast } from "sonner";

import { exportSessionsMarkdown } from "@/app/actions";
import { endOfMonthDayKey, startOfMonthDayKey, todayKey } from "@/lib/date";
import type { ExportPreset } from "@/server/validation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESETS: { value: ExportPreset; label: string }[] = [
  { value: "CURRENT_MONTH", label: "Le mois en cours" },
  { value: "LAST_3_MONTHS", label: "Les 3 derniers mois" },
  { value: "LAST_6_MONTHS", label: "Les 6 derniers mois" },
  { value: "ALL", label: "Toutes les données" },
  { value: "CUSTOM", label: "Période personnalisée" },
];

// navigator.clipboard is only available in a secure context; the app is often
// served over plain http on a local network, so fall back to the legacy
// execCommand path rather than failing the copy.
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path below.
    }
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function downloadMarkdown(fileName: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportButton() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<ExportPreset>("CURRENT_MONTH");
  const [startDate, setStartDate] = useState(() =>
    startOfMonthDayKey(todayKey()),
  );
  const [endDate, setEndDate] = useState(() => endOfMonthDayKey(todayKey()));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = (mode: "copy" | "download") => {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await exportSessionsMarkdown({
        preset,
        // An emptied date input yields "", which must reach the schema as
        // undefined so it reports "renseignez la date" rather than "invalide".
        startDate: preset === "CUSTOM" ? startDate || undefined : undefined,
        endDate: preset === "CUSTOM" ? endDate || undefined : undefined,
      });

      if (!result.ok || !result.markdown || !result.fileName) {
        setError(
          result.error ??
            Object.values(result.fieldErrors ?? {})[0] ??
            "Export impossible",
        );
        return;
      }

      const count = result.sessionCount ?? 0;
      const plural = count > 1 ? "s" : "";

      if (mode === "download") {
        downloadMarkdown(result.fileName, result.markdown);
        toast.success(`${count} séance${plural} exportée${plural}`);
        setOpen(false);
        return;
      }

      const copiedOk = await copyToClipboard(result.markdown);
      if (!copiedOk) {
        setError("Copie impossible. Utilisez le téléchargement du fichier.");
        return;
      }
      setCopied(true);
      toast.success(
        `${count} séance${plural} copiée${plural} dans le presse-papier`,
      );
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Exporter les séances au format markdown"
      >
        <FileDown className="h-4 w-4" />
        Exporter les séances
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setError(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exporter les séances</DialogTitle>
            <DialogDescription>
              Génère un tableau markdown de vos séances.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">
                Période à exporter
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRESETS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={preset === option.value ? "default" : "outline"}
                    size="sm"
                    aria-pressed={preset === option.value}
                    className="justify-start"
                    onClick={() => {
                      setPreset(option.value);
                      setError(null);
                      setCopied(false);
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </fieldset>

            {preset === "CUSTOM" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="export-start">Date de début</Label>
                  <Input
                    id="export-start"
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setError(null);
                      setCopied(false);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="export-end">Date de fin</Label>
                  <Input
                    id="export-end"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setError(null);
                      setCopied(false);
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => run("copy")}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copié !" : "Copier le markdown"}
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => run("download")}
              >
                <Download className="h-4 w-4" />
                {isPending ? "Export…" : "Télécharger le fichier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
