// src/hooks/useHasPermission.ts
import { useAuth } from "@/context/AuthContext.tsx";

export const useHasPermission = (
  perms: string | string[],
  mode: "any" | "all" = "any"
): boolean => {
  const { user } = useAuth();
  const userPerms = user?.permissions || [];
  const userRoles = user?.roles || [];

  const required = Array.isArray(perms) ? perms : [perms];

  if (!required.length) return true; // لو مش طالب حاجة، اعتبره مسموح
  if (userRoles.includes("admin")) return true;
  if (userPerms.includes("*")) return true;
  if (!userPerms.length) return false;

  if (mode === "all") {
    return required.every((p) => userPerms.includes(p));
  }
  return required.some((p) => userPerms.includes(p));
};
