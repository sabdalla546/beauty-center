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
import { useOpenShift } from "@/hooks/shifts/useShiftMutations";
import {
  openShiftFormSchema,
  type OpenShiftFormSchema,
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

const OpenShiftPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = useMemo(() => (i18n.language === "ar" ? ar : enUS), [i18n.language]);

  const { data, isLoading } = useMyOpenShift();
  const openShift = data?.data ?? null;

  const openMutation = useOpenShift();

  const form = useForm<OpenShiftFormSchema>({
    resolver: zodResolver(openShiftFormSchema) as any,
    defaultValues: {
      openingCashKwd: 0,
      notes: "",
    },
  });

  const onSubmit: SubmitHandler<OpenShiftFormSchema> = (values) => {
    openMutation.mutate({
      openingCashFils: toFils(values.openingCashKwd),
      notes: normalizeNotes(values.notes),
    });
  };

  const isBusy = isLoading || openMutation.isPending;

  return (
    <ProtectedComponent permission="shifts.open">
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<Clock className="w-5 h-5 text-primary" />}
          title={t("shifts.open_shift") || "Open shift"}
          subtitle={
            t("shifts.open_description") ||
            "Start a new shift and track cash."
          }
        />

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <ClipLoader size={50} color="hsl(var(--primary))" />
          </div>
        ) : openShift ? (
          <Card className="bg-card border-border rounded-xl shadow-sm">
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("shifts.active_shift") || "Active shift"}
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("shifts.shift_id") || "Shift"} #{openShift.id}
                  </h2>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                  {t("shifts.status_open") || "Open"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {t("shifts.starting_cash_kwd") ||
                      "Starting cash (KWD)"}
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
                    {openShift.notes ||
                      (t("shifts.no_notes") || "No notes")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-w-[140px]"
                  onClick={() => navigate("/shifts/close")}
                >
                  {t("shifts.close_shift") || "Close shift"}
                </Button>
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
        ) : (
          <Card className="bg-card border-border rounded-xl shadow-sm">
            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("shifts.open_shift_now") || "Open a new shift"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("shifts.open_shift_hint") ||
                    "Enter starting cash and optional notes."}
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="submit" disabled={isBusy}>
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
            </div>
          </Card>
        )}
      </div>
    </ProtectedComponent>
  );
};

export default OpenShiftPage;
