import { z } from "zod";
import { isValidPace, paceToSeconds } from "@/lib/pace";
import { isValidTime } from "@/lib/duration";

export const RUN_TYPES = [
  "EF",
  "FRACTIONNE",
  "SORTIE_LONGUE",
  "EVOLUTIVE",
  "AUTRE",
] as const;

export type RunType = (typeof RUN_TYPES)[number];

const dayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");

const timeSchema = z
  .string()
  .refine((v) => isValidTime(v), "Heure invalide (format HH:mm)");

const paceSchema = z
  .string()
  .refine((v) => isValidPace(v), "Allure invalide (format mm:ss)");

const baseShape = {
  date: dayKeySchema,
  startTime: timeSchema,
  endTime: timeSchema,
  distanceKm: z.coerce
    .number({ invalid_type_error: "Distance invalide" })
    .positive("La distance doit être supérieure à 0"),
  averageHeartRate: z.coerce
    .number({ invalid_type_error: "FC moyenne invalide" })
    .int("La FC doit être un entier")
    .positive("La FC moyenne doit être supérieure à 0"),
  maxHeartRate: z.coerce
    .number({ invalid_type_error: "FC max invalide" })
    .int("La FC doit être un entier")
    .positive("La FC max doit être supérieure à 0"),
  averagePace: paceSchema,
  maxPace: paceSchema,
  runType: z.enum(RUN_TYPES, {
    errorMap: () => ({ message: "Type de sortie invalide" }),
  }),
  customRunType: z.string().optional(),
  comment: z.string().optional(),
};

export const sessionInputSchema = z
  .object(baseShape)
  .superRefine((data, ctx) => {
    if (data.maxHeartRate < data.averageHeartRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxHeartRate"],
        message: "La FC max doit être supérieure ou égale à la FC moyenne",
      });
    }

    const avgPace = paceToSeconds(data.averagePace);
    const maxPace = paceToSeconds(data.maxPace);
    if (avgPace !== null && maxPace !== null && maxPace > avgPace) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxPace"],
        message:
          "L'allure max doit être plus rapide (valeur plus petite) que l'allure moyenne",
      });
    }

    if (data.runType === "AUTRE") {
      const custom = data.customRunType?.trim() ?? "";
      if (custom.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customRunType"],
          message: "Précisez le type de sortie",
        });
      }
    }
  });

export type SessionInput = z.infer<typeof sessionInputSchema>;

// Rich metrics + GPS track carried from the Garmin import flow. Optional and
// only present when creating a session from an imported file.
const trackPointSchema = z.object({
  t: z.number(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  alt: z.number().nullable(),
  hr: z.number().nullable(),
  cad: z.number().nullable(),
  d: z.number().nullable(),
  // Written only when the device recorded them; absent on older tracks.
  v: z.number().optional(),
  pw: z.number().optional(),
  gct: z.number().optional(),
  vo: z.number().optional(),
  sl: z.number().optional(),
  tmp: z.number().optional(),
});

const nullableNumber = z.number().nullable();

// One lap message. Everything but the index is nullable: the set of metrics a
// lap carries depends on the watch and the sensors paired with it.
const activityLapSchema = z.object({
  lapIndex: z.number().int(),
  startOffsetS: nullableNumber,
  totalTimerS: nullableNumber,
  totalElapsedS: nullableNumber,
  totalMovingS: nullableNumber,
  distanceM: nullableNumber,
  avgSpeedMps: nullableNumber,
  maxSpeedMps: nullableNumber,
  avgHeartRate: nullableNumber,
  maxHeartRate: nullableNumber,
  minHeartRate: nullableNumber,
  avgCadenceSpm: nullableNumber,
  maxCadenceSpm: nullableNumber,
  steps: nullableNumber,
  calories: nullableNumber,
  ascentM: nullableNumber,
  descentM: nullableNumber,
  avgPower: nullableNumber,
  maxPower: nullableNumber,
  normalizedPower: nullableNumber,
  avgStanceTimeMs: nullableNumber,
  avgStanceTimeBalance: nullableNumber,
  avgVerticalOscMm: nullableNumber,
  avgStepLengthMm: nullableNumber,
  avgVerticalRatio: nullableNumber,
  avgTemperature: nullableNumber,
  maxTemperature: nullableNumber,
  avgAltitudeM: nullableNumber,
  startLat: nullableNumber,
  startLng: nullableNumber,
  endLat: nullableNumber,
  endLng: nullableNumber,
  lapTrigger: z.string().nullable(),
  intensity: z.string().nullable(),
});

export const importExtrasSchema = z.object({
  externalId: z.string().optional(),
  durationSeconds: z.number().int().optional(),
  avgCadenceSpm: z.number().int().optional(),
  maxCadenceSpm: z.number().int().optional(),
  steps: z.number().int().optional(),
  calories: z.number().int().optional(),
  restingCalories: z.number().int().optional(),
  elevationGainM: z.number().int().optional(),
  elevationLossM: z.number().int().optional(),
  sweatLossMl: z.number().int().optional(),
  sport: z.string().optional(),
  subSport: z.string().optional(),
  sportProfileName: z.string().optional(),
  numLaps: z.number().int().optional(),
  startLat: z.number().optional(),
  startLng: z.number().optional(),
  endLat: z.number().optional(),
  endLng: z.number().optional(),
  track: z.array(trackPointSchema).max(100000).optional(),
  laps: z.array(activityLapSchema).max(1000).optional(),
});

export type ImportExtrasInput = z.infer<typeof importExtrasSchema>;

// Markdown export: either a named preset resolved server-side against today's
// date, or an explicit [startDate, endDate] range.
export const EXPORT_PRESETS = [
  "CURRENT_MONTH",
  "LAST_3_MONTHS",
  "LAST_6_MONTHS",
  "ALL",
  "CUSTOM",
] as const;

export type ExportPreset = (typeof EXPORT_PRESETS)[number];

export const exportRangeSchema = z
  .object({
    preset: z.enum(EXPORT_PRESETS, {
      errorMap: () => ({ message: "Période invalide" }),
    }),
    startDate: dayKeySchema.optional(),
    endDate: dayKeySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.preset !== "CUSTOM") return;
    if (!data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Renseignez la date de début",
      });
    }
    if (!data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Renseignez la date de fin",
      });
    }
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "La date de fin doit être postérieure à la date de début",
      });
    }
  });

export type ExportRangeInput = z.infer<typeof exportRangeSchema>;
