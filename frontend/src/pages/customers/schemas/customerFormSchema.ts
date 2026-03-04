import { z } from "zod";

export const customerFormSchema = z.object({
  firstName: z.string().max(128).optional(),
  lastName: z.string().max(128).optional(),
  phone: z.string().max(32).optional(),
});

export type CustomerFormSchema = z.infer<typeof customerFormSchema>;
