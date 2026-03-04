import { z } from "zod";

export const roleFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  permissionIds: z.array(z.number()).default([]),
});

export type RoleFormSchema = z.infer<typeof roleFormSchema>;
