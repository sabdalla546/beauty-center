/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { ClipLoader } from "react-spinners";
import { BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import CompactHeader from "@/components/common/CompactHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useMyOpenShift } from "@/hooks/shifts/useShifts";
import { useShiftSummary } from "@/hooks/shifts/useShiftMutations";
import {
  shiftSummaryFormSchema,
  type ShiftSummaryFormSchema,
} from "@/pages/shifts/schemas/shiftFormSchema";

const formatDateTime = (value?: string | null, locale = enUS) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM d, yyyy h:mm a", { locale });
};

const formatNumber = (value?: number | null, locale = "en") => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  try {
    return new Intl.NumberFormat(locale).format(numeric);
  } catch {
    return String(numeric);
  }
};

const ShiftSummaryPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = useMemo(() => (i18n.language === "ar" ? ar : enUS), [i18n.language]);

  const { data: openShiftData } = useMyOpenShift();
  const openShift = openShiftData?.data ?? null;

  const summaryMutation = useShiftSummary();
  const summary = summaryMutation.data?.data?.data ?? null;

  const form = useForm<ShiftSummaryFormSchema>({
    resolver: zodResolver(shiftSummaryFormSchema) as any,
    defaultValues: {
      shiftId: 0,
      to: "",
    },
  });

  useEffect(() => {
    if (!openShift?.id) return;
    const current = Number(form.getValues("shiftId") || 0);
    if (!current || current === 0) {
      form.setValue("shiftId", openShift.id);
    }
  }, [openShift, form]);

  const onSubmit: SubmitHandler<ShiftSummaryFormSchema> = (values) => {
    summaryMutation.mutate({
      shiftId: Number(values.shiftId),
      to: values.to || undefined,
    });
  };

  const payments = summary?.paymentsByMethod ?? [];
  const commissions = summary?.commissions?.byStaff ?? [];

  return (
    <ProtectedComponent permission="shifts.read">
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
          title={t("shifts.shift_summary") || "Shift summary"}
          subtitle={
            t("shifts.summary_description") ||
            "Review sales and payment totals for a shift."
          }
        />

        <Card className="bg-card border-border rounded-xl shadow-sm">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("shifts.summary_filters") || "Summary filters"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("shifts.summary_filters_hint") ||
                  "Select a shift and optional end time to load a summary."}
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <FormField
                  control={form.control}
                  name="shiftId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("shifts.shift_id") || "Shift ID"}</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("shifts.to_date") || "To date/time"}</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  <Button type="submit" disabled={summaryMutation.isPending}>
                    {summaryMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <ClipLoader
                          size={16}
                          color="hsl(var(--primary-foreground))"
                        />
                        {t("shifts.processing") || "Processing"}
                      </span>
                    ) : (
                      t("shifts.load_summary") || "Load summary"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </Card>

        {summary ? (
          <>
            <Card className="bg-card border-border rounded-xl shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("shifts.summary_for_shift") || "Summary for shift"}
                    </p>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t("shifts.shift_id") || "Shift"} #{summary.shiftId}
                    </h2>
                  </div>
                  <Badge className="bg-primary/10 text-primary border border-primary/20">
                    {t("shifts.status_closed") || "Closed"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("shifts.summary_range") || "Summary range"}
                    </p>
                    <p className="text-sm font-medium">
                      {formatDateTime(summary.period?.from, dateLocale)} -{" "}
                      {formatDateTime(summary.period?.to, dateLocale)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("shifts.net_sales_fils") || "Net sales (fils)"}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatNumber(summary.sales?.netFils, i18n.language)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card border-border rounded-xl shadow-sm">
                <div className="p-5 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.gross_sales_fils") || "Gross sales (fils)"}
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(summary.sales?.grossFils, i18n.language)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card border-border rounded-xl shadow-sm">
                <div className="p-5 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.refunds_fils") || "Refunds (fils)"}
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(summary.sales?.refundsFils, i18n.language)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card border-border rounded-xl shadow-sm">
                <div className="p-5 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.net_sales_fils") || "Net sales (fils)"}
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(summary.sales?.netFils, i18n.language)}
                  </p>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-card border-border rounded-xl shadow-sm">
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold">
                    {t("shifts.cash_control") || "Cash control"}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("shifts.starting_cash_cents") ||
                          "Starting cash (fils)"}
                      </p>
                      <p className="font-medium">
                        {formatNumber(
                          summary.cashControl?.openingCashFils,
                          i18n.language,
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("shifts.expected_cash_cents") ||
                          "Expected cash (fils)"}
                      </p>
                      <p className="font-medium">
                        {formatNumber(
                          summary.cashControl?.expectedCashFils,
                          i18n.language,
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("shifts.ending_cash_cents") ||
                          "Ending cash (fils)"}
                      </p>
                      <p className="font-medium">
                        {formatNumber(
                          summary.cashControl?.actualCashFils,
                          i18n.language,
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("shifts.difference_cents") || "Difference (fils)"}
                      </p>
                      <p className="font-semibold">
                        {formatNumber(
                          summary.cashControl?.varianceFils,
                          i18n.language,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-card border-border rounded-xl shadow-sm">
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold">
                    {t("shifts.payments_summary") || "Payments summary"}
                  </h3>
                  {payments.length ? (
                    <div className="space-y-3">
                      {payments.map((method) => (
                        <div
                          key={method.methodId}
                          className="rounded-lg border border-border bg-muted/40 p-3 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge className="bg-primary/10 text-primary border border-primary/20">
                              {method.methodName || method.methodCode}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {t("shifts.net_sales_fils") || "Net sales (fils)"}:{" "}
                              <span className="text-foreground">
                                {formatNumber(method.netFils, i18n.language)}
                              </span>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <span>
                              {t("shifts.sales_fils") || "Sales (fils)"}:{" "}
                              <span className="text-foreground">
                                {formatNumber(method.salesFils, i18n.language)}
                              </span>
                            </span>
                            <span>
                              {t("shifts.refunds_fils") || "Refunds (fils)"}:{" "}
                              <span className="text-foreground">
                                {formatNumber(method.refundsFils, i18n.language)}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("shifts.no_payments") ||
                        "No payments in this range."}
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <Card className="bg-card border-border rounded-xl shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {t("shifts.commissions") || "Commissions"}
                  </h3>
                  <Badge className="bg-primary/10 text-primary border border-primary/20">
                    {t("shifts.total") || "Total"}:{" "}
                    {formatNumber(
                      summary.commissions?.totalCommissionFils,
                      i18n.language,
                    )}
                  </Badge>
                </div>
                {commissions.length ? (
                  <div className="space-y-3">
                    {commissions.map((entry) => (
                      <div
                        key={entry.staffId}
                        className="rounded-lg border border-border bg-muted/40 p-3 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{entry.staffName}</span>
                          <span className="text-sm text-foreground">
                            {formatNumber(entry.commissionFils, i18n.language)}{" "}
                            {t("shifts.fils") || "fils"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("shifts.items_count") || "Items"}:{" "}
                          {entry.breakdown?.length ?? 0}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("shifts.no_commissions") || "No commissions available."}
                  </p>
                )}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </ProtectedComponent>
  );
};

export default ShiftSummaryPage;
