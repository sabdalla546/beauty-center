import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
} from "lucide-react";

import CompactHeader from "@/components/common/CompactHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePackagePlans } from "@/hooks/packages/usePackagePlans";
import { usePaymentMethods } from "@/hooks/paymentMethods/usePaymentMethods";
import { useProducts } from "@/hooks/products/useProducts";
import {
  downloadReportFile,
  useReportData,
  type ReportFilters,
  type ReportType,
} from "@/hooks/reports/useReports";
import { useRooms } from "@/hooks/rooms/useRooms";
import { useServices } from "@/hooks/services/useServices";
import { useStaff } from "@/hooks/staff/useStaff";

type ReportOption = {
  id: ReportType;
  labelKey: string;
  descriptionKey: string;
};

type ChartKind = "bar" | "line" | "donut";

type SectionDefinition = {
  title: string;
  value: unknown;
  chart?: ChartKind;
};

type DisplayProps = {
  title: string;
  value: unknown;
};

type ChartPoint = {
  label: string;
  value: number;
  metricKey: string;
};

type LabelFormatter = (key: string) => string;
type MetricFormatter = (key: string, value: unknown) => string;
type ChartPointGetter = (value: unknown) => ChartPoint[];

const REPORT_OPTIONS: ReportOption[] = [
  { id: "overview", labelKey: "reports.overview", descriptionKey: "reports.overview_description" },
  { id: "sales", labelKey: "reports.sales", descriptionKey: "reports.sales_description" },
  { id: "payments", labelKey: "reports.payments", descriptionKey: "reports.payments_description" },
  { id: "shifts", labelKey: "reports.shifts", descriptionKey: "reports.shifts_description" },
  { id: "appointments", labelKey: "reports.appointments", descriptionKey: "reports.appointments_description" },
  { id: "inventory", labelKey: "reports.inventory", descriptionKey: "reports.inventory_description" },
  { id: "packages", labelKey: "reports.packages", descriptionKey: "reports.packages_description" },
];

const CHART_PALETTE = ["#0f766e", "#f59e0b", "#2563eb", "#dc2626", "#7c3aed", "#059669", "#ea580c", "#4f46e5"];

const FIXED_CHART_COLORS: Record<string, string> = {
  cash: "#0f766e",
  knet: "#0284c7",
  card: "#2563eb",
  open: "#f59e0b",
  opened: "#f59e0b",
  pending: "#f59e0b",
  booked: "#f59e0b",
  closed: "#64748b",
  active: "#059669",
  completed: "#059669",
  paid: "#059669",
  unpaid: "#dc2626",
  cancelled: "#dc2626",
  canceled: "#dc2626",
  refunded: "#dc2626",
  refund: "#dc2626",
  expired: "#ea580c",
  used_up: "#7c3aed",
  sale: "#ef4444",
  purchase: "#22c55e",
  usage: "#ef4444",
  service: "#14b8a6",
  product: "#0ea5e9",
  package: "#7c3aed",
};

const createDefaultFilters = (): ReportFilters => ({
  from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
  to: new Date().toISOString().slice(0, 10),
  groupBy: "day",
  shiftId: "",
  paymentMethodId: "",
  staffId: "",
  roomId: "",
  serviceId: "",
  productId: "",
  reason: "",
  status: "",
  planId: "",
});

const isPrimitive = (value: unknown) =>
  value == null || ["string", "number", "boolean"].includes(typeof value);

const toLabel = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const normalizeLookupKey = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[.\s-]+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .toLowerCase();

const isCurrencyKey = (key: string) =>
  /(fils|kwd|amount|subtotal|discount|total|paid|remaining|covered|revenue|sales|net|cash|variance)/i.test(key) &&
  !/(count|qty|quantity|sessions|items|orders|appointments)/i.test(key);

const isDateKey = (key: string) =>
  /(date|day|month|year|createdat|updatedat|startat|endat|usedat|openedat|closedat|time|period)/i.test(key);

const shouldKeepRawValue = (key: string) =>
  /(id|code|sku|barcode|reference|ref|nameen|namear|methodnameen|methodnamear)$/i.test(
    normalizeLookupKey(key),
  );

const normalizeChartLabel = (label: string) =>
  label.toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();

const getChartColor = (label: string, index: number) =>
  FIXED_CHART_COLORS[normalizeChartLabel(label)] ||
  CHART_PALETTE[index % CHART_PALETTE.length];

const buildRequestFilters = (
  reportType: ReportType,
  filters: ReportFilters,
): ReportFilters => {
  const base: ReportFilters = { from: filters.from, to: filters.to };

  if (["sales", "payments", "appointments", "inventory", "packages"].includes(reportType)) {
    base.groupBy = filters.groupBy || "day";
  }

  if (["overview", "sales", "payments"].includes(reportType)) {
    base.shiftId = filters.shiftId;
  }

  if (reportType === "payments") {
    base.paymentMethodId = filters.paymentMethodId;
  }

  if (reportType === "appointments") {
    base.staffId = filters.staffId;
    base.roomId = filters.roomId;
    base.serviceId = filters.serviceId;
  }

  if (reportType === "inventory") {
    base.productId = filters.productId;
    base.reason = filters.reason;
  }

  if (reportType === "packages") {
    base.planId = filters.planId;
    base.status = filters.status;
    base.serviceId = filters.serviceId;
  }

  if (reportType === "shifts") {
    base.status = filters.status;
  }

  return base;
};

const SummaryGrid = ({
  title,
  value,
  getLabel,
  formatMetricValue,
}: {
  title: string;
  value: Record<string, unknown>;
  getLabel: LabelFormatter;
  formatMetricValue: MetricFormatter;
}) => (
  <Card className="border-border bg-card shadow-sm">
    <div className="space-y-4 p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Object.entries(value).map(([key, item]) => (
          <div
            key={key}
            className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {getLabel(key)}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatMetricValue(key, item)}
            </p>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

const TableSection = ({
  title,
  rows,
  getLabel,
  formatMetricValue,
}: {
  title: string;
  rows: Record<string, unknown>[];
  getLabel: LabelFormatter;
  formatMetricValue: MetricFormatter;
}) => {
  if (!rows.length) {
    return null;
  }

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 8);

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="space-y-4 p-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{getLabel(column)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column} className="px-4 py-3">
                      {formatMetricValue(column, row[column])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};

const SectionRenderer = ({
  title,
  value,
  getLabel,
  formatMetricValue,
}: DisplayProps & {
  getLabel: LabelFormatter;
  formatMetricValue: MetricFormatter;
}) => {
  if (Array.isArray(value)) {
    return (
      <TableSection
        title={title}
        rows={value.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object",
        )}
        getLabel={getLabel}
        formatMetricValue={formatMetricValue}
      />
    );
  }

  if (value && typeof value === "object") {
    return (
      <SummaryGrid
        title={title}
        value={Object.fromEntries(
          Object.entries(value as Record<string, unknown>).filter(([, item]) =>
            isPrimitive(item),
          ),
        )}
        getLabel={getLabel}
        formatMetricValue={formatMetricValue}
      />
    );
  }

  return null;
};

const ChartPopover = ({
  point,
  color,
  align = "center",
  getLabel,
  formatMetricValue,
}: {
  point: ChartPoint;
  color: string;
  align?: "left" | "center" | "right";
  getLabel: LabelFormatter;
  formatMetricValue: MetricFormatter;
}) => {
  const alignClass =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      className={`pointer-events-none invisible absolute bottom-full z-20 mb-2 min-w-40 translate-y-1 rounded-xl border border-border/80 bg-background/95 px-3 py-2 text-left opacity-0 shadow-xl backdrop-blur transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 ${alignClass}`}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {point.label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">
        {formatMetricValue(point.metricKey, point.value)}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {getLabel(point.metricKey)}
      </div>
    </div>
  );
};

const BarChartSection = ({
  title,
  points,
  getLabel,
  formatMetricValue,
}: {
  title: string;
  points: ChartPoint[];
  getLabel: LabelFormatter;
  formatMetricValue: MetricFormatter;
}) => {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="space-y-4 p-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex h-56 items-end gap-3 overflow-x-auto pb-2">
          {points.map((point, index) => {
            const color = getChartColor(point.label, index);

            return (
              <div
                key={`${point.label}-${index}`}
                className="group relative flex min-w-20 flex-1 flex-col items-center justify-end gap-2"
              >
                <ChartPopover
                  point={point}
                  color={color}
                  getLabel={getLabel}
                  formatMetricValue={formatMetricValue}
                />
                <div
                  className="w-full rounded-t-xl"
                  style={{
                    height: `${Math.max((point.value / max) * 160, 10)}px`,
                    backgroundColor: color,
                  }}
                />
                <p className="text-xs font-semibold text-foreground">
                  {formatMetricValue(point.metricKey, point.value)}
                </p>
                <p className="line-clamp-2 text-center text-[11px] text-muted-foreground">
                  {point.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

const LineChartSection = ({
  title,
  points,
  getLabel,
  formatMetricValue,
}: {
  title: string;
  points: ChartPoint[];
  getLabel: LabelFormatter;
  formatMetricValue: MetricFormatter;
}) => {
  const max = Math.max(...points.map((point) => point.value), 1);
  const path = points
    .map((point, index) => {
      const x = points.length === 1 ? 140 : index * (280 / (points.length - 1));
      const y = 160 - (point.value / max) * 140;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="space-y-4 p-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <svg viewBox="0 0 280 180" className="h-56 w-full overflow-visible">
          <path d="M0 160 H280" stroke="currentColor" className="text-border" />
          <polyline fill="none" points={path} stroke={getChartColor(title, 0)} strokeWidth="4" />
          {points.map((point, index) => {
            const x =
              points.length === 1 ? 140 : index * (280 / (points.length - 1));
            const y = 160 - (point.value / max) * 140;

            return (
              <g key={`${point.label}-${index}`}>
                <circle cx={x} cy={y} r="5" fill={getChartColor(point.label, index)} />
                <text
                  x={x}
                  y="176"
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
          {points.map((point, index) => {
            const color = getChartColor(point.label, index);

            return (
              <div
                key={`${point.label}-${index}`}
                className="group relative rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
              >
                <ChartPopover
                  point={point}
                  color={color}
                  align="left"
                  getLabel={getLabel}
                  formatMetricValue={formatMetricValue}
                />
                <div className="line-clamp-1">{point.label}</div>
                <div className="font-semibold" style={{ color }}>
                  {formatMetricValue(point.metricKey, point.value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

const DonutChartSection = ({
  title,
  points,
  getLabel,
  formatMetricValue,
  totalLabel,
}: {
  title: string;
  points: ChartPoint[];
  getLabel: LabelFormatter;
  formatMetricValue: MetricFormatter;
  totalLabel: string;
}) => {
  const colors = points.map((point, index) => getChartColor(point.label, index));
  const total = Math.max(points.reduce((sum, point) => sum + point.value, 0), 1);
  const gradient = points
    .map((point, index) => {
      const start =
        (points.slice(0, index).reduce((sum, item) => sum + item.value, 0) / total) *
        360;
      const end =
        (points.slice(0, index + 1).reduce((sum, item) => sum + item.value, 0) /
          total) *
        360;
      return `${colors[index]} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="space-y-4 p-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
          <div
            className="mx-auto flex h-56 w-56 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${gradient})` }}
          >
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-card text-center">
              <div className="text-xs text-muted-foreground">{totalLabel}</div>
              <div className="text-sm font-semibold text-foreground">
                {formatMetricValue(points[0]?.metricKey ?? "value", total)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {points.map((point, index) => {
              const color = colors[index];

              return (
                <div
                  key={`${point.label}-${index}`}
                  className="group relative flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <ChartPopover
                    point={point}
                    color={color}
                    align="right"
                    getLabel={getLabel}
                    formatMetricValue={formatMetricValue}
                  />
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm text-foreground">{point.label}</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatMetricValue(point.metricKey, point.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

const ChartRenderer = ({
  title,
  value,
  chart,
  getChartPoints,
  getLabel,
  formatMetricValue,
  totalLabel,
}: DisplayProps & {
  chart?: ChartKind;
  getChartPoints: ChartPointGetter;
  getLabel: LabelFormatter;
  formatMetricValue: MetricFormatter;
  totalLabel: string;
}) => {
  const points = getChartPoints(value);

  if (!chart || points.length < 2) {
    return null;
  }

  if (chart === "line") {
    return (
      <LineChartSection
        title={title}
        points={points}
        getLabel={getLabel}
        formatMetricValue={formatMetricValue}
      />
    );
  }

  if (chart === "donut") {
    return (
      <DonutChartSection
        title={title}
        points={points}
        getLabel={getLabel}
        formatMetricValue={formatMetricValue}
        totalLabel={totalLabel}
      />
    );
  }

  return (
    <BarChartSection
      title={title}
      points={points}
      getLabel={getLabel}
      formatMetricValue={formatMetricValue}
    />
  );
};

const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";

  const [reportType, setReportType] = useState<ReportType>("overview");
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(() =>
    createDefaultFilters(),
  );
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(() =>
    createDefaultFilters(),
  );
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const paymentMethodsQ = usePaymentMethods({ activeOnly: false });
  const staffQ = useStaff({ currentPage: 1, itemsPerPage: 100, searchQuery: "" });
  const roomsQ = useRooms({ searchQuery: "" });
  const servicesQ = useServices({ searchQuery: "" });
  const productsQ = useProducts({ currentPage: 1, itemsPerPage: 100, searchQuery: "" });
  const packagePlansQ = usePackagePlans({ searchQuery: "", isActive: null });

  const requestFilters = useMemo(
    () => buildRequestFilters(reportType, appliedFilters),
    [appliedFilters, reportType],
  );
  const reportQuery = useReportData(reportType, requestFilters);
  const data = reportQuery.data as Record<string, unknown> | null;

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language, {
        style: "currency",
        currency: "KWD",
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }),
    [i18n.language],
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language],
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [i18n.language],
  );
  const shortDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        day: "numeric",
      }),
    [i18n.language],
  );

  const tx = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const tryTranslate = (key: string) => {
    const value = t(key);
    return value === key ? null : value;
  };

  const getLabel: LabelFormatter = (key) => {
    const normalized = normalizeLookupKey(key);
    return (
      tryTranslate(`reports.fields.${normalized}`) ||
      tryTranslate(`reports.${normalized}`) ||
      toLabel(key)
    );
  };

  const getValueLabel = (key: string, rawValue: string) => {
    if (shouldKeepRawValue(key)) {
      return rawValue;
    }

    const normalizedValue = normalizeLookupKey(rawValue);
    return (
      tryTranslate(`reports.values.${normalizedValue}`) ||
      tryTranslate(`reports.${normalizedValue}`) ||
      rawValue
    );
  };

  const formatMetricValue: MetricFormatter = (key, value) => {
    if (value == null || value === "") return "-";
    if (typeof value === "boolean") {
      return value ? tx("reports.yes", "Yes") : tx("reports.no", "No");
    }
    if (typeof value === "number") {
      if (/fils/i.test(key)) return currencyFormatter.format(value / 1000);
      if (/kwd/i.test(key) || isCurrencyKey(key)) {
        return currencyFormatter.format(value);
      }
      return numberFormatter.format(value);
    }
    if (typeof value === "string" && isDateKey(key)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return (value.length <= 10 ? shortDateFormatter : dateFormatter).format(parsed);
      }
    }
    if (typeof value === "string") return getValueLabel(key, value);
    return String(value);
  };

  const getChartPoints: ChartPointGetter = (value) => {
    if (!Array.isArray(value)) return [];

    return value
      .filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object",
      )
      .map((row, index) => {
        const entries = Object.entries(row);
        const localizedNameEntry = entries.find(([key, item]) => {
          if (typeof item !== "string" || !item) return false;
          const normalizedKey = normalizeLookupKey(key);
          return isArabic
            ? /(^|_)name_ar$|(^|_)method_name_ar$/.test(normalizedKey)
            : /(^|_)name_en$|(^|_)method_name_en$/.test(normalizedKey);
        });
        const genericNameEntry = entries.find(
          ([key, item]) => typeof item === "string" && !!item && !/id$/i.test(key),
        );
        const labelEntry = localizedNameEntry || genericNameEntry;
        const numericEntry =
          entries.find(
            ([key, item]) =>
              typeof item === "number" &&
              /(count|total|amount|value|net|sales|orders|appointments|qty|quantity|stock|usage|paid|fils|kwd)/i.test(
                key,
              ),
          ) || entries.find(([, item]) => typeof item === "number");

        const labelKey = String(labelEntry?.[0] ?? entries[0]?.[0] ?? "label");
        const labelValue = labelEntry?.[1] ?? entries[0]?.[1] ?? `#${index + 1}`;

        return {
          label: String(formatMetricValue(labelKey, labelValue)),
          value: Number(numericEntry?.[1] ?? 0),
          metricKey: String(numericEntry?.[0] ?? "value"),
        };
      })
      .filter((point) => Number.isFinite(point.value))
      .slice(0, 8);
  };

  const updateFilter = (key: keyof ReportFilters, value: string) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const handleReset = () => {
    const next = createDefaultFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
  };

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      setExporting(format);
      await downloadReportFile(reportType, requestFilters, format);
      toast({
        title: tx("reports.export_ready", "Export ready"),
        description: `${format === "csv" ? "CSV" : "PDF"} ${tx(
          "reports.export_success_suffix",
          "downloaded successfully.",
        )}`,
      });
    } catch (error) {
      toast({
        title: tx("reports.export_failed", "Export failed"),
        description:
          error instanceof Error
            ? error.message
            : tx("reports.export_error", "Could not export report."),
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const topSummary = (data?.kpis ?? data?.summary ?? null) as Record<
    string,
    unknown
  > | null;

  const sections: SectionDefinition[] = (() => {
    if (!data) return [];
    if (reportType === "overview") {
      return [
        { title: tx("reports.orders_by_status", "Orders by status"), value: data.ordersByStatus ?? [], chart: "donut" },
        { title: tx("reports.appointments_by_status", "Appointments by status"), value: data.appointmentsByStatus ?? [], chart: "donut" },
      ];
    }
    if (reportType === "sales") {
      return [
        { title: tx("reports.timeline", "Timeline"), value: data.timeline ?? [], chart: "line" },
        { title: tx("reports.by_status", "By status"), value: data.byStatus ?? [], chart: "donut" },
        { title: tx("reports.by_line_type", "By line type"), value: data.byLineType ?? [], chart: "donut" },
      ];
    }
    if (reportType === "payments") {
      return [
        { title: tx("reports.timeline", "Timeline"), value: data.timeline ?? [], chart: "line" },
        { title: tx("reports.by_method", "By method"), value: data.byMethod ?? [], chart: "donut" },
      ];
    }
    if (reportType === "shifts") {
      return [{ title: tx("reports.shift_items", "Shift items"), value: data.items ?? [], chart: "bar" }];
    }
    if (reportType === "appointments") {
      return [
        { title: tx("reports.by_status", "By status"), value: data.byStatus ?? [], chart: "donut" },
        { title: tx("reports.timeline", "Timeline"), value: data.timeline ?? [], chart: "line" },
        { title: tx("reports.by_staff", "By staff"), value: data.byStaff ?? [], chart: "bar" },
        { title: tx("reports.by_room", "By room"), value: data.byRoom ?? [], chart: "bar" },
        { title: tx("reports.by_service", "By service"), value: data.byService ?? [], chart: "bar" },
      ];
    }
    if (reportType === "inventory") {
      return [
        { title: tx("reports.timeline", "Timeline"), value: data.timeline ?? [], chart: "line" },
        { title: tx("reports.by_reason", "By reason"), value: data.byReason ?? [], chart: "donut" },
        { title: tx("reports.top_selling_products", "Top selling products"), value: data.topSellingProducts ?? [], chart: "bar" },
        { title: tx("reports.low_stock_products", "Low stock products"), value: data.lowStockProducts ?? [], chart: "bar" },
      ];
    }
    if (reportType === "packages") {
      return [
        { title: tx("reports.by_status", "By status"), value: data.byStatus ?? [], chart: "donut" },
        { title: tx("reports.usage_timeline", "Usage timeline"), value: data.usageTimeline ?? [], chart: "line" },
        { title: tx("reports.by_plan", "By plan"), value: data.byPlan ?? [], chart: "bar" },
        { title: tx("reports.by_service", "By service"), value: data.byService ?? [], chart: "bar" },
      ];
    }
    return Object.entries(data)
      .filter(([key]) => !["filters", "kpis", "summary"].includes(key))
      .map(([key, value]) => ({ title: getLabel(key), value }));
  })();

  return (
    <ProtectedComponent permission="reports.read">
      <div className="min-h-screen space-y-4 bg-background p-4 text-foreground">
        <CompactHeader
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
          title={tx("reports.title", "Reports Center")}
          subtitle={tx("reports.subtitle", "Load operational and financial reports, then export them as CSV or PDF.")}
          right={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="h-4 w-4" />
                {tx("reports.reset", "Reset")}
              </Button>
              <Button variant="outline" onClick={() => handleExport("csv")} disabled={exporting !== null}>
                <FileSpreadsheet className="h-4 w-4" />
                {exporting === "csv" ? tx("reports.exporting", "Exporting...") : tx("reports.export_csv", "Export CSV")}
              </Button>
              <Button onClick={() => handleExport("pdf")} disabled={exporting !== null}>
                <FileText className="h-4 w-4" />
                {exporting === "pdf" ? tx("reports.exporting", "Exporting...") : tx("reports.export_pdf", "Export PDF")}
              </Button>
            </div>
          }
        />

        <Card className="border-border bg-card shadow-sm">
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {REPORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setReportType(option.id)}
                  className={[
                    "rounded-2xl border p-4 text-left transition-all",
                    reportType === option.id
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-muted/30 hover:bg-muted/50",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {tx(option.labelKey, toLabel(option.id))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tx(option.descriptionKey, "")}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{tx("reports.from", "From")}</label>
                <Input type="date" value={draftFilters.from || ""} onChange={(e) => updateFilter("from", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{tx("reports.to", "To")}</label>
                <Input type="date" value={draftFilters.to || ""} onChange={(e) => updateFilter("to", e.target.value)} />
              </div>
              {["sales", "payments", "appointments", "inventory", "packages"].includes(reportType) ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{tx("reports.group_by", "Group by")}</label>
                  <Select value={draftFilters.groupBy || "day"} onValueChange={(value) => updateFilter("groupBy", value)}>
                    <SelectTrigger><SelectValue placeholder={tx("reports.group_by", "Group by")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">{tx("reports.day", "Day")}</SelectItem>
                      <SelectItem value="month">{tx("reports.month", "Month")}</SelectItem>
                      <SelectItem value="year">{tx("reports.year", "Year")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : <div />}
              {["overview", "sales", "payments"].includes(reportType) ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{tx("reports.shift_id", "Shift ID")}</label>
                  <Input value={draftFilters.shiftId || ""} onChange={(e) => updateFilter("shiftId", e.target.value)} placeholder={tx("reports.shift_id_placeholder", "Optional shift id")} />
                </div>
              ) : reportType === "shifts" ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{tx("reports.status", "Status")}</label>
                  <Select value={draftFilters.status || "all"} onValueChange={(value) => updateFilter("status", value === "all" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder={tx("reports.status", "Status")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tx("reports.all", "All")}</SelectItem>
                      <SelectItem value="open">{tx("reports.open", "Open")}</SelectItem>
                      <SelectItem value="closed">{tx("reports.closed", "Closed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : <div />}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {reportType === "payments" ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{tx("reports.payment_method", "Payment method")}</label>
                  <Select value={draftFilters.paymentMethodId || "all"} onValueChange={(value) => updateFilter("paymentMethodId", value === "all" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder={tx("reports.all_methods", "All methods")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tx("reports.all", "All")}</SelectItem>
                      {(paymentMethodsQ.data || []).map((method) => (
                        <SelectItem key={method.id} value={String(method.id)}>
                          {isArabic
                            ? method.nameAr || method.nameEn || method.code
                            : method.nameEn || method.nameAr || method.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {reportType === "appointments" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{tx("reports.staff", "Staff")}</label>
                    <Select value={draftFilters.staffId || "all"} onValueChange={(value) => updateFilter("staffId", value === "all" ? "" : value)}>
                      <SelectTrigger><SelectValue placeholder={tx("reports.all_staff", "All staff")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tx("reports.all", "All")}</SelectItem>
                        {(staffQ.data?.data || []).map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.displayName || `${tx("reports.staff", "Staff")} #${item.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{tx("reports.room", "Room")}</label>
                    <Select value={draftFilters.roomId || "all"} onValueChange={(value) => updateFilter("roomId", value === "all" ? "" : value)}>
                      <SelectTrigger><SelectValue placeholder={tx("reports.all_rooms", "All rooms")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tx("reports.all", "All")}</SelectItem>
                        {(roomsQ.data?.data || []).map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}
              {["appointments", "packages"].includes(reportType) ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{tx("reports.service", "Service")}</label>
                  <Select value={draftFilters.serviceId || "all"} onValueChange={(value) => updateFilter("serviceId", value === "all" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder={tx("reports.all_services", "All services")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tx("reports.all", "All")}</SelectItem>
                      {(servicesQ.data?.data || []).map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {reportType === "inventory" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{tx("reports.product", "Product")}</label>
                    <Select value={draftFilters.productId || "all"} onValueChange={(value) => updateFilter("productId", value === "all" ? "" : value)}>
                      <SelectTrigger><SelectValue placeholder={tx("reports.all_products", "All products")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tx("reports.all", "All")}</SelectItem>
                        {(productsQ.data?.data || []).map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{tx("reports.reason", "Reason")}</label>
                    <Input value={draftFilters.reason || ""} onChange={(e) => updateFilter("reason", e.target.value)} placeholder={tx("reports.reason_placeholder", "sale, adjustment, purchase...")} />
                  </div>
                </>
              ) : null}
              {reportType === "packages" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{tx("reports.plan", "Plan")}</label>
                    <Select value={draftFilters.planId || "all"} onValueChange={(value) => updateFilter("planId", value === "all" ? "" : value)}>
                      <SelectTrigger><SelectValue placeholder={tx("reports.all_plans", "All plans")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tx("reports.all", "All")}</SelectItem>
                        {(packagePlansQ.data?.data || []).map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{tx("reports.status", "Status")}</label>
                    <Select value={draftFilters.status || "all"} onValueChange={(value) => updateFilter("status", value === "all" ? "" : value)}>
                      <SelectTrigger><SelectValue placeholder={tx("reports.all_statuses", "All statuses")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tx("reports.all", "All")}</SelectItem>
                        <SelectItem value="active">{tx("reports.active", "Active")}</SelectItem>
                        <SelectItem value="expired">{tx("reports.expired", "Expired")}</SelectItem>
                        <SelectItem value="used_up">{tx("reports.used_up", "Used up")}</SelectItem>
                        <SelectItem value="cancelled">{tx("reports.cancelled", "Cancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button onClick={() => setAppliedFilters({ ...draftFilters })}>
                <Filter className="h-4 w-4" />
                {tx("reports.apply_filters", "Apply filters")}
              </Button>
              <Badge variant="outline" className="border-primary/30 text-primary">
                <CalendarRange className="mr-1 h-3.5 w-3.5" />
                {requestFilters.from || "-"} {tx("reports.to_short", "to")} {requestFilters.to || "-"}
              </Badge>
            </div>
          </div>
        </Card>

        {reportQuery.isLoading ? (
          <Card className="border-border bg-card shadow-sm">
            <div className="p-6 text-sm text-muted-foreground">
              {tx("reports.loading", "Loading report...")}
            </div>
          </Card>
        ) : reportQuery.isError ? (
          <Card className="border-destructive/30 bg-card shadow-sm">
            <div className="p-6 text-sm text-destructive">
              {(reportQuery.error as Error)?.message || tx("reports.load_error", "Could not load report.")}
            </div>
          </Card>
        ) : data ? (
          <div className="space-y-4">
            {topSummary ? (
              <SummaryGrid
                title={tx("reports.summary", "Summary")}
                value={topSummary}
                getLabel={getLabel}
                formatMetricValue={formatMetricValue}
              />
            ) : null}
            {sections.map((section) => (
              <React.Fragment key={section.title}>
                <ChartRenderer
                  title={section.title}
                  value={section.value}
                  chart={section.chart}
                  getChartPoints={getChartPoints}
                  getLabel={getLabel}
                  formatMetricValue={formatMetricValue}
                  totalLabel={tx("reports.total", "Total")}
                />
                <SectionRenderer
                  title={section.title}
                  value={section.value}
                  getLabel={getLabel}
                  formatMetricValue={formatMetricValue}
                />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <Card className="border-border bg-card shadow-sm">
            <div className="p-6 text-sm text-muted-foreground">
              {tx("reports.no_data", "No report data available.")}
            </div>
          </Card>
        )}
      </div>
    </ProtectedComponent>
  );
};

export default ReportsPage;
