import { z } from "zod";

const requiredInt = (min: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return value;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    },
    z.number().int().min(min),
  );

const requiredNumber = (min: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return value;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    },
    z.number().min(min),
  );

const optionalText = (max = 2000) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return value;
    },
    z.string().max(max).optional(),
  );

const optionalString = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.string().optional(),
);

export const openShiftFormSchema = z.object({
  openingCashKwd: requiredNumber(0),
  notes: optionalText(),
});

export const closeShiftFormSchema = z.object({
  closingCashKwd: requiredNumber(0),
  notes: optionalText(),
});

export const shiftSummaryFormSchema = z.object({
  shiftId: requiredInt(1),
  to: optionalString,
});

export type OpenShiftFormSchema = z.infer<typeof openShiftFormSchema>;
export type CloseShiftFormSchema = z.infer<typeof closeShiftFormSchema>;
export type ShiftSummaryFormSchema = z.infer<typeof shiftSummaryFormSchema>;
