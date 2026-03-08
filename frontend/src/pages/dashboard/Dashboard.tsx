/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CreditCard,
  DoorOpen,
  LineChart,
  Package,
  PackageCheck,
  PlusCircle,
  Receipt,
  Shield,
  Sparkles,
  User,
  Users,
  Users as UsersIcon,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import CompactHeader from "@/components/common/CompactHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAppointmentsCalendar } from "@/hooks/appointments/useAppointments";
import { useCustomers } from "@/hooks/customers/useCustomers";
import { usePaymentMethods } from "@/hooks/paymentMethods/usePaymentMethods";
import { useProducts } from "@/hooks/products/useProducts";
import { useReportData } from "@/hooks/reports/useReports";
import { useRoles } from "@/hooks/roles/useRoles";
import { useRooms } from "@/hooks/rooms/useRooms";
import { useServices } from "@/hooks/services/useServices";
import { useMyOpenShift } from "@/hooks/shifts/useShifts";
import { useStaff } from "@/hooks/staff/useStaff";
import { useUsers } from "@/hooks/users/useUsers";
import type { Appointment } from "@/pages/appointments/types";
import DashboardKpiCard from "@/pages/dashboard/_components/DashboardKpiCard";
import DashboardPanel from "@/pages/dashboard/_components/DashboardPanel";
import DashboardQuickActionCard from "@/pages/dashboard/_components/DashboardQuickActionCard";
import DashboardTrendBars from "@/pages/dashboard/_components/DashboardTrendBars";
import {
  daysAgo,
  endOfDay,
  formatKwd,
  formatNumber,
  formatShortDate,
  formatTime,
  getCustomerDisplayName,
  getStaffDisplayName,
  startOfDay,
  toSentenceCase,
} from "@/pages/dashboard/_components/dashboardUtils";

type OverviewReport = {
  kpis?: {
    activeOrdersCount?: number;
    averageOrderValueKwd?: number;
    netSalesKwd?: number;
    uniqueCustomersCount?: number;
  };
};

type PaymentsReport = {
  summary?: {
    grossSalesKwd?: number;
    netSalesKwd?: number;
    refundsKwd?: number;
  };
  byMethod?: Array<{
    grossSalesKwd?: number;
    methodCode?: string;
    methodId?: number | null;
    methodNameAr?: string;
    methodNameEn?: string;
    netSalesKwd?: number;
    paymentsCount?: number;
  }>;
};

type SalesReport = {
  timeline?: Array<{
    period: string;
    totalKwd?: number;
  }>;
};

type AppointmentsReport = {
  byRoom?: Array<{
    appointmentsCount?: number;
    roomId?: number | null;
    roomName?: string;
  }>;
  byService?: Array<{
    appointmentsCount?: number;
    serviceId?: number | null;
    serviceName?: string;
  }>;
  byStaff?: Array<{
    appointmentsCount?: number;
    staffId?: number | null;
    staffName?: string;
  }>;
  byStatus?: Array<{
    count?: number;
    status?: string;
  }>;
  summary?: {
    appointmentsCount?: number;
  };
};

type InventoryReport = {
  lowStockProducts?: Array<{
    currentQty?: number;
    id?: number;
    name?: string;
    sku?: string | null;
  }>;
  summary?: {
    lowStockCount?: number;
    lowStockThreshold?: number;
  };
};

type PackagesReport = {
  summary?: {
    usedSessions?: number;
    usedValueKwd?: number;
  };
};

type QuickAction = {
  description: string;
  icon: LucideIcon;
  permission?: string;
  title: string;
  to: string;
};

type MasterStat = {
  icon: LucideIcon;
  label: string;
  loading: boolean;
  to: string;
  value: number;
};

const appointmentStatusStyles: Record<string, string> = {
  booked: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  checked_in: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  in_service: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  no_show: "bg-slate-500/15 text-slate-600 border-slate-500/30",
};

const appointmentStatusKeyMap: Record<string, string> = {
  booked: "appointments.status_booked",
  checked_in: "appointments.status_checked_in",
  in_service: "appointments.status_in_service",
  completed: "appointments.status_completed",
  cancelled: "appointments.status_cancelled",
  no_show: "appointments.status_no_show",
};

const moneyFormatter = (value: number | null | undefined, locale: string) =>
  `${formatKwd(value, locale)} KWD`;

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayStart = useMemo(() => startOfDay(), []);
  const todayEnd = useMemo(() => endOfDay(), []);
  const weekStart = useMemo(() => daysAgo(6), []);
  const todayFrom = todayStart.toISOString();
  const todayTo = todayEnd.toISOString();
  const weekFrom = weekStart.toISOString();
  const dir = i18n.dir();
  const locale = i18n.language;

  const todayFilters = useMemo(
    () => ({ from: todayFrom, to: todayTo }),
    [todayFrom, todayTo],
  );
  const todayGroupedFilters = useMemo(
    () => ({ from: todayFrom, to: todayTo, groupBy: "day" as const }),
    [todayFrom, todayTo],
  );
  const weekFilters = useMemo(
    () => ({ from: weekFrom, to: todayTo, groupBy: "day" as const }),
    [todayTo, weekFrom],
  );

  const appointmentsCalendarQ = useAppointmentsCalendar({
    from: todayFrom,
    to: todayTo,
  });
  const overviewQ = useReportData("overview", todayFilters);
  const paymentsQ = useReportData("payments", todayGroupedFilters);
  const salesTrendQ = useReportData("sales", weekFilters);
  const appointmentsReportQ = useReportData("appointments", todayGroupedFilters);
  const inventoryQ = useReportData("inventory", todayGroupedFilters);
  const packagesQ = useReportData("packages", todayGroupedFilters);
  // TODO: replace with a branch-wide active-shift summary when the backend
  // exposes open shifts beyond the signed-in cashier.
  const openShiftQ = useMyOpenShift();

  const customersQ = useCustomers({
    currentPage: 1,
    itemsPerPage: 1,
    searchQuery: "",
  });
  const staffQ = useStaff({
    currentPage: 1,
    itemsPerPage: 1,
    searchQuery: "",
  });
  const servicesQ = useServices({ searchQuery: "" });
  const roomsQ = useRooms({ searchQuery: "" });
  const productsQ = useProducts({
    currentPage: 1,
    itemsPerPage: 1,
    searchQuery: "",
  });
  const usersQ = useUsers({
    currentPage: 1,
    itemsPerPage: 1,
    searchQuery: "",
  });
  const rolesQ = useRoles();
  const paymentMethodsQ = usePaymentMethods({ activeOnly: false });

  const overview = (overviewQ.data as OverviewReport | null) ?? null;
  const paymentsReport = (paymentsQ.data as PaymentsReport | null) ?? null;
  const salesTrend = (salesTrendQ.data as SalesReport | null) ?? null;
  const appointmentsReport =
    (appointmentsReportQ.data as AppointmentsReport | null) ?? null;
  const inventoryReport = (inventoryQ.data as InventoryReport | null) ?? null;
  const packagesReport = (packagesQ.data as PackagesReport | null) ?? null;
  const openShift = openShiftQ.data?.data ?? null;
  const appointments = appointmentsCalendarQ.data?.data ?? [];
  const rooms = roomsQ.data?.data ?? [];

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of appointmentsReport?.byStatus ?? []) {
      counts.set(String(row.status || "unknown"), Number(row.count ?? 0));
    }

    return counts;
  }, [appointmentsReport?.byStatus]);

  const operations = useMemo(() => {
    const rows = [...appointments].sort(
      (left, right) =>
        new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
    );

    const todayCustomerIds = new Set<number>();
    const occupiedRoomIds = new Set<number>();
    const ongoing: Appointment[] = [];
    const upcoming: Appointment[] = [];
    const waiting: Appointment[] = [];
    const overdue: Appointment[] = [];

    for (const appointment of rows) {
      if (appointment.customerId) {
        todayCustomerIds.add(Number(appointment.customerId));
      }

      const status = String(appointment.status || "");
      const startAtMs = new Date(appointment.startAt).getTime();
      const endAtMs = new Date(appointment.endAt).getTime();
      const isClosedStatus =
        status === "completed" || status === "cancelled" || status === "no_show";
      const isInProgressStatus =
        status === "checked_in" || status === "in_service";
      const isOngoing =
        !isClosedStatus &&
        (isInProgressStatus || (startAtMs <= now && endAtMs >= now));

      if (isOngoing) {
        ongoing.push(appointment);
        if (appointment.roomId) {
          occupiedRoomIds.add(Number(appointment.roomId));
        }
        continue;
      }

      if (!isClosedStatus && startAtMs > now) {
        upcoming.push(appointment);
      }

      if (!isClosedStatus && (status === "booked" || status === "checked_in")) {
        waiting.push(appointment);
      }

      if (
        !isClosedStatus &&
        startAtMs < now &&
        (status === "booked" || status === "checked_in")
      ) {
        overdue.push(appointment);
      }
    }

    return {
      occupiedRoomIds,
      ongoing,
      overdue,
      todayCustomerIds,
      upcoming,
      waiting,
    };
  }, [appointments, now]);

  const todayCustomersCount = useMemo(() => {
    const scheduled = operations.todayCustomerIds.size;
    const billed = Number(overview?.kpis?.uniqueCustomersCount ?? 0);
    return Math.max(scheduled, billed);
  }, [operations.todayCustomerIds.size, overview?.kpis?.uniqueCustomersCount]);

  const paymentBreakdown = useMemo(() => {
    const total = Number(paymentsReport?.summary?.grossSalesKwd ?? 0);
    return (paymentsReport?.byMethod ?? [])
      .map((method) => {
        const amount = Number(method.grossSalesKwd ?? method.netSalesKwd ?? 0);
        return {
          amount,
          id: String(method.methodId ?? method.methodCode ?? amount),
          label:
            locale === "ar"
              ? method.methodNameAr || method.methodNameEn || method.methodCode || "-"
              : method.methodNameEn || method.methodNameAr || method.methodCode || "-",
          paymentsCount: Number(method.paymentsCount ?? 0),
          share: total > 0 ? (amount / total) * 100 : 0,
        };
      })
      .sort((left, right) => right.amount - left.amount);
  }, [locale, paymentsReport?.byMethod, paymentsReport?.summary?.grossSalesKwd]);

  const trendPoints = useMemo(
    () =>
      (salesTrend?.timeline ?? []).slice(-7).map((point) => ({
        formattedValue: formatKwd(Number(point.totalKwd ?? 0), locale, true),
        label: formatShortDate(point.period, locale),
        value: Number(point.totalKwd ?? 0),
      })),
    [locale, salesTrend?.timeline],
  );

  const topStaff = useMemo(
    () =>
      [...(appointmentsReport?.byStaff ?? [])]
        .sort(
          (left, right) =>
            Number(right.appointmentsCount ?? 0) -
            Number(left.appointmentsCount ?? 0),
        )
        .slice(0, 5),
    [appointmentsReport?.byStaff],
  );

  const topServices = useMemo(
    () =>
      [...(appointmentsReport?.byService ?? [])]
        .sort(
          (left, right) =>
            Number(right.appointmentsCount ?? 0) -
            Number(left.appointmentsCount ?? 0),
        )
        .slice(0, 5),
    [appointmentsReport?.byService],
  );

  const busiestRooms = useMemo(
    () =>
      [...(appointmentsReport?.byRoom ?? [])]
        .sort(
          (left, right) =>
            Number(right.appointmentsCount ?? 0) -
            Number(left.appointmentsCount ?? 0),
        )
        .slice(0, 4),
    [appointmentsReport?.byRoom],
  );

  const urgentActions = useMemo(() => {
    const items: Array<{
      action: string;
      label: string;
      route: string;
      tone: "amber" | "indigo" | "rose";
    }> = [];

    if (!openShift) {
      items.push({
        action: t("dashboard.open_shift_action") || "Open shift",
        label:
          t("dashboard.urgent_open_shift") ||
          "No active shift is open for the current cashier.",
        route: "/shifts",
        tone: "amber",
      });
    }

    const lowStockCount = Number(inventoryReport?.summary?.lowStockCount ?? 0);
    if (lowStockCount > 0) {
      items.push({
        action: t("dashboard.go_to_inventory") || "Go to inventory",
        label:
          t("dashboard.urgent_low_stock", { count: lowStockCount }) ||
          `${lowStockCount} low-stock items need replenishment.`,
        route: "/inventory/products",
        tone: "rose",
      });
    }

    if (operations.overdue.length > 0) {
      items.push({
        action: t("dashboard.review_appointments") || "Review appointments",
        label:
          t("dashboard.urgent_overdue", { count: operations.overdue.length }) ||
          `${operations.overdue.length} appointments are past their scheduled start time.`,
        route: "/appointments",
        tone: "indigo",
      });
    }

    return items.slice(0, 4);
  }, [
    inventoryReport?.summary?.lowStockCount,
    openShift,
    operations.overdue.length,
    t,
  ]);

  const quickActions: QuickAction[] = [
    {
      description:
        t("dashboard.quick_new_appointment_description") ||
        "Book the next customer and assign staff or room.",
      icon: CalendarClock,
      permission: "appointments.create",
      title: t("dashboard.quick_new_appointment") || "New appointment",
      to: "/appointments/create",
    },
    {
      description:
        t("dashboard.quick_new_sale_description") ||
        "Start a new POS ticket for services, products, or packages.",
      icon: Receipt,
      permission: "pos.orders.create",
      title: t("dashboard.quick_new_sale") || "New POS order",
      to: "/pos",
    },
    {
      description:
        openShift
          ? t("dashboard.quick_open_shift_active_description") ||
            "View the active shift and move to close or summary."
          : t("dashboard.quick_open_shift_description") ||
            "Start cashier operations and track opening cash.",
      icon: Wallet,
      permission: "shifts.open",
      title: t("dashboard.open_shift_action") || "Open shift",
      to: "/shifts",
    },
    {
      description:
        t("dashboard.quick_add_customer_description") ||
        "Create a customer profile before appointment or checkout.",
      icon: PlusCircle,
      permission: "customers.create",
      title: t("dashboard.quick_add_customer") || "Add customer",
      to: "/customers/create",
    },
    {
      description:
        t("dashboard.quick_view_reports_description") ||
        "Open detailed operational and financial reports.",
      icon: LineChart,
      permission: "reports.read",
      title: t("dashboard.quick_view_reports") || "View reports",
      to: "/reports",
    },
  ];

  const masterStats: MasterStat[] = [
    {
      icon: Users,
      label: t("customers.customers") || "Customers",
      loading: customersQ.isLoading,
      to: "/customers",
      value: customersQ.data?.meta?.total ?? customersQ.data?.data?.length ?? 0,
    },
    {
      icon: User,
      label: t("staff.staff") || "Staff",
      loading: staffQ.isLoading,
      to: "/staff",
      value: staffQ.data?.meta?.total ?? staffQ.data?.data?.length ?? 0,
    },
    {
      icon: Briefcase,
      label: t("services.services") || "Services",
      loading: servicesQ.isLoading,
      to: "/services",
      value: servicesQ.data?.data?.length ?? 0,
    },
    {
      icon: DoorOpen,
      label: t("rooms.rooms") || "Rooms",
      loading: roomsQ.isLoading,
      to: "/rooms",
      value: roomsQ.data?.data?.length ?? 0,
    },
    {
      icon: Package,
      label: t("products.products") || "Products",
      loading: productsQ.isLoading,
      to: "/inventory/products",
      value: productsQ.data?.meta?.total ?? productsQ.data?.data?.length ?? 0,
    },
    {
      icon: UsersIcon,
      label: t("users.users") || "Users",
      loading: usersQ.isLoading,
      to: "/system/users",
      value: usersQ.data?.meta?.total ?? usersQ.data?.data?.length ?? 0,
    },
    {
      icon: Shield,
      label: t("sidebar.roles_permissions") || "Roles",
      loading: rolesQ.isLoading,
      to: "/system/roles",
      value: rolesQ.data?.roles?.length ?? 0,
    },
    {
      icon: CreditCard,
      label: t("payment_methods.payment_methods") || "Payment Methods",
      loading: paymentMethodsQ.isLoading,
      to: "/system/payment-methods",
      value: paymentMethodsQ.data?.length ?? 0,
    },
  ];

  const getAppointmentStatusLabel = (status: string) => {
    const key = appointmentStatusKeyMap[status];
    if (!key) return toSentenceCase(status);

    const translated = t(key);
    return translated === key ? toSentenceCase(status) : translated;
  };

  return (
    <div className="space-y-5" dir={dir}>
      <CompactHeader
        icon={<Sparkles className="h-5 w-5 text-primary" />}
        title={t("dashboard.dashboard") || t("sidebar.dashboard") || "Dashboard"}
        subtitle={
          t("dashboard.subtitle") ||
          "Monitor daily sales, appointments, cash, and urgent salon operations."
        }
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-primary/20 bg-primary/10 text-primary">
              {formatShortDate(todayStart.toISOString(), locale)}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/reports">{t("dashboard.open_reports") || "Open reports"}</Link>
            </Button>
          </div>
        }
      />

      <DashboardPanel
        title={t("dashboard.quick_actions") || "Quick actions"}
        subtitle={
          t("dashboard.quick_actions_subtitle") ||
          "Jump straight into the front-desk and cashier workflows."
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => {
            const card = (
              <DashboardQuickActionCard
                key={action.to}
                description={action.description}
                direction={dir}
                icon={action.icon}
                title={action.title}
                to={action.to}
              />
            );

            return action.permission ? (
              <ProtectedComponent key={action.to} permission={action.permission}>
                {card}
              </ProtectedComponent>
            ) : (
              card
            );
          })}
        </div>
      </DashboardPanel>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("dashboard.kpis_title") || "Today at a glance"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.kpis_subtitle") ||
              "Daily KPIs for sales, appointments, packages, and inventory."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <DashboardKpiCard
            accentClass="bg-gradient-to-br from-card to-primary/5"
            description={
              overview?.kpis?.averageOrderValueKwd != null
                ? `${t("dashboard.average_ticket") || "Average ticket"}: ${moneyFormatter(
                    overview.kpis.averageOrderValueKwd,
                    locale,
                  )}`
                : t("dashboard.sales_description") || "Net collected after refunds."
            }
            direction={dir}
            icon={Wallet}
            loading={overviewQ.isLoading}
            meta={
              overview?.kpis?.activeOrdersCount != null
                ? `${formatNumber(
                    overview.kpis.activeOrdersCount,
                    locale,
                  )} ${t("dashboard.orders_today") || "orders today"}`
                : t("dashboard.view_orders") || "View orders"
            }
            title={t("dashboard.today_sales") || "Today sales"}
            to="/pos/history"
            value={moneyFormatter(overview?.kpis?.netSalesKwd, locale)}
          />

          <DashboardKpiCard
            accentClass="bg-gradient-to-br from-card to-[hsl(var(--brand-2))/0.06]"
            description={`${formatNumber(
              Number(statusCounts.get("booked") ?? 0),
              locale,
            )} ${t("dashboard.booked") || "booked"} · ${formatNumber(
              Number(statusCounts.get("in_service") ?? 0),
              locale,
            )} ${t("dashboard.in_service") || "in service"}`}
            direction={dir}
            icon={CalendarClock}
            loading={appointmentsReportQ.isLoading}
            meta={t("dashboard.view_schedule") || "View schedule"}
            title={t("dashboard.today_appointments") || "Today appointments"}
            to="/appointments"
            value={formatNumber(
              appointmentsReport?.summary?.appointmentsCount ?? 0,
              locale,
            )}
          />

          <DashboardKpiCard
            accentClass="bg-gradient-to-br from-card to-emerald-500/5"
            description={
              openShift
                ? `${t("dashboard.opened_at") || "Opened at"} ${formatTime(
                    openShift.openedAt,
                    locale,
                  )}`
                : t("dashboard.no_open_shift") || "No shift is open for the current cashier."
            }
            direction={dir}
            icon={Receipt}
            loading={openShiftQ.isLoading}
            meta={
              openShift
                ? user?.fullName || user?.email || "-"
                : t("dashboard.open_shift_action") || "Open shift"
            }
            title={t("dashboard.open_shift_status") || "Open shift status"}
            to="/shifts"
            value={
              openShift ? (
                <span className="text-emerald-600">
                  {t("dashboard.shift_open") || "Open"}
                </span>
              ) : (
                <span className="text-amber-600">
                  {t("dashboard.shift_closed") || "Not open"}
                </span>
              )
            }
          />

          <DashboardKpiCard
            accentClass="bg-gradient-to-br from-card to-cyan-500/5"
            description={
              t("dashboard.customers_today_hint") ||
              "Scheduled or billed unique customers today."
            }
            direction={dir}
            icon={Users}
            loading={appointmentsCalendarQ.isLoading || overviewQ.isLoading}
            meta={t("dashboard.view_customers") || "View customers"}
            title={t("dashboard.customers_today") || "Customers today"}
            to="/customers"
            value={formatNumber(todayCustomersCount, locale)}
          />

          <DashboardKpiCard
            accentClass="bg-gradient-to-br from-card to-rose-500/5"
            description={
              inventoryReport?.summary?.lowStockThreshold != null
                ? `${t("dashboard.below_threshold") || "Below threshold"}: ${formatNumber(
                    inventoryReport.summary.lowStockThreshold,
                    locale,
                  )}`
                : t("dashboard.low_stock_description") ||
                  "Products that need replenishment soon."
            }
            direction={dir}
            icon={AlertTriangle}
            loading={inventoryQ.isLoading}
            meta={t("dashboard.go_to_inventory") || "Go to inventory"}
            title={t("dashboard.low_stock_alerts") || "Low stock alerts"}
            to="/inventory/products"
            value={formatNumber(
              inventoryReport?.summary?.lowStockCount ?? 0,
              locale,
            )}
          />

          <DashboardKpiCard
            accentClass="bg-gradient-to-br from-card to-violet-500/5"
            description={
              packagesReport?.summary?.usedValueKwd != null
                ? `${t("dashboard.package_value_today") || "Redeemed value"}: ${moneyFormatter(
                    packagesReport.summary.usedValueKwd,
                    locale,
                  )}`
                : t("dashboard.package_usage_description") ||
                  "Sessions redeemed from active customer packages."
            }
            direction={dir}
            icon={PackageCheck}
            loading={packagesQ.isLoading}
            meta={t("dashboard.view_package_usage") || "View package usage"}
            title={t("dashboard.package_usage_today") || "Package usage today"}
            to="/packages/usages"
            value={formatNumber(packagesReport?.summary?.usedSessions ?? 0, locale)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("dashboard.operations_title") || "Operations"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.operations_subtitle") ||
              "What the receptionist and cashier need to act on right now."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <DashboardPanel
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/appointments">{t("dashboard.view_schedule") || "View schedule"}</Link>
              </Button>
            }
            subtitle={
              t("dashboard.upcoming_appointments_subtitle") ||
              "Next confirmed or pending appointments for today."
            }
            title={t("dashboard.upcoming_appointments") || "Upcoming appointments"}
          >
            {appointmentsCalendarQ.isLoading ? (
              <div className="grid h-56 place-items-center text-sm text-muted-foreground">
                {t("appointments.loading") || "Loading appointments..."}
              </div>
            ) : appointmentsCalendarQ.isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {(appointmentsCalendarQ.error as Error)?.message ||
                  t("reports.load_error") ||
                  "Could not load report."}
              </div>
            ) : operations.upcoming.length ? (
              <div className="space-y-3">
                {operations.upcoming.slice(0, 5).map((appointment) => {
                  const status = String(appointment.status || "booked");
                  return (
                    <div
                      key={appointment.id}
                      className="rounded-2xl border border-border/70 bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {getCustomerDisplayName(appointment.customer)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {appointment.service?.name || t("service") || "Service"}
                          </p>
                        </div>
                        <Badge
                          className={
                            appointmentStatusStyles[status] ||
                            "bg-slate-500/15 text-slate-600 border-slate-500/30"
                          }
                        >
                          {getAppointmentStatusLabel(status)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatTime(appointment.startAt, locale)}</span>
                        <span>{getStaffDisplayName(appointment.staff)}</span>
                        <span>{appointment.room?.name || t("dashboard.no_room") || "No room"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid h-56 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                {t("dashboard.no_upcoming_appointments") ||
                  "No more appointments scheduled for today."}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            subtitle={
              t("dashboard.live_operations_subtitle") ||
              "Current shift, live appointments, and waiting queue."
            }
            title={t("dashboard.live_operations") || "Live operations"}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.ongoing_now") || "Ongoing now"}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {formatNumber(operations.ongoing.length, locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.waiting_queue") || "Waiting / pending"}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {formatNumber(operations.waiting.length, locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.overdue_appointments") || "Overdue"}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {formatNumber(operations.overdue.length, locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.rooms_in_use") || "Rooms in use"}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {formatNumber(operations.occupiedRoomIds.size, locale)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.current_cashier") || "Current cashier"}
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {openShift ? user?.fullName || user?.email || "-" : t("dashboard.no_open_shift") || "No open shift"}
                  </p>
                </div>
                <Badge
                  className={
                    openShift
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600"
                      : "border-amber-500/30 bg-amber-500/15 text-amber-600"
                  }
                >
                  {openShift
                    ? t("dashboard.shift_open") || "Open"
                    : t("dashboard.shift_closed") || "Not open"}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {openShift
                  ? `${t("dashboard.opened_at") || "Opened at"} ${formatTime(
                      openShift.openedAt,
                      locale,
                    )}`
                  : t("dashboard.open_shift_hint") ||
                    "Open a shift before processing cashier activity."}
              </p>
            </div>
          </DashboardPanel>

          <DashboardPanel
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/inventory/products">
                  {t("dashboard.go_to_inventory") || "Go to inventory"}
                </Link>
              </Button>
            }
            subtitle={
              t("dashboard.inventory_subtitle") ||
              "Urgent low-stock items and action priorities."
            }
            title={t("dashboard.inventory_title") || "Inventory"}
          >
            {inventoryQ.isLoading ? (
              <div className="grid h-56 place-items-center text-sm text-muted-foreground">
                {t("reports.loading") || "Loading report..."}
              </div>
            ) : inventoryQ.isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {(inventoryQ.error as Error)?.message ||
                  t("reports.load_error") ||
                  "Could not load report."}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.low_stock_items") || "Low-stock items"}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {formatNumber(inventoryReport?.summary?.lowStockCount ?? 0, locale)}
                  </p>
                </div>

                {inventoryReport?.lowStockProducts?.length ? (
                  inventoryReport.lowStockProducts.slice(0, 5).map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-border/70 bg-muted/15 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {product.name || t("products.products") || "Product"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.sku || t("dashboard.no_sku") || "No SKU"}
                          </p>
                        </div>
                        <Badge className="border-rose-500/30 bg-rose-500/15 text-rose-600">
                          {formatNumber(product.currentQty ?? 0, locale)}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid h-36 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                    {t("dashboard.no_low_stock") || "No low-stock items right now."}
                  </div>
                )}
              </div>
            )}
          </DashboardPanel>
        </div>

        <DashboardPanel
          subtitle={
            t("dashboard.urgent_actions_subtitle") ||
            "Items that need attention before the next rush."
          }
          title={t("dashboard.urgent_actions") || "Urgent actions"}
        >
          {urgentActions.length ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {urgentActions.map((item) => (
                <Link
                  key={`${item.route}-${item.label}`}
                  to={item.route}
                  className="rounded-2xl border border-border/70 bg-muted/15 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                        item.tone === "rose"
                          ? "bg-rose-500"
                          : item.tone === "amber"
                            ? "bg-amber-500"
                            : "bg-indigo-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs font-medium text-primary">
                        {item.action}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
              {t("dashboard.no_urgent_actions") ||
                "Nothing urgent right now. Operations look stable."}
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("dashboard.finance_title") || "Finance"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.finance_subtitle") ||
              "Collected payments, payment mix, and trend visibility."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          <DashboardPanel
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/reports">{t("dashboard.open_reports") || "Open reports"}</Link>
              </Button>
            }
            subtitle={
              t("dashboard.sales_trend_subtitle") ||
              "Daily gross sales over the last 7 days."
            }
            title={t("dashboard.sales_trend") || "Sales trend"}
          >
            {salesTrendQ.isLoading ? (
              <div className="grid h-52 place-items-center text-sm text-muted-foreground">
                {t("reports.loading") || "Loading report..."}
              </div>
            ) : salesTrendQ.isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {(salesTrendQ.error as Error)?.message ||
                  t("reports.load_error") ||
                  "Could not load report."}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.total_collected_today") || "Total collected today"}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {moneyFormatter(paymentsReport?.summary?.netSalesKwd, locale)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.average_ticket") || "Average ticket"}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {moneyFormatter(overview?.kpis?.averageOrderValueKwd, locale)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.refunds_today") || "Refunds today"}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {moneyFormatter(paymentsReport?.summary?.refundsKwd, locale)}
                    </p>
                  </div>
                </div>

                <DashboardTrendBars
                  emptyLabel={t("dashboard.no_sales_trend") || "No sales trend data yet."}
                  points={trendPoints}
                />
              </>
            )}
          </DashboardPanel>

          <DashboardPanel
            subtitle={
              t("dashboard.payments_by_method_subtitle") ||
              "How customers paid today."
            }
            title={t("dashboard.payments_by_method") || "Payments by method today"}
          >
            {paymentsQ.isLoading ? (
              <div className="grid h-52 place-items-center text-sm text-muted-foreground">
                {t("reports.loading") || "Loading report..."}
              </div>
            ) : paymentsQ.isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {(paymentsQ.error as Error)?.message ||
                  t("reports.load_error") ||
                  "Could not load report."}
              </div>
            ) : paymentBreakdown.length ? (
              <div className="space-y-3">
                {paymentBreakdown.map((method) => (
                  <div
                    key={method.id}
                    className="rounded-2xl border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{method.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(method.paymentsCount, locale)}{" "}
                          {t("dashboard.payments_count") || "payments"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {moneyFormatter(method.amount, locale)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(method.share, locale, {
                            maximumFractionDigits: 0,
                          })}
                          %
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--brand-2))]"
                        style={{ width: `${Math.max(method.share, 6)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid h-52 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                {t("dashboard.no_payments_today") || "No payments collected today."}
              </div>
            )}
          </DashboardPanel>
        </div>
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("dashboard.performance_title") || "Performance"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.performance_subtitle") ||
              "Compact workload indicators for staff, services, and rooms."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <DashboardPanel
            subtitle={
              t("dashboard.top_staff_subtitle") ||
              "Current appointment workload by team member."
            }
            title={t("dashboard.top_staff_today") || "Top staff today"}
          >
            {appointmentsReportQ.isLoading ? (
              <div className="grid h-48 place-items-center text-sm text-muted-foreground">
                {t("reports.loading") || "Loading report..."}
              </div>
            ) : topStaff.length ? (
              <div className="space-y-3">
                {/* TODO: switch this ranking to revenue or commission once the backend
                    exposes sales-by-staff metrics in the reports API. */}
                {topStaff.map((entry, index) => (
                  <div
                    key={`${entry.staffId ?? "staff"}-${entry.staffName}`}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {entry.staffName || t("dashboard.unassigned") || "Unassigned"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("dashboard.by_appointment_count") || "By appointment count"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatNumber(entry.appointmentsCount ?? 0, locale)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                {t("dashboard.no_staff_activity") || "No staff activity yet today."}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            subtitle={
              t("dashboard.top_services_subtitle") ||
              "Most booked services scheduled today."
            }
            title={t("dashboard.top_services_today") || "Top services today"}
          >
            {appointmentsReportQ.isLoading ? (
              <div className="grid h-48 place-items-center text-sm text-muted-foreground">
                {t("reports.loading") || "Loading report..."}
              </div>
            ) : topServices.length ? (
              <div className="space-y-3">
                {topServices.map((entry) => (
                  <div
                    key={`${entry.serviceId ?? "service"}-${entry.serviceName}`}
                    className="rounded-2xl border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">
                        {entry.serviceName || t("service") || "Service"}
                      </p>
                      <span className="text-sm font-semibold text-foreground">
                        {formatNumber(entry.appointmentsCount ?? 0, locale)}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--brand-3))]"
                        style={{
                          width: `${Math.max(
                            ((entry.appointmentsCount ?? 0) /
                              Math.max(topServices[0]?.appointmentsCount ?? 1, 1)) *
                              100,
                            12,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                {t("dashboard.no_service_activity") || "No service activity yet today."}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            subtitle={
              t("dashboard.room_utilization_subtitle") ||
              "Current occupancy and busiest rooms today."
            }
            title={t("dashboard.room_utilization") || "Room utilization"}
          >
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.rooms_in_use_now") || "Rooms in use now"}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {formatNumber(operations.occupiedRoomIds.size, locale)} /{" "}
                    {formatNumber(rooms.length, locale)}
                  </p>
                </div>
                <Badge className="border-primary/20 bg-primary/10 text-primary">
                  {rooms.length
                    ? `${formatNumber(
                        (operations.occupiedRoomIds.size / Math.max(rooms.length, 1)) * 100,
                        locale,
                        { maximumFractionDigits: 0 },
                      )}%`
                    : "0%"}
                </Badge>
              </div>
            </div>

            {busiestRooms.length ? (
              <div className="space-y-3">
                {busiestRooms.map((room) => (
                  <div
                    key={`${room.roomId ?? "room"}-${room.roomName}`}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/15 p-3"
                  >
                    <p className="font-medium text-foreground">
                      {room.roomName || t("dashboard.no_room") || "No room"}
                    </p>
                    <span className="text-sm font-semibold text-foreground">
                      {formatNumber(room.appointmentsCount ?? 0, locale)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid h-32 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                {t("dashboard.no_room_activity") || "No room utilization data yet today."}
              </div>
            )}
          </DashboardPanel>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("dashboard.system_summary") || "System summary"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.system_summary_subtitle") ||
              "Master data totals remain available here as a lower-priority overview."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {masterStats.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </p>
                    {item.loading ? (
                      <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
                    ) : (
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {formatNumber(item.value, locale)}
                      </p>
                    )}
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-muted text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-muted/15 p-4 text-xs text-muted-foreground">
          {t("dashboard.data_notes") ||
            "Performance rankings are currently appointment-volume based. Sales-by-staff and branch-wide shift visibility will improve once those backend summaries are available."}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
