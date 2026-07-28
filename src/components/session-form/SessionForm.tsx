"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  sessionInputSchema,
  type SessionInput,
  RUN_TYPES,
} from "@/server/validation";
import { RUN_TYPE_LABELS } from "@/lib/format";
import { formatDayLong } from "@/lib/date";
import { formatDurationFromMinutes } from "@/lib/duration";
import { createSession, updateSession } from "@/app/actions";
import type { ImportExtras } from "@/lib/fit-to-session";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface InitialValues {
  id?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  distanceKm?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePace?: string;
  maxPace?: string;
  runType?: SessionInput["runType"];
  customRunType?: string | null;
  comment?: string | null;
}

interface SessionFormProps {
  initial: InitialValues;
  mode: "create" | "edit";
  onSuccess: () => void;
  onCancel: () => void;
  // Rich imported metrics, shown read-only and persisted on create.
  importExtras?: ImportExtras;
}

type FormValues = {
  date: string;
  startTime: string;
  endTime: string;
  distanceKm: string;
  averageHeartRate: string;
  maxHeartRate: string;
  averagePace: string;
  maxPace: string;
  runType: SessionInput["runType"];
  customRunType: string;
  comment: string;
};

function toFormDefaults(initial: InitialValues): FormValues {
  return {
    date: initial.date,
    startTime: initial.startTime ?? "",
    endTime: initial.endTime ?? "",
    distanceKm:
      initial.distanceKm === undefined ? "" : String(initial.distanceKm),
    averageHeartRate:
      initial.averageHeartRate === undefined
        ? ""
        : String(initial.averageHeartRate),
    maxHeartRate:
      initial.maxHeartRate === undefined ? "" : String(initial.maxHeartRate),
    averagePace: initial.averagePace ?? "",
    maxPace: initial.maxPace ?? "",
    runType: initial.runType ?? "EF",
    customRunType: initial.customRunType ?? "",
    comment: initial.comment ?? "",
  };
}

export function SessionForm({
  initial,
  mode,
  onSuccess,
  onCancel,
  importExtras,
}: SessionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: toFormDefaults(initial),
    resolver: zodResolver(sessionInputSchema),
  });

  useEffect(() => {
    reset(toFormDefaults(initial));
  }, [initial, reset]);

  const runType = watch("runType");

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const payload = {
        ...values,
        distanceKm: values.distanceKm,
        averageHeartRate: values.averageHeartRate,
        maxHeartRate: values.maxHeartRate,
        ...(mode === "create" && importExtras
          ? { __import: importExtras }
          : {}),
      };
      const result =
        mode === "edit" && initial.id
          ? await updateSession(initial.id, payload)
          : await createSession(payload);

      if (result.ok) {
        toast.success(mode === "edit" ? "Séance modifiée" : "Séance ajoutée");
        onSuccess();
        return;
      }
      if (result.fieldErrors) {
        for (const [path, message] of Object.entries(result.fieldErrors)) {
          setError(path as keyof FormValues, {
            type: "server",
            message,
          });
        }
      }
      setSubmitError(result.error ?? "Veuillez corriger les erreurs.");
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Date de la séance</Label>
        <p className="text-sm text-muted-foreground capitalize">
          {formatDayLong(initial.date)}
        </p>
        <input type="hidden" {...register("date")} />
      </div>

      {importExtras && <ImportSummary extras={importExtras} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Heure de début" error={errors.startTime?.message}>
          <Input type="time" {...register("startTime")} />
        </Field>
        <Field label="Heure de fin" error={errors.endTime?.message}>
          <Input type="time" {...register("endTime")} />
        </Field>
      </div>

      <Field label="Distance (km)" error={errors.distanceKm?.message}>
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          {...register("distanceKm")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="FC moyenne (bpm)"
          error={errors.averageHeartRate?.message}
        >
          <Input type="number" inputMode="numeric" {...register("averageHeartRate")} />
        </Field>
        <Field label="FC max (bpm)" error={errors.maxHeartRate?.message}>
          <Input type="number" inputMode="numeric" {...register("maxHeartRate")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Allure moyenne (mm:ss/km)"
          error={errors.averagePace?.message}
        >
          <Input placeholder="5:30" {...register("averagePace")} />
        </Field>
        <Field label="Allure max (mm:ss/km)" error={errors.maxPace?.message}>
          <Input placeholder="4:45" {...register("maxPace")} />
        </Field>
      </div>

      <Field label="Type de sortie" error={errors.runType?.message}>
        <Controller
          control={control}
          name="runType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RUN_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {RUN_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {runType === "AUTRE" && (
        <Field
          label="Autre type de sortie"
          error={errors.customRunType?.message}
        >
          <Input {...register("customRunType")} />
        </Field>
      )}

      <Field label="Commentaire (facultatif)" error={errors.comment?.message}>
        <Textarea rows={3} {...register("comment")} />
      </Field>

      {submitError && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Read-only recap of the extra metrics extracted from the Garmin file. These
// are stored as-is and not editable in the form.
function ImportSummary({ extras }: { extras: ImportExtras }) {
  const items: { label: string; value: string }[] = [];

  if (extras.durationSeconds != null) {
    items.push({
      label: "Durée exacte",
      value: formatDurationFromMinutes(extras.durationSeconds / 60),
    });
  }
  if (extras.avgCadenceSpm != null) {
    items.push({ label: "Cadence moy.", value: `${extras.avgCadenceSpm} ppm` });
  }
  if (extras.steps != null) {
    items.push({ label: "Pas", value: extras.steps.toLocaleString("fr-FR") });
  }
  if (extras.calories != null) {
    items.push({ label: "Calories", value: `${extras.calories} kcal` });
  }
  if (extras.elevationGainM != null) {
    items.push({ label: "Dénivelé +", value: `${extras.elevationGainM} m` });
  }
  if (extras.sweatLossMl != null) {
    items.push({ label: "Sudation", value: `${extras.sweatLossMl} ml` });
  }
  if (extras.track && extras.track.length > 0) {
    items.push({ label: "Trace GPS", value: `${extras.track.length} points` });
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Données importées (enregistrées automatiquement)
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
            <dd className="font-medium tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
