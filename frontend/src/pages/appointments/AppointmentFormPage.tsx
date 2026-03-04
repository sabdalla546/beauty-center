
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { ClipLoader } from "react-spinners";
import { useQueryClient } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";

import { useCustomers } from "@/hooks/customers/useCustomers";
import { useServices } from "@/hooks/services/useServices";
import { useStaff } from "@/hooks/staff/useStaff";
import { useRooms } from "@/hooks/rooms/useRooms";
import {
  useCreateAppointment,
  useUpdateAppointment,
  type AppointmentFormValues,
} from "@/hooks/appointments/useAppointmentMutations";
import {
  appointmentFormSchema,
  type AppointmentFormSchema,
} from "@/pages/appointments/schemas/appointmentFormSchema";
import type {
  Appointment,
  AppointmentCalendarResponse,
} from "@/pages/appointments/types";
import type { Service } from "@/pages/services/types";

const toInputDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toFilsFromKwd = (value?: number | null) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 1000);
};

const getServicePriceFils = (service?: Service | null) => {
  if (!service) return 0;
  const direct = service.priceFils ?? service.priceCents;
  if (direct !== undefined && direct !== null) return Number(direct) || 0;
  if (service.priceKwd !== undefined && service.priceKwd !== null)
    return toFilsFromKwd(service.priceKwd);
  return 0;
};

const AppointmentFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const location = useLocation();
  const queryClient = useQueryClient();

  const [customerSearch, setCustomerSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");

  const customersQuery = useCustomers({
    currentPage: 1,
    itemsPerPage: 20,
    searchQuery: customerSearch,
  });

  const servicesQuery = useServices({ searchQuery: serviceSearch });

  const staffQuery = useStaff({
    currentPage: 1,
    itemsPerPage: 20,
    searchQuery: staffSearch,
  });

  const locationAppointment = (location.state as { appointment?: Appointment } | null)
    ?.appointment;

  const cachedAppointment = useMemo(() => {
    if (!id) return undefined;
    const cached = queryClient.getQueriesData<AppointmentCalendarResponse>({
      queryKey: ["appointments-calendar"],
    });
    for (const [, data] of cached) {
      const match = data?.data?.find(
        (appt) => String(appt.id) === String(id),
      );
      if (match) return match;
    }
    return undefined;
  }, [id, queryClient]);

  const appointment = locationAppointment || cachedAppointment;
  const isCoreLocked =
    isEditMode &&
    appointment &&
    ["checked_in", "in_service"].includes(String(appointment.status || ""));

  const form = useForm<AppointmentFormSchema>({
    resolver: zodResolver(appointmentFormSchema) as any,
    defaultValues: {
      customerId: undefined as any,
      serviceId: undefined as any,
      staffId: undefined,
      roomId: undefined,
      startAt: "",
      endAt: "",
      status: "booked",
      notes: "",
    },
  });

  const watchedServiceId = form.watch("serviceId");
  const watchedStartAt = form.watch("startAt");
  const watchedEndAt = form.watch("endAt");

  const services = servicesQuery.data?.data ?? [];
  const selectedService = services.find(
    (service) => String(service.id) === String(watchedServiceId),
  );
  const requiredRoomTypeId = selectedService?.requiredRoomTypeId ?? null;

  const roomsQuery = useRooms({
    searchQuery: roomSearch,
    roomTypeId: requiredRoomTypeId || undefined,
  });

  const rooms = roomsQuery.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];
  const staff = staffQuery.data?.data ?? [];

  useEffect(() => {
    if (isEditMode && appointment) {
      form.reset({
        customerId: appointment.customerId ?? undefined,
        serviceId: appointment.serviceId ?? undefined,
        staffId: appointment.staffId ?? undefined,
        roomId: appointment.roomId ?? undefined,
        startAt: toInputDateTime(appointment.startAt),
        endAt: toInputDateTime(appointment.endAt),
        status: appointment.status ?? "booked",
        notes: appointment.notes ?? "",
      });
    }
  }, [isEditMode, appointment, form]);

  useEffect(() => {
    if (!selectedService || !watchedStartAt || watchedEndAt) return;
    const startDate = new Date(watchedStartAt);
    if (Number.isNaN(startDate.getTime())) return;
    const duration = Number(selectedService.durationMinutes ?? 0);
    if (!duration) return;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    form.setValue("endAt", toInputDateTime(endDate));
  }, [selectedService, watchedStartAt, watchedEndAt, form]);

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment(id);

  const onSubmit: SubmitHandler<AppointmentFormSchema> = (values) => {
    const endAtValue = values.endAt?.trim();
    const payload: AppointmentFormValues = {
      customerId: Number(values.customerId),
      serviceId: Number(values.serviceId),
      staffId: values.staffId !== undefined ? Number(values.staffId) : null,
      roomId: values.roomId !== undefined ? Number(values.roomId) : null,
      startAt: values.startAt,
      endAt: endAtValue ? endAtValue : undefined,
      status: values.status || undefined,
      notes: values.notes ?? null,
    };

    if (isEditMode) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    customersQuery.isLoading ||
    servicesQuery.isLoading;

  const dir = i18n.dir();

  if (isEditMode && !appointment) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="text-lg font-semibold">
            {t("appointments.not_loaded") || "Appointment not loaded"}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("appointments.return_to_list") ||
              "Please return to the appointments list and select an appointment to edit."}
          </p>
          <Button onClick={() => navigate("/appointments")}>
            {t("appointments.back_to_list") || "Back to Appointments"}
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

  const handleAutoEndAt = () => {
    if (!selectedService || !watchedStartAt) return;
    const startDate = new Date(watchedStartAt);
    if (Number.isNaN(startDate.getTime())) return;
    const duration = Number(selectedService.durationMinutes ?? 0);
    if (!duration) return;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    form.setValue("endAt", toInputDateTime(endDate));
  };

  return (
    <ProtectedComponent
      permission={isEditMode ? "appointments.update" : "appointments.create"}
    >
      <div className="min-h-screen p-4 my-4 bg-background text-foreground" dir={dir}>
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => navigate("/appointments")}
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
            {t("appointments.back_to_list") || "Back to Appointments"}
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
                <CalendarCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">
                  {isEditMode
                    ? t("appointments.edit") || "Edit appointment"
                    : t("appointments.create") || "Create appointment"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("appointments.edit_description") ||
                      "Update appointment details and assignments."
                    : t("appointments.create_description") ||
                      "Schedule a new appointment for a customer."}
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
                        A
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("appointments.details") || "Appointment details"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("appointments.basic_info") || "Basic Information"}
                        </h3>
                      </div>
                    </div>

                    {isCoreLocked ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
                        {t("appointments.locked_after_checkin") ||
                          "Appointment time and assignments are locked after check-in."}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("appointments.customer") || t("customer") || "Customer"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={
                                  t("appointments.select_customer") || "Select customer"
                                }
                                searchPlaceholder={
                                  t("appointments.search_customers") || "Search customers..."
                                }
                                onSearch={setCustomerSearch}
                                isLoading={customersQuery.isLoading}
                                emptyMessage={
                                  t("appointments.no_customers") || "No customers found"
                                }
                                allowClear={!!field.value}
                                onClear={() => field.onChange(undefined)}
                                dir={dir}
                              >
                                {customers.length ? (
                                  customers.map((customer) => (
                                    <SearchableSelectItem
                                      key={customer.id}
                                      value={String(customer.id)}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {`${customer.firstName ?? ""} ${
                                            customer.lastName ?? ""
                                          }`.trim() || `#${customer.id}`}
                                        </span>
                                        {customer.phone ? (
                                          <span className="text-xs text-muted-foreground">
                                            {customer.phone}
                                          </span>
                                        ) : null}
                                      </div>
                                    </SearchableSelectItem>
                                  ))
                                ) : (
                                  <SearchableSelectEmpty
                                    message={
                                      t("appointments.no_customers") || "No customers found"
                                    }
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
                        name="serviceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("appointments.service") || t("service") || "Service"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                disabled={isCoreLocked}
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={
                                  t("appointments.select_service") || "Select service"
                                }
                                searchPlaceholder={
                                  t("appointments.search_services") || "Search services..."
                                }
                                onSearch={setServiceSearch}
                                isLoading={servicesQuery.isLoading}
                                emptyMessage={
                                  t("appointments.no_services") || "No services found"
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
                                        <span className="font-medium">{service.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {service.durationMinutes ?? 0}{" "}
                                          {t("appointments.minutes") || "min"} -{" "}
                                          {getServicePriceFils(service)}{" "}
                                          {t("appointments.cents") || "fils"}
                                        </span>
                                      </div>
                                    </SearchableSelectItem>
                                  ))
                                ) : (
                                  <SearchableSelectEmpty
                                    message={
                                      t("appointments.no_services") || "No services found"
                                    }
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
                        name="staffId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("appointments.staff") || t("staff") || "Staff"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                disabled={isCoreLocked}
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={
                                  t("appointments.select_staff") || "Select staff"
                                }
                                searchPlaceholder={
                                  t("appointments.search_staff") || "Search staff..."
                                }
                                onSearch={setStaffSearch}
                                isLoading={staffQuery.isLoading}
                                emptyMessage={
                                  t("appointments.no_staff") || "No staff found"
                                }
                                allowClear={!!field.value}
                                onClear={() => field.onChange(undefined)}
                                dir={dir}
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
                                    message={
                                      t("appointments.no_staff") || "No staff found"
                                    }
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
                        name="roomId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("appointments.room") || t("room") || "Room"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                disabled={isCoreLocked}
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={t("appointments.select_room") || "Select room"}
                                searchPlaceholder={
                                  t("appointments.search_rooms") || "Search rooms..."
                                }
                                onSearch={setRoomSearch}
                                isLoading={roomsQuery.isLoading}
                                emptyMessage={t("appointments.no_rooms") || "No rooms found"}
                                allowClear={!!field.value}
                                onClear={() => field.onChange(undefined)}
                                dir={dir}
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
                                    message={
                                      t("appointments.no_rooms") || "No rooms found"
                                    }
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
                        name="startAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("appointments.start") || "Start time"}
                            </FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} disabled={isCoreLocked} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endAt"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between gap-2">
                              <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("appointments.end") || "End time"}
                            </FormLabel>
                            {selectedService ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAutoEndAt}
                                disabled={isCoreLocked}
                              >
                                {t("appointments.use_duration") || "Use duration"}
                              </Button>
                            ) : null}
                          </div>
                          <FormControl>
                              <Input type="datetime-local" {...field} disabled={isCoreLocked} />
                          </FormControl>
                          {!isCoreLocked ? (
                            <p className="text-xs text-muted-foreground">
                              {t("appointments.end_optional") ||
                                "Leave blank to auto-calculate from service duration."}
                            </p>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("appointments.status") || "Status"}
                            </FormLabel>
                            <FormControl>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={field.value || "booked"}
                                onChange={(e) => field.onChange(e.target.value)}
                              >
                                <option value="booked">
                                  {t("appointments.status_booked") || "Booked"}
                                </option>
                                <option value="checked_in">
                                  {t("appointments.status_checked_in") || "Checked in"}
                                </option>
                                <option value="in_service">
                                  {t("appointments.status_in_service") || "In service"}
                                </option>
                                <option value="completed">
                                  {t("appointments.status_completed") || "Completed"}
                                </option>
                                <option value="cancelled">
                                  {t("appointments.status_cancelled") || "Cancelled"}
                                </option>
                                <option value="no_show">
                                  {t("appointments.status_no_show") || "No show"}
                                </option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("appointments.notes") || "Notes"}
                            </FormLabel>
                            <FormControl>
                              <textarea
                                {...field}
                                rows={3}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder={
                                  t("appointments.notes_placeholder") ||
                                  "Add appointment notes..."
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {requiredRoomTypeId ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
                        {t("appointments.room_required") ||
                          "This service requires a specific room type."}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[120px]"
                      onClick={() => navigate("/appointments")}
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
                              {t("appointments.update") || "Update appointment"}
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
                              {t("appointments.create") || "Create appointment"}
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

export default AppointmentFormPage;
