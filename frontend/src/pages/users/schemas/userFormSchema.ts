// src/pages/users/schemas/userFormSchema.ts
import * as z from "zod";
import { useTranslation } from "react-i18next";

export const createUserFormSchema = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation("common");

  return z.object({
    firstName: z
      .string()
      .min(1, t("first_name_required", "First name is required")),
    lastName: z.string().optional(),
    email: z.string().email(t("invalid_email", "Invalid email")),
    roleId: z.number().min(1, t("role_required", "Role is required")),
    password: z
      .string()
      .min(
        8,
        t("password_min_length", "Password must be at least 8 characters")
      )
      .optional()
      .or(z.literal("")),
  });
};

export type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>;
