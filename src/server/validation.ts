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
});

export type ImportExtrasInput = z.infer<typeof importExtrasSchema>;
