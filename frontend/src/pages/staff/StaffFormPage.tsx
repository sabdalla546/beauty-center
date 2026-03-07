/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { User } from "lucide-react";
import { ClipLoader } from "react-spinners";

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
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useUsers } from "@/hooks/users/useUsers";
import { useStaffMember } from "@/hooks/staff/useStaff";
import {
  useCreateStaff,
  useUpdateStaff,
  type StaffFormValues,
} from "@/hooks/staff/useStaffMutations";
import {
  createStaffSchema,
  editStaffSchema,
  parseSkillsInput,
  type StaffFormSchema,
} from "@/pages/staff/schemas/staffFormSchema";
import type { User as AppUser } from "@/pages/users/types";

const StaffFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const { data: staff, isLoading: staffLoading } = useStaffMember(id);
  const { data: usersRes, isLoading: usersLoading } = useUsers({
    currentPage: 1,
    itemsPerPage: 50,
    searchQuery: userSearchTerm,
  });
  const users = usersRes?.data ?? [];

  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff(id);

  const schema = isEditMode ? editStaffSchema : createStaffSchema;
  const form = useForm<StaffFormSchema>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      userId: undefined,
      displayName: "",
      commissionPercent: 0,
      skills: "",
    },
  });

  const staffUser = staff?.user || staff?.User;

  const userOptions = useMemo(() => {
    const list = [...users];
    if (staffUser && !list.some((u) => u.id === staffUser.id)) {
      const fullName = [staffUser.firstName, staffUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      list.unshift({
        id: staffUser.id,
        email: staffUser.email,
        firstName: staffUser.firstName ?? null,
        lastName: staffUser.lastName ?? null,
        fullName: fullName || staffUser.email,
      } as AppUser);
    }
    return list;
  }, [users, staffUser]);

  useEffect(() => {
    if (isEditMode && staff) {
      form.reset({
        userId: staffUser?.id ?? staff.id,
        displayName: staff.displayName ?? "",
        commissionPercent: Number(staff.commissionPercent ?? 0),
        skills: staff.skills ? JSON.stringify(staff.skills) : "",
      });
    }
  }, [isEditMode, staff, form]);

  const onSubmit: SubmitHandler<StaffFormSchema> = (values) => {
    const payload: StaffFormValues = {
      userId: values.userId,
      displayName: values.displayName || undefined,
      commissionPercent: Number(values.commissionPercent ?? 0),
      skills: parseSkillsInput(values.skills),
    };

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isUsersInitialLoading = usersLoading && !usersRes;
  const isBusy =
    staffLoading ||
    isUsersInitialLoading ||
    createMutation.isPending ||
    updateMutation.isPending;
  const dir = i18n.dir();

  const showLoader = staffLoading || isUsersInitialLoading;

  if (showLoader) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader size={50} color="hsl(var(--primary))" />
      </div>
    );
  }

  return (
    <ProtectedComponent
      permission={isEditMode ? "staff.update" : "staff.create"}
    >
      <div className="min-h-screen p-4 my-4 bg-background text-foreground" dir={dir}>
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            type="button"
            onClick={() => navigate("/staff")}
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
            {t("staff.back_to_staff") || "Back to Staff"}
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
                <User className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">
                  {isEditMode
                    ? t("staff.edit_staff") || "Edit staff"
                    : t("staff.create_staff") || "Create staff"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("staff.edit_staff_description") ||
                      "Update staff details and skills."
                    : t("staff.create_staff_description") ||
                      "Create a staff profile linked to a user."}
                </p>
              </div>
            </div>
          </div>

          <Card className="bg-card border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-8">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        S
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("staff.details") || "Staff details"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("staff.basic_info") || "Basic Information"}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("staff.select_user") || "Select user"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={t("staff.select_user") || "Select user"}
                                searchPlaceholder={
                                  t("staff.search_users") || t("search_users") || "Search..."
                                }
                                onSearch={setUserSearchTerm}
                                isLoading={usersLoading}
                                emptyMessage={t("staff.no_users_found") || "No users found"}
                                allowClear={!isEditMode && !!field.value}
                                onClear={() => field.onChange(undefined)}
                                disabled={isEditMode}
                                dir={dir}
                              >
                                {userOptions.length ? (
                                  userOptions.map((user) => {
                                    const label =
                                      user.fullName ||
                                      [user.firstName, user.lastName]
                                        .filter(Boolean)
                                        .join(" ")
                                        .trim() ||
                                      user.email;
                                    return (
                                      <SearchableSelectItem
                                        key={user.id}
                                        value={String(user.id)}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {label}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {user.email}
                                          </span>
                                        </div>
                                      </SearchableSelectItem>
                                    );
                                  })
                                ) : (
                                  <SearchableSelectEmpty
                                    message={t("staff.no_users_found") || "No users found"}
                                  />
                                )}
                              </SearchableSelect>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("staff.display_name") || "Display name"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("staff.enter_display_name") || "Display name"
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
                        C
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("staff.commission") || "Commission"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("staff.commission_details") || "Commission Details"}
                        </h3>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="commissionPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-[var(--color-text-main)]">
                            {t("staff.commission_percent") || "Commission percent"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              {...field}
                              placeholder={
                                t("staff.enter_commission_percent") || "0"
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        K
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("staff.skills") || "Skills"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("staff.skills_management") || "Skills"}
                        </h3>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-[var(--color-text-main)]">
                            {t("staff.skills") || "Skills"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={
                                t("staff.skills_hint") ||
                                "Comma-separated skills or JSON object"
                              }
                            />
                          </FormControl>
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
                      onClick={() => navigate("/staff")}
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
                              {t("staff.update") || "Update staff"}
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
                              {t("staff.create") || "Create staff"}
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

export default StaffFormPage;
