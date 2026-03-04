/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/roles&permissions/RoleFormPage.tsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { ClipLoader } from "react-spinners";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useRole } from "@/hooks/roles/useRoles";
import { usePermissions } from "@/hooks/roles/usePermissions";
import {
  useCreateRole,
  useUpdateRole,
  RoleFormValues,
} from "@/hooks/roles/useRoleMutations";
import {
  roleFormSchema,
  type RoleFormSchema,
} from "@/pages/roles&permissions/schemas/roleFormSchema";

const RoleFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const { data: role, isLoading: roleLoading } = useRole(id);
  const { data: permsResponse, isLoading: permsLoading } = usePermissions();
  const permissions = permsResponse?.permissions ?? [];

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole(id);

  const form = useForm<RoleFormSchema>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      permissionIds: [],
    },
  });

  useEffect(() => {
    if (isEditMode && role) {
      form.reset({
        name: role.name,
        description: role.description ?? "",
        permissionIds: role.permissions?.map((p) => p.id) ?? [],
      });
    }
  }, [isEditMode, role, form]);

  const onSubmit: SubmitHandler<RoleFormSchema> = (values) => {
    const payload: RoleFormValues = {
      name: values.name,
      description: values.description,
      permissionIds: values.permissionIds,
    };

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isBusy =
    roleLoading ||
    permsLoading ||
    createMutation.isPending ||
    updateMutation.isPending;
  const dir = i18n.dir();

  if (roleLoading || permsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <ClipLoader size={32} color="hsl(var(--primary))" />
      </div>
    );
  }

  return (
    <ProtectedComponent
      permission={isEditMode ? "roles.update" : "roles.create"}
    >
      <div className="min-h-screen p-4 my-4 bg-background text-foreground" dir={dir}>
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => navigate("/system/roles")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-2 group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t("back_to_roles") || "Back to Roles"}
          </button>

          <div className="relative overflow-hidden rounded-2xl bg-card p-3 border border-border shadow-sm">
            <div className="relative flex items-start gap-4">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-2xl ${
                  isEditMode
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-500"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <Shield className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">
                  {isEditMode
                    ? t("edit_role") || "Edit Role"
                    : t("create_role") || "Create Role"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("roles_edit_description") ||
                      "Update role details and permissions."
                    : t("roles_create_description") ||
                      "Create a new role and assign permissions."}
                </p>
              </div>
            </div>
          </div>

          <Card className="bg-card border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        R
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("role_details") || "Role details"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("basic_info") || "Basic Information"}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("name") || "Name"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("enter_name") || "Role name"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("description") || "Description"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("roles_description_hint") || "Optional description"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        P
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("permissions") || "Permissions"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("assign_permissions") || "Assign Permissions"}
                        </h3>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="permissionIds"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2 rounded-lg border p-3 border-border bg-muted/20 max-h-72 overflow-auto">
                            {permissions.map((perm) => {
                              const checked = field.value?.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className="flex items-center gap-3 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => {
                                      const isChecked = Boolean(v);
                                      if (isChecked) {
                                        field.onChange([
                                          ...(field.value || []),
                                          perm.id,
                                        ]);
                                      } else {
                                        field.onChange(
                                          (field.value || []).filter(
                                            (id) => id !== perm.id,
                                          ),
                                        );
                                      }
                                    }}
                                  />
                                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                    {perm.name}
                                  </span>
                                </label>
                              );
                            })}
                            {!permissions.length && (
                              <p className="text-xs text-muted-foreground">
                                {t("no_permissions_found") || "No permissions found"}
                              </p>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[120px]"
                      onClick={() => navigate("/system/roles")}
                      disabled={isBusy}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      {t("cancel") || "Cancel"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isBusy}
                      className="min-w-[140px]"
                    >
                      {isBusy ? (
                        <span className="flex items-center gap-2">
                          <ClipLoader
                            size={16}
                            color="hsl(var(--primary-foreground))"
                          />
                          {t("processing") || "Processing"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {isEditMode ? (
                            <>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              {t("update") || "Update"}
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                              {t("create") || "Create"}
                            </>
                          )}
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedComponent>
  );
};

export default RoleFormPage;
