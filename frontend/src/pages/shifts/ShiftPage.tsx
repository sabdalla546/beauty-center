/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";

import CompactHeader from "@/components/common/CompactHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useCloseShift, useOpenShift } from "@/hooks/shifts/useShiftMutations";
import { useMyOpenShift } from "@/hooks/shifts/useShifts";
import {
  closeShiftFormSchema,
  openShiftFormSchema,
  type CloseShiftFormSchema,
  type OpenShiftFormSchema,
} from "@/pages/shifts/schemas/shiftFormSchema";
import type { ShiftCloseSummary } from "@/pages/shifts/types";

const formatDateTime = (value?: string | null, locale = enUS) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM d, yyyy h:mm a", { locale });
};

const normalizeNotes = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toFils = (kwd?: number | null) => {
  const numeric = Number(kwd ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 1000);
};

const formatKwd = (valueFils?: number | null, locale = "en") => {
  const numeric = Number(valueFils ?? 0);
  const kwd = Number.isFinite(numeric) ? numeric / 1000 : 0;
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(kwd);
  } catch {
    return kwd.toFixed(3);
  }
};

const ShiftPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = useMemo(
    () => (i18n.language === "ar" ? ar : enUS),
    [i18n.language],
  );

  const canOpen = useHasPermission("shifts.open");
  const canClose = useHasPermission("shifts.close");

  const { data, isLoading } = useMyOpenShift();
  const openShift = data?.data ?? null;

  const openMutation = useOpenShift();
  const closeMutation = useCloseShift();
  const closeSummary = (closeMutation.data?.data?.data ?? null) as
    | ShiftCloseSummary
    | null;

  const openForm = useForm<OpenShiftFormSchema>({
    resolver: zodResolver(openShiftFormSchema) as any,
    defaultValues: {
      openingCashKwd: 0,
      notes: "",
    },
  });

  const closeForm = useForm<CloseShiftFormSchema>({
    resolver: zodResolver(closeShiftFormSchema) as any,
    defaultValues: {
      closingCashKwd: 0,
      notes: "",
    },
  });

  const onOpenSubmit: SubmitHandler<OpenShiftFormSchema> = (values) => {
    closeMutation.reset();
    openMutation.mutate({
      openingCashFils: toFils(values.openingCashKwd),
      notes: normalizeNotes(values.notes),
    }, {
      onSuccess: () => {
        openForm.reset({
          openingCashKwd: 0,
          notes: "",
        });
      },
    });
  };

  const onCloseSubmit: SubmitHandler<CloseShiftFormSchema> = (values) => {
    if (!openShift?.id) return;
    closeMutation.mutate({
      shiftId: openShift.id,
      closingCashKwd: Number(values.closingCashKwd ?? 0),
      notes: normalizeNotes(values.notes),
    }, {
      onSuccess: () => {
        closeForm.reset({
          closingCashKwd: 0,
          notes: "",
        });
      },
    });
  };

  const varianceClass =
    closeSummary?.varianceFils === 0
      ? "text-muted-foreground"
      : closeSummary?.varianceFils && closeSummary.varianceFils > 0
        ? "text-emerald-600"
        : "text-red-600";

  const headerTitle = openShift
    ? t("shifts.close_shift") || "Close shift"
    : t("shifts.open_shift") || "Open shift";
  const headerSubtitle = openShift
    ? t("shifts.close_description") ||
      "Close your active shift and reconcile cash."
    : t("shifts.open_description") || "Start a new shift and track cash.";

  return (
    <ProtectedComponent anyOf={["shifts.open", "shifts.close", "shifts.read"]}>
      <div className="min-h-screen space-y-4 bg-background p-4 text-foreground">
        <CompactHeader
          icon={<Clock className="h-5 w-5 text-primary" />}
          title={headerTitle}
          subtitle={headerSubtitle}
        />

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <ClipLoader size={50} color="hsl(var(--primary))" />
          </div>
        ) : null}

        {closeSummary ? (
          <Card className="rounded-xl border-border bg-card shadow-sm">
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.close_summary") || "Close summary"}
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("shifts.shift_id") || "Shift"} #{closeSummary.shiftId}
                  </h2>
                </div>
                <Badge className="border border-primary/20 bg-primary/10 text-primary">
                  {t("shifts.status_closed") || "Closed"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.opened_at") || "Opened at"}
                  </p>
                  <p className="text-sm font-medium">
                    {formatDateTime(closeSummary.openedAt, dateLocale)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.closed_at") || "Closed at"}
                  </p>
                  <p className="text-sm font-medium">
                    {formatDateTime(closeSummary.closedAt, dateLocale)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.starting_cash_kwd") || "Starting cash (KWD)"}
                  </p>
                  <p className="text-sm font-medium">
                    {formatKwd(closeSummary.openingCashFils, i18n.language)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.cash_payments_cents") || "Cash payments (fils)"}
                  </p>
                  <p className="text-sm font-medium">
                    {closeSummary.sumCashFils}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.expected_cash_cents") || "Expected cash (fils)"}
                  </p>
                  <p className="text-sm font-medium">
                    {closeSummary.expectedCashFils}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.ending_cash_cents") || "Ending cash (fils)"}
                  </p>
                  <p className="text-sm font-medium">
                    {closeSummary.closingCashFils}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3 md:col-span-3">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.difference_cents") || "Difference (fils)"}
                  </p>
                  <p className={`text-sm font-semibold ${varianceClass}`}>
                    {closeSummary.varianceFils}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="min-w-[140px]"
                  onClick={() => navigate("/shifts/summary")}
                >
                  {t("shifts.shift_summary") || "Shift summary"}
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {!isLoading && openShift ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="rounded-xl border-border bg-card shadow-sm">
              <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("shifts.active_shift") || "Active shift"}
                    </p>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t("shifts.shift_id") || "Shift"} #{openShift.id}
                    </h2>
                  </div>
                  <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-600">
                    {t("shifts.status_open") || "Open"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("shifts.opened_at") || "Opened at"}
                    </p>
                    <p className="text-sm font-medium">
                      {formatDateTime(openShift.openedAt, dateLocale)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("shifts.starting_cash_kwd") || "Starting cash (KWD)"}
                    </p>
                    <p className="text-sm font-medium">
                      {formatKwd(openShift.openingCashFils, i18n.language)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("shifts.notes") || "Notes"}
                    </p>
                    <p className="text-sm font-medium">
                      {openShift.notes || (t("shifts.no_notes") || "No notes")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="min-w-[140px]"
                    onClick={() => navigate("/shifts/summary")}
                  >
                    {t("shifts.shift_summary") || "Shift summary"}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border-border bg-card shadow-sm">
              <div className="space-y-6 p-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("shifts.close_shift_now") || "Close shift"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("shifts.close_shift_hint") ||
                      "Enter the cash counted at the end of the shift."}
                  </p>
                </div>

                {canClose ? (
                  <Form {...closeForm}>
                    <form
                      onSubmit={closeForm.handleSubmit(onCloseSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={closeForm.control}
                        name="closingCashKwd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("shifts.ending_cash_kwd") ||
                                "Ending cash (KWD)"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step={0.001}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={closeForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("shifts.notes") || "Notes"}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("shifts.enter_notes") || "Optional notes"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          type="submit"
                          disabled={isLoading || closeMutation.isPending}
                        >
                          {closeMutation.isPending ? (
                            <span className="flex items-center gap-2">
                              <ClipLoader
                                size={16}
                                color="hsl(var(--primary-foreground))"
                              />
                              {t("shifts.processing") || "Processing"}
                            </span>
                          ) : (
                            t("shifts.close_now") || "Close shift"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    {t("shifts.close_permission_required") ||
                      "You do not have permission to close this shift."}
                  </div>
                )}
              </div>
            </Card>
          </div>
        ) : null}

        {!isLoading && !openShift ? (
          <Card className="rounded-xl border-border bg-card shadow-sm">
            <div className="space-y-6 p-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {closeSummary
                    ? t("shifts.open_shift_now") || "Open a new shift"
                    : t("shifts.no_open_shift") || "No open shift"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {closeSummary
                    ? t("shifts.open_shift_hint") ||
                      "Enter starting cash and optional notes."
                    : t("shifts.no_open_shift_hint") ||
                      "Open a shift to start tracking cash."}
                </p>
              </div>

              {canOpen ? (
                <Form {...openForm}>
                  <form
                    onSubmit={openForm.handleSubmit(onOpenSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={openForm.control}
                        name="openingCashKwd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("shifts.starting_cash_kwd") ||
                                "Starting cash (KWD)"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step={0.001}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={openForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("shifts.notes") || "Notes"}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("shifts.enter_notes") || "Optional notes"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        type="submit"
                        disabled={isLoading || openMutation.isPending}
                      >
                        {openMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <ClipLoader
                              size={16}
                              color="hsl(var(--primary-foreground))"
                            />
                            {t("shifts.processing") || "Processing"}
                          </span>
                        ) : (
                          t("shifts.open_now") || "Open shift"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {t("shifts.open_permission_required") ||
                    "You do not have permission to open a new shift."}
                </div>
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </ProtectedComponent>
  );
};

export default ShiftPage;
