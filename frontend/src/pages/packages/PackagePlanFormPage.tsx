/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Gift } from "lucide-react";
import { ClipLoader } from "react-spinners";
import { useQueryClient } from "@tanstack/react-query";

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
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";

import {
  useCreatePackagePlan,
  useUpdatePackagePlan,
  type PackagePlanFormValues,
} from "@/hooks/packages/usePackagePlanMutations";
import { useServices } from "@/hooks/services/useServices";
import {
  packagePlanFormSchema,
  type PackagePlanFormSchema,
} from "@/pages/packages/schemas/packagePlanFormSchema";
import type { PackagePlan, PackagePlansResponse } from "@/pages/packages/types";

const toPriceKwd = (plan?: PackagePlan | null) => {
  if (!plan) return 0;
  if (plan.priceKwd !== undefined && plan.priceKwd !== null)
    return Number(plan.priceKwd);
  const priceFils = Number(plan.priceFils ?? plan.priceCents ?? 0);
  return Number.isFinite(priceFils) ? priceFils / 1000 : 0;
};

const normalizeDescription = (value?: string) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const PackagePlanFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const location = useLocation();
  const queryClient = useQueryClient();

  const [serviceSearch, setServiceSearch] = useState("");
  const servicesQuery = useServices({ searchQuery: serviceSearch });
  const services = servicesQuery.data?.data ?? [];

  const locationPlan = (location.state as { plan?: PackagePlan } | null)?.plan;

  const cachedPlan = useMemo(() => {
    if (!id) return undefined;
    const cached = queryClient.getQueriesData<PackagePlansResponse>({
      queryKey: ["package-plans"],
    });
    for (const [, data] of cached) {
      const match = data?.data?.find((plan) => String(plan.id) === String(id));
      if (match) return match;
    }
    return undefined;
  }, [id, queryClient]);

  const plan = locationPlan || cachedPlan;

  const createMutation = useCreatePackagePlan();
  const updateMutation = useUpdatePackagePlan(id);

  const form = useForm<PackagePlanFormSchema>({
    resolver: zodResolver(packagePlanFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      priceKwd: 0,
      sessionsCount: 1,
      validDays: 30,
      serviceId: undefined,
    },
  });

  useEffect(() => {
    if (isEditMode && plan) {
      form.reset({
        name: plan.name ?? "",
        description: plan.description ?? "",
        priceKwd: toPriceKwd(plan),
        sessionsCount: plan.sessionsCount ?? 1,
        validDays: plan.validDays ?? 30,
        serviceId: plan.serviceId ?? undefined,
      });
    }
  }, [isEditMode, plan, form]);

  const onSubmit: SubmitHandler<PackagePlanFormSchema> = (values) => {
    const payload: PackagePlanFormValues = {
      name: values.name,
      description: normalizeDescription(values.description),
      priceKwd: Number(values.priceKwd),
      sessionsCount: Number(values.sessionsCount),
      validDays: Number(values.validDays),
      serviceId:
        values.serviceId !== undefined ? Number(values.serviceId) : null,
    };

    if (isEditMode) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    servicesQuery.isLoading;
  const dir = i18n.dir();

  if (isEditMode && !plan) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="text-lg font-semibold">
            {t("packages.plan_not_loaded") || "Plan not loaded"}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("packages.return_to_list") ||
              "Please return to the plans list and select a plan to edit."}
          </p>
          <Button onClick={() => navigate("/packages/plans")}>
            {t("packages.back_to_plans") || "Back to Plans"}
          </Button>
        </Card>
      </div>
    );
  }

  if (createMutation.isPending || updateMutation.isPending) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader size={50} color="hsl(var(--primary))" />
      </div>
    );
  }

  return (
    <ProtectedComponent
      permission={isEditMode ? "packages.update" : "packages.create"}
    >
      <div className="min-h-screen p-4 my-4 bg-background text-foreground" dir={dir}>
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => navigate("/packages/plans")}
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
            {t("packages.back_to_plans") || "Back to Plans"}
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
                <Gift className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">
                  {isEditMode
                    ? t("packages.edit_plan") || "Edit plan"
                    : t("packages.create_plan") || "Create plan"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("packages.edit_plan_description") ||
                      "Update package plan details."
                    : t("packages.create_plan_description") ||
                      "Create a new package plan for customers."}
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
                        P
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("packages.details") || "Plan details"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("packages.basic_info") || "Basic Information"}
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
                              {t("packages.name") || t("name") || "Name"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("packages.enter_name") || "Plan name"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priceKwd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("packages.price_kwd") || "Price (KWD)"}
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step={0.001} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sessionsCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("packages.sessions") || "Sessions"}
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="validDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("packages.valid_days") || "Valid days"}
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="serviceId"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("packages.service_restriction") ||
                                "Service restriction"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={
                                  t("packages.select_service") ||
                                  "Select service (optional)"
                                }
                                searchPlaceholder={
                                  t("packages.search_services") ||
                                  "Search services..."
                                }
                                onSearch={setServiceSearch}
                                isLoading={servicesQuery.isLoading}
                                emptyMessage={
                                  t("packages.no_services") || "No services found"
                                }
                                allowClear={!!field.value}
                                onClear={() => field.onChange(undefined)}
                                dir={dir}
                              >
                                {services.length ? (
                                  services.map((service) => (
                                    <SearchableSelectItem
                                      key={service.id}
                                      value={String(service.id)}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {service.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {service.durationMinutes ?? 0}{" "}
                                          {t("packages.minutes") || "min"}
                                        </span>
                                      </div>
                                    </SearchableSelectItem>
                                  ))
                                ) : (
                                  <SearchableSelectEmpty
                                    message={
                                      t("packages.no_services") || "No services found"
                                    }
                                  />
                                )}
                              </SearchableSelect>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              {t("packages.service_restriction_hint") ||
                                "Leave empty to allow all services."}
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("packages.description") || "Description"}
                            </FormLabel>
                            <FormControl>
                              <textarea
                                {...field}
                                rows={3}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder={
                                  t("packages.description_placeholder") ||
                                  "Optional details about this plan..."
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[120px]"
                      onClick={() => navigate("/packages/plans")}
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
                    <Button type="submit" disabled={isBusy} className="min-w-[140px]">
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
                              {t("packages.update") || "Update plan"}
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
                              {t("packages.create") || "Create plan"}
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

export default PackagePlanFormPage;
