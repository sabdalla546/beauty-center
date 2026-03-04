import { z } from "zod";

const requiredInt = (min: number) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return value;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }, z.number().int().min(min));

const optionalInt = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  },
  z.number().int().positive().optional(),
);

const optionalDateTime = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.string().min(1).optional(),
);

export const appointmentFormSchema = z
  .object({
    customerId: requiredInt(1),
    serviceId: requiredInt(1),
    staffId: optionalInt,
    roomId: optionalInt,
    startAt: z.string().min(1),
    endAt: optionalDateTime,
    status: z.string().max(32).optional(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.startAt || !data.endAt) return true;
      const start = new Date(data.startAt);
      const end = new Date(data.endAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return true;
      }
      return end > start;
    },
    {
      message: "End time must be after start time",
      path: ["endAt"],
    },
  );

export type AppointmentFormSchema = z.infer<typeof appointmentFormSchema>;
