/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { Lock } from "lucide-react";
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
import { useCloseShift } from "@/hooks/shifts/useShiftMutations";
import {
  closeShiftFormSchema,
  type CloseShiftFormSchema,
} from "@/pages/shifts/schemas/shiftFormSchema";

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

const CloseShiftPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = useMemo(() => (i18n.language === "ar" ? ar : enUS), [i18n.language]);

  const { data, isLoading } = useMyOpenShift();
  const openShift = data?.data ?? null;

  const closeMutation = useCloseShift();
  const closeSummary = closeMutation.data?.data?.data ?? null;

  const form = useForm<CloseShiftFormSchema>({
    resolver: zodResolver(closeShiftFormSchema) as any,
    defaultValues: {
      closingCashKwd: 0,
      notes: "",
    },
  });

  const onSubmit: SubmitHandler<CloseShiftFormSchema> = (values) => {
    if (!openShift?.id) return;
    closeMutation.mutate({
      shiftId: openShift.id,
      closingCashKwd: Number(values.closingCashKwd ?? 0),
      notes: normalizeNotes(values.notes),
    });
  };

  const isBusy = isLoading || closeMutation.isPending;
  const diffClass =
    closeSummary?.varianceFils === 0
      ? "text-muted-foreground"
      : closeSummary?.varianceFils && closeSummary.varianceFils > 0
        ? "text-emerald-600"
        : "text-red-600";

  return (
    <ProtectedComponent permission="shifts.close">
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<Lock className="w-5 h-5 text-primary" />}
          title={t("shifts.close_shift") || "Close shift"}
          subtitle={
            t("shifts.close_description") ||
            "Close your active shift and reconcile cash."
          }
        />

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <ClipLoader size={50} color="hsl(var(--primary))" />
          </div>
        ) : null}

        {closeSummary ? (
          <Card className="bg-card border-border rounded-xl shadow-sm">
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.close_summary") || "Close summary"}
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("shifts.shift_id") || "Shift"} #{closeSummary.shiftId}
                  </h2>
                </div>
                <Badge className="bg-primary/10 text-primary border border-primary/20">
                  {t("shifts.status_closed") || "Closed"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {t("shifts.starting_cash_cents") ||
                      "Starting cash (fils)"}
                  </p>
                  <p className="text-sm font-medium">
                    {closeSummary.openingCashFils}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.cash_payments_cents") ||
                      "Cash payments (fils)"}
                  </p>
                  <p className="text-sm font-medium">
                    {closeSummary.sumCashFils}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.expected_cash_cents") ||
                      "Expected cash (fils)"}
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
                  <p className={`text-sm font-semibold ${diffClass}`}>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card border-border rounded-xl shadow-sm">
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.active_shift") || "Active shift"}
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("shifts.shift_id") || "Shift"} #{openShift.id}
                  </h2>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("shifts.opened_at") || "Opened at"}
                    </span>
                    <span className="font-medium">
                      {formatDateTime(openShift.openedAt, dateLocale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("shifts.starting_cash_cents") ||
                        "Starting cash (fils)"}
                    </span>
                    <span className="font-medium">
                      {openShift.openingCashFils ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("shifts.notes") || "Notes"}
                    </span>
                    <span className="font-medium">
                      {openShift.notes ||
                        (t("shifts.no_notes") || "No notes")}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-card border-border rounded-xl shadow-sm">
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("shifts.close_shift_now") || "Close shift"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("shifts.close_shift_hint") ||
                      "Enter the cash counted at the end of the shift."}
                  </p>
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                      <Button type="submit" disabled={isBusy}>
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
              </div>
            </Card>
          </div>
        ) : null}

        {!isLoading && !openShift && !closeSummary ? (
          <Card className="bg-card border-border rounded-xl shadow-sm">
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {t("shifts.no_open_shift") || "No open shift"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("shifts.no_open_shift_hint") ||
                    "Open a shift to start tracking cash."}
                </p>
              </div>
              <Button onClick={() => navigate("/shifts/open")}>
                {t("shifts.open_shift") || "Open shift"}
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </ProtectedComponent>
  );
};

export default CloseShiftPage;
