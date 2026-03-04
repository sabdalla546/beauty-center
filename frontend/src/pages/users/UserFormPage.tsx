/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/users/UserFormPage.tsx
import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ClipLoader } from "react-spinners";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useUser } from "@/hooks/users/useUsers";
import { useRoles } from "@/hooks/roles/useRoles";
import {
  useCreateUser,
  useUpdateUser,
  type UserFormValues,
} from "@/hooks/users/useUserMutations";

const baseSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email"),
  roleIds: z.array(z.number()).min(1, "Role is required"),
  isActive: z.boolean().default(true),
  password: z.string().optional(),
});

const createSchema = baseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const editSchema = baseSchema;

type FormValues = z.infer<typeof createSchema> | z.infer<typeof editSchema>;

const splitFullName = (fullName: string) => {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ");
  return { firstName, lastName };
};

const UserFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const { data: user, isLoading: userLoading } = useUser(id);
  const { data: rolesRes, isLoading: rolesLoading } = useRoles();
  const roles = rolesRes?.roles ?? [];

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(id);

  const schema = isEditMode ? editSchema : createSchema;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      fullName: "",
      email: "",
      roleIds: [],
      isActive: true,
      password: "",
    } as FormValues,
  });

  useEffect(() => {
    if (isEditMode && user) {
      const fullName =
        user.fullName ||
        [user.firstName, user.lastName].filter(Boolean).join(" ");
      const roleIds = (user.roles ?? [])
        .map((r: any) => Number(r.id))
        .filter((n) => Number.isFinite(n));

      form.reset({
        fullName: fullName || "",
        email: user.email,
        roleIds,
        isActive: user.isActive ?? true,
        password: "",
      });
    }
  }, [isEditMode, user, form]);

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const { firstName, lastName } = splitFullName(values.fullName);
    const payload: UserFormValues = {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: values.email,
      roleIds: values.roleIds,
      isActive: values.isActive,
      password: isEditMode ? undefined : values.password || undefined,
    };

    if (isEditMode) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isBusy =
    userLoading ||
    rolesLoading ||
    createMutation.isPending ||
    updateMutation.isPending;
  const dir = i18n.dir();

  if (userLoading || rolesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader size={50} color="hsl(var(--primary))" />
      </div>
    );
  }

  return (
    <ProtectedComponent
      permission={isEditMode ? "users.update" : "users.create"}
    >
      <div className="min-h-screen p-4 my-4 bg-background text-foreground" dir={dir}>
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => navigate("/system/users")}
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
            {t("users.back_to_users") || "Back to Users"}
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
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">
                  {isEditMode
                    ? t("users.edit_user") || "Edit User"
                    : t("users.create_user") || "Create User"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("users.edit_user_description") ||
                      "Update user information and roles."
                    : t("users.create_user_description") ||
                      "Create a new platform user with roles and credentials."}
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
                        U
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("users.details") || "User details"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("users.basic_info") || "Basic Information"}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("users.full_name") || t("full_name") || "Full name"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("users.enter_full_name") || "Full name"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("users.email") || t("email") || "Email"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                {...field}
                                placeholder={t("users.enter_email") || "user@example.com"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {!isEditMode && (
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-[var(--color-text-main)]">
                                {t("users.password") || t("password") || "Password"}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  {...field}
                                  placeholder={t("users.enter_password") || "********"}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        R
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("users.roles") || "Roles & Permissions"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("users.assign_roles") || "Assign Roles"}
                        </h3>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="roleIds"
                      render={({ field }) => {
                        const selected: number[] = field.value || [];
                        const toggle = (roleId: number) =>
                          selected.includes(roleId)
                            ? field.onChange(selected.filter((x) => x !== roleId))
                            : field.onChange([...selected, roleId]);
                        return (
                          <FormItem>
                            <div className="space-y-2 rounded-lg border p-3 border-border bg-muted/20">
                              {roles.map((role: any) => (
                                <label
                                  key={role.id}
                                  className="flex items-center gap-3 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selected.includes(role.id)}
                                    onCheckedChange={() => toggle(role.id)}
                                  />
                                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                    {role.name}
                                  </span>
                                </label>
                              ))}
                              {!roles.length && (
                                <p className="text-xs text-muted-foreground dark:text-[var(--color-text-muted)]">
                                  {t("users.no_roles_available") || "No roles available"}
                                </p>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        S
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("users.status") || "Status"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("users.activation") || "Activation"}
                        </h3>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3 rounded-xl border p-4 border-border bg-muted/20">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(v) => field.onChange(Boolean(v))}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer">
                              {t("users.active_user") || "Active user"}
                            </FormLabel>
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
                      onClick={() => navigate("/system/users")}
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
                      {t("users.cancel") || "Cancel"}
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
                          {t("users.processing") || "Processing"}
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
                              {t("users.update") || "Update User"}
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
                              {t("users.create") || "Create User"}
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

export default UserFormPage;
