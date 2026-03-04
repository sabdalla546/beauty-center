import { z } from "zod";

export const paymentMethodFormSchema = z.object({
  code: z.string().min(1).max(32),
  nameEn: z.string().min(1).max(100),
  nameAr: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
});

export type PaymentMethodFormSchema = z.infer<typeof paymentMethodFormSchema>;
