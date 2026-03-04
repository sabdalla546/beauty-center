// src/validators/user.ts
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(), // optional if created by external auth
  firstName: z.string().max(128).optional(),
  lastName: z.string().max(128).optional(),
  roles: z.array(z.number()).optional(), // array of roleIds
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().max(128).optional(),
  lastName: z.string().max(128).optional(),
  email: z.string().email().optional(),
  // do not allow password here; use separate change-password endpoint
  roles: z.array(z.number()).optional(),
  isActive: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().max(128).optional(),
  lastName: z.string().max(128).optional(),
  phone: z.string().max(32).optional(),
});
