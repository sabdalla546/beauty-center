/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { CalendarDays, FileText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";

import { useAppointmentsCalendar } from "@/hooks/appointments/useAppointments";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { useStaff } from "@/hooks/staff/useStaff";
import { useRooms } from "@/hooks/rooms/useRooms";
import { useAppointmentsColumns } from "@/pages/appointments/_components/appointmentsColumns";
import {
  APPOINTMENT_STATUS_ORDER,
  getAppointmentStatusLabel,
} from "@/pages/appointments/appointmentWorkflow";
import type { Appointment } from "@/pages/appointments/types";

const toInputDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfToday = () => {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return date;
};

const AppointmentsPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [from, setFrom] = useState(() => toInputDateTime(startOfToday()));
  const [to, setTo] = useState(() => toInputDateTime(endOfToday()));
  const [staffId, setStaffId] = useState<number | undefined>();
  const [roomId, setRoomId] = useState<number | undefined>();
  const [staffSearch, setStaffSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const viewPermission = "appointments.read";
  const createPermission = "appointments.create";
  const editPermission = "appointments.update";
  const checkoutPermission = "pos.orders.create";

  const appointmentsQuery = useAppointmentsCalendar({
    from,
    to,
    staffId,
    roomId,
  });

  const staffQuery = useStaff({
    currentPage: 1,
    itemsPerPage: 50,
    searchQuery: staffSearch,
  });

  const roomsQuery = useRooms({ searchQuery: roomSearch });

  const appointments = appointmentsQuery.data?.data ?? [];
  const staff = staffQuery.data?.data ?? [];
  const rooms = roomsQuery.data?.data ?? [];

  const filteredAppointments = useMemo(() => {
    const term = searchQuery.toLowerCase();
    return appointments.filter((appointment) => {
      const customerName = `${appointment.customer?.firstName ?? ""} ${
        appointment.customer?.lastName ?? ""
      }`.toLowerCase();
      const serviceName = (appointment.service?.name ?? "").toLowerCase();
      const staffName = `${appointment.staff?.displayName ?? ""} ${
        appointment.staff?.user?.firstName ?? ""
      } ${appointment.staff?.user?.lastName ?? ""}`.toLowerCase();
      const roomName = (appointment.room?.name ?? "").toLowerCase();
      const actualStaffName = `${
        appointment.actualStaff?.displayName ?? ""
      } ${appointment.actualStaff?.user?.firstName ?? ""} ${
        appointment.actualStaff?.user?.lastName ?? ""
      }`.toLowerCase();
      const actualRoomName = (appointment.actualRoom?.name ?? "").toLowerCase();
      const status = String(appointment.status ?? "").toLowerCase();
      const sourceType = String(appointment.sourceType ?? "").toLowerCase();
      const cancelReason = String(appointment.cancelReason ?? "").toLowerCase();
      const checkoutOrderId = String(appointment.checkoutOrderId ?? "");
      const matchesStatus =
        !statusFilter || status === String(statusFilter).toLowerCase();
      if (!matchesStatus) return false;
      if (!term) return true;

      return (
        customerName.includes(term) ||
          serviceName.includes(term) ||
          staffName.includes(term) ||
          actualStaffName.includes(term) ||
          roomName.includes(term) ||
          actualRoomName.includes(term) ||
          status.includes(term) ||
          sourceType.includes(term) ||
          cancelReason.includes(term) ||
          checkoutOrderId.includes(term)
      );
    });
  }, [appointments, searchQuery, statusFilter]);

  const totalItems = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const pagedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const columns = useAppointmentsColumns({
    editPermission,
    checkoutPermission,
  });

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm);
    setCurrentPage(1);
  };

  const handleResetToday = () => {
    setFrom(toInputDateTime(startOfToday()));
    setTo(toInputDateTime(endOfToday()));
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const res = await api.get("/appointments/export/pdf", {
        params: {
          from,
          to,
          staffId: staffId || undefined,
          roomId: roomId || undefined,
          search: searchQuery || undefined,
        },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const contentDisposition = String(
        res.headers["content-disposition"] || "",
      );
      const matchedFileName = contentDisposition.match(/filename="?([^"]+)"?/i);
      const fileName =
        matchedFileName?.[1] ||
        `appointments_${new Date().toISOString().slice(0, 10)}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title:
          t("appointments.export_pdf_success") ||
          t("reports.export_ready") ||
          "Export ready",
        description:
          t("appointments.export_pdf_success_description") ||
          t("reports.export_success_suffix") ||
          "downloaded successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title:
          t("appointments.export_pdf_failed") ||
          t("reports.export_failed") ||
          "Export failed",
        description:
          err?.response?.data?.error?.message ||
          err?.message ||
          t("appointments.export_pdf_failed_description") ||
          t("reports.export_error") ||
          "Could not export PDF.",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <ProtectedComponent permission={viewPermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<CalendarDays className="w-5 h-5 text-primary" />}
          title={t("appointments.title") || "Appointments"}
          subtitle={
            t("appointments.subtitle") ||
            "Plan, manage, and checkout customer appointments."
          }
          search={{
            placeholder:
              t("appointments.search") ||
              "Search customer, service, staff, room...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <ProtectedComponent permission={createPermission}>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                onClick={() => navigate("/appointments/create")}
              >
                {t("appointments.create") || "Create appointment"}
              </Button>
            </ProtectedComponent>
          }
        />

        <Card className="bg-card border-border rounded-xl shadow-sm">
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("appointments.filters") || "Filters"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("appointments.filters_hint") ||
                  "Filter appointments by date range, staff, and room."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("appointments.from") || "From"}
                </label>
                <Input
                  type="datetime-local"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("appointments.to") || "To"}
                </label>
                <Input
                  type="datetime-local"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("appointments.status_filter") || "Status"}
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">
                    {t("appointments.all_statuses") || "All statuses"}
                  </option>
                  {APPOINTMENT_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {getAppointmentStatusLabel(t, status)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("appointments.staff") || "Staff"}
                </label>
                <SearchableSelect
                  value={staffId ? String(staffId) : ""}
                  onValueChange={(value) =>
                    setStaffId(value ? Number(value) : undefined)
                  }
                  placeholder={t("appointments.select_staff") || "Select staff"}
                  searchPlaceholder={
                    t("appointments.search_staff") || "Search staff..."
                  }
                  onSearch={setStaffSearch}
                  isLoading={staffQuery.isLoading}
                  emptyMessage={t("appointments.no_staff") || "No staff found"}
                  allowClear={!!staffId}
                  onClear={() => setStaffId(undefined)}
                >
                  {staff.length ? (
                    staff.map((member) => (
                      <SearchableSelectItem
                        key={member.id}
                        value={String(member.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {member.displayName ||
                              `${member.user?.firstName ?? ""} ${
                                member.user?.lastName ?? ""
                              }`.trim() ||
                              member.user?.email ||
                              `#${member.id}`}
                          </span>
                          {member.user?.email ? (
                            <span className="text-xs text-muted-foreground">
                              {member.user.email}
                            </span>
                          ) : null}
                        </div>
                      </SearchableSelectItem>
                    ))
                  ) : (
                    <SearchableSelectEmpty
                      message={t("appointments.no_staff") || "No staff found"}
                    />
                  )}
                </SearchableSelect>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("appointments.room") || "Room"}
                </label>
                <SearchableSelect
                  value={roomId ? String(roomId) : ""}
                  onValueChange={(value) =>
                    setRoomId(value ? Number(value) : undefined)
                  }
                  placeholder={t("appointments.select_room") || "Select room"}
                  searchPlaceholder={
                    t("appointments.search_rooms") || "Search rooms..."
                  }
                  onSearch={setRoomSearch}
                  isLoading={roomsQuery.isLoading}
                  emptyMessage={t("appointments.no_rooms") || "No rooms found"}
                  allowClear={!!roomId}
                  onClear={() => setRoomId(undefined)}
                >
                  {rooms.length ? (
                    rooms.map((room) => (
                      <SearchableSelectItem
                        key={room.id}
                        value={String(room.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{room.name}</span>
                          {room.roomType?.name ? (
                            <span className="text-xs text-muted-foreground">
                              {room.roomType.name}
                            </span>
                          ) : null}
                        </div>
                      </SearchableSelectItem>
                    ))
                  ) : (
                    <SearchableSelectEmpty
                      message={t("appointments.no_rooms") || "No rooms found"}
                    />
                  )}
                </SearchableSelect>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleResetToday}>
                {t("appointments.today") || "Today"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("");
                  setStaffId(undefined);
                  setRoomId(undefined);
                  setSearchQuery("");
                  setSearchTerm("");
                  handleResetToday();
                }}
              >
                {t("reports.reset") || "Reset"}
              </Button>
              <Button onClick={() => appointmentsQuery.refetch()}>
                {t("appointments.refresh") || "Refresh"}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={exportingPdf || appointmentsQuery.isLoading}
              >
                <FileText className="w-4 h-4" />
                {exportingPdf
                  ? t("appointments.exporting_pdf") ||
                    t("reports.exporting") ||
                    "Exporting..."
                  : t("appointments.export_pdf") ||
                    t("reports.export_pdf") ||
                    "Export PDF"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("appointments.list") || "Appointments list"}
              totalItems={totalItems}
              currentCount={pagedAppointments.length}
              entityName={t("appointments.title") || "appointments"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {appointmentsQuery.isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("appointments.loading") || "Loading appointments..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable<Appointment, any>
                  columns={columns}
                  data={pagedAppointments}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="appointments"
                />
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-border bg-muted/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(size) => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedComponent>
  );
};

export default AppointmentsPage;
