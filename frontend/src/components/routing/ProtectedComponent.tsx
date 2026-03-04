// src/components/routing/ProtectedComponent.tsx
import { ReactNode } from "react";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useAuth } from "@/context/AuthContext.tsx";

type ProtectedComponentProps = {
  /** صلاحية واحدة مثلاً "view-user" */
  permission?: string;
  /** أي من دول يكفي */
  anyOf?: string[];
  /** لازم كلهم */
  allOf?: string[];
  /** لو مفيش صلاحية هنرجّع إيه (افتراضياً null) */
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * يستخدم لــ إخفاء / إظهار عناصر حسب الصلاحيات
 */
export const ProtectedComponent = ({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: ProtectedComponentProps) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  let allowed = true;

  if (permission) {
    allowed = useHasPermission(permission);
  }

  if (anyOf && anyOf.length) {
    allowed = allowed && useHasPermission(anyOf, "any");
  }

  if (allOf && allOf.length) {
    allowed = allowed && useHasPermission(allOf, "all");
  }

  if (!allowed) return <>{fallback}</>;

  return <>{children}</>;
};
