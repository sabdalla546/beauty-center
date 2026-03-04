// src/validators/customer.ts
import { z } from "zod";

export const createCustomerSchema = z.object({
  firstName: z.string().max(128).optional().nullable(),
  lastName: z.string().max(128).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().max(128).optional().nullable(),
  lastName: z.string().max(128).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
});
