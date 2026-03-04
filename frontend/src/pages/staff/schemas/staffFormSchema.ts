import { z } from "zod";

const isValidSkillsInput = (value?: string) => {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object";
    } catch {
      return false;
    }
  }

  return true;
};

export const parseSkillsInput = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const record: Record<string, true> = {};
        parsed
          .map((item) => String(item).trim())
          .filter(Boolean)
          .forEach((item) => {
            record[item] = true;
          });
        return Object.keys(record).length ? record : undefined;
      }
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return undefined;

  const record: Record<string, true> = {};
  parts.forEach((part) => {
    record[part] = true;
  });
  return record;
};

const baseSchema = z.object({
  userId: z.number().int().positive().optional(),
  displayName: z.string().max(128).optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  skills: z
    .string()
    .optional()
    .refine(isValidSkillsInput, {
      message: "Skills must be a JSON object or comma-separated list",
    }),
});

export const createStaffSchema = baseSchema.extend({
  userId: z.number().int().positive("User is required"),
});

export const editStaffSchema = baseSchema;

export type StaffFormSchema =
  | z.infer<typeof createStaffSchema>
  | z.infer<typeof editStaffSchema>;
