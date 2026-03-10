import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { CalendarCheck, CheckCircle2, Clock3, Layers3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";
import {
  useCreateAppointment,
  type AppointmentFormValues,
} from "@/hooks/appointments/useAppointmentMutations";
import { useCustomers } from "@/hooks/customers/useCustomers";
import { useCustomerPackages } from "@/hooks/packages/useCustomerPackages";
import { useRooms } from "@/hooks/rooms/useRooms";
import {
  appointmentFormSchema,
  type AppointmentFormSchema,
} from "@/pages/appointments/schemas/appointmentFormSchema";
import { useServices } from "@/hooks/services/useServices";
import { useStaff } from "@/hooks/staff/useStaff";
import {
  APPOINTMENT_SOURCE_TYPE_OPTIONS,
  getAppointmentSourceTypeLabel,
} from "@/pages/appointments/appointmentWorkflow";
import type { Service } from "@/pages/services/types";
import { cn } from "@/lib/utils";

const toInputDateTime = (value?: string | Date | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getDefaultStartAt = () => {
  const date = new Date();
  date.setSeconds(0, 0);
  return toInputDateTime(date);
};

const getDefaultEndAt = (minutes = 60) => {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return toInputDateTime(date);
};

const getServiceDurationMinutes = (service?: Service | null) => {
  const value = Number(service?.durationMinutes ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

interface AppointmentCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AppointmentCreateDrawer: React.FC<AppointmentCreateDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const { t, i18n } = useTranslation("common");
  const dir = i18n.dir();

  const [customerSearch, setCustomerSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");

  const form = useForm<AppointmentFormSchema>({
    resolver: zodResolver(appointmentFormSchema) as any,
    defaultValues: {
      customerId: undefined as any,
      serviceId: undefined as any,
      staffId: undefined,
      roomId: undefined,
      sourceType: "single_service",
      sourceId: undefined,
      customerPackageId: undefined,
      startAt: getDefaultStartAt(),
      endAt: getDefaultEndAt(),
      status: "booked",
      notes: "",
      internalNotes: "",
    },
  });

  const watchedCustomerId = form.watch("customerId");
  const watchedServiceId = form.watch("serviceId");
  const watchedSourceType = form.watch("sourceType");
  const watchedStartAt = form.watch("startAt");
  const watchedEndAt = form.watch("endAt");

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
    enabled: open,
  });

  const services = servicesQuery.data?.data ?? [];
  const selectedService = services.find(
    (service) => String(service.id) === String(watchedServiceId),
  );
  const requiredRoomTypeId = selectedService?.requiredRoomTypeId ?? null;

  const roomsQuery = useRooms({
    searchQuery: roomSearch,
    roomTypeId: requiredRoomTypeId || undefined,
    enabled: open,
  });

  const customerPackagesQuery = useCustomerPackages({
    customerId: watchedCustomerId ? Number(watchedCustomerId) : undefined,
    onlyUsable: true,
    serviceId: watchedServiceId ? Number(watchedServiceId) : null,
  });

  const customers = customersQuery.data?.data ?? [];
  const staff = staffQuery.data?.data ?? [];
  const rooms = roomsQuery.data?.data ?? [];
  const customerPackages =
    watchedSourceType === "package" ? customerPackagesQuery.data?.data ?? [] : [];

  useEffect(() => {
    if (!open) {
      form.reset({
        customerId: undefined,
        serviceId: undefined,
        staffId: undefined,
        roomId: undefined,
        sourceType: "single_service",
        sourceId: undefined,
        customerPackageId: undefined,
        startAt: getDefaultStartAt(),
        endAt: getDefaultEndAt(),
        status: "booked",
        notes: "",
        internalNotes: "",
      });
      setCustomerSearch("");
      setServiceSearch("");
      setStaffSearch("");
      setRoomSearch("");
    }
  }, [form, open]);

  useEffect(() => {
    if (watchedSourceType === "package") return;
    if (!form.getValues("customerPackageId")) return;
    form.setValue("customerPackageId", undefined, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, watchedSourceType]);

  useEffect(() => {
    if (watchedSourceType !== "package") return;
    const selectedPackageId = Number(form.getValues("customerPackageId") ?? 0);
    if (!selectedPackageId) return;
    const exists = customerPackages.some(
      (customerPackage) => Number(customerPackage.id) === selectedPackageId,
    );
    if (!exists) {
      form.setValue("customerPackageId", undefined, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [customerPackages, form, watchedSourceType]);

  useEffect(() => {
    if (!selectedService || !watchedStartAt || watchedEndAt) return;
    const startDate = new Date(watchedStartAt);
    if (Number.isNaN(startDate.getTime())) return;
    const duration = getServiceDurationMinutes(selectedService);
    if (!duration) return;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    form.setValue("endAt", toInputDateTime(endDate));
  }, [form, selectedService, watchedEndAt, watchedStartAt]);

  const createMutation = useCreateAppointment({
    navigateOnSuccess: false,
    onSuccess: () => onOpenChange(false),
  });

  const handleAutoEndAt = () => {
    if (!selectedService || !watchedStartAt) return;
    const startDate = new Date(watchedStartAt);
    if (Number.isNaN(startDate.getTime())) return;
    const duration = getServiceDurationMinutes(selectedService);
    if (!duration) return;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    form.setValue("endAt", toInputDateTime(endDate), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit: SubmitHandler<AppointmentFormSchema> = (values) => {
    const payload: AppointmentFormValues = {
      customerId: Number(values.customerId),
      serviceId: Number(values.serviceId),
      staffId: values.staffId ? Number(values.staffId) : null,
      roomId: values.roomId ? Number(values.roomId) : null,
      sourceType: values.sourceType || "single_service",
      sourceId:
        values.sourceId !== undefined && values.sourceId !== null
          ? Number(values.sourceId)
          : null,
      customerPackageId:
        values.sourceType === "package" &&
        values.customerPackageId !== undefined &&
        values.customerPackageId !== null
          ? Number(values.customerPackageId)
          : null,
      startAt: values.startAt,
      endAt: values.endAt?.trim() || undefined,
      status: values.status || "booked",
      notes: values.notes ?? null,
      internalNotes: values.internalNotes ?? null,
    };

    createMutation.mutate(payload);
  };

  const isBusy =
    createMutation.isPending ||
    customersQuery.isLoading ||
    servicesQuery.isLoading ||
    (watchedSourceType === "package" && customerPackagesQuery.isLoading);

  const steps = useMemo(
    () => [
      {
        id: "customer_service",
        number: "01",
        title: t("appointments.step_customer_service") || "Customer and service",
        description:
          t("appointments.step_customer_service_description") ||
          "Choose the customer and the service being booked.",
        done: Boolean(watchedCustomerId && watchedServiceId),
      },
      {
        id: "schedule_assignment",
        number: "02",
        title:
          t("appointments.step_schedule_assignment") ||
          "Schedule and assignment",
        description:
          t("appointments.step_schedule_assignment_description") ||
          "Pick the slot, staff member, and room for the visit.",
        done: Boolean(watchedStartAt),
      },
      {
        id: "source_notes",
        number: "03",
        title: t("appointments.step_source_notes") || "Source and notes",
        description:
          t("appointments.step_source_notes_description") ||
          "Add package/source details and any notes for operations.",
        done: Boolean(
          watchedSourceType !== "package" || form.getValues("customerPackageId"),
        ),
      },
    ],
    [form, t, watchedCustomerId, watchedServiceId, watchedSourceType, watchedStartAt],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        animationVariant={dir === "rtl" ? "sheet-left" : "sheet-right"}
        className={cn(
          "h-dvh max-h-dvh w-full max-w-2xl gap-0 border-0 p-0 sm:max-w-2xl",
          dir === "rtl" ? "border-r" : "border-l",
        )}
      >
        <div className="flex h-full flex-col overflow-hidden" dir={dir}>
          <DialogHeader className="border-b border-border bg-card px-6 py-5 text-start">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <DialogTitle>
                  {t("appointments.create") || "Create appointment"}
                </DialogTitle>
                <DialogDescription>
                  {t("appointments.create_description") ||
                    "Schedule a new appointment for a customer."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="border-b border-border bg-muted/20 p-5 lg:border-b-0 lg:border-e">
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-2xl border px-4 py-3",
                      step.done
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-border bg-background/70",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                          step.done
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {step.done ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {step.title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 overflow-y-auto bg-background px-6 py-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Layers3 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">01</div>
                        <div className="font-semibold text-foreground">
                          {t("appointments.step_customer_service") ||
                            "Customer and service"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("appointments.customer") || "Customer"}
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
                                  t("appointments.search_customers") ||
                                  "Search customers..."
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
                                      t("appointments.no_customers") ||
                                      "No customers found"
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
                            <FormLabel>
                              {t("appointments.service") || "Service"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={
                                  t("appointments.select_service") || "Select service"
                                }
                                searchPlaceholder={
                                  t("appointments.search_services") ||
                                  "Search services..."
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
                                        <span className="font-medium">
                                          {service.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {getServiceDurationMinutes(service)}{" "}
                                          {t("appointments.minutes") || "min"}
                                        </span>
                                      </div>
                                    </SearchableSelectItem>
                                  ))
                                ) : (
                                  <SearchableSelectEmpty
                                    message={
                                      t("appointments.no_services") ||
                                      "No services found"
                                    }
                                  />
                                )}
                              </SearchableSelect>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>

                  <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Clock3 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">02</div>
                        <div className="font-semibold text-foreground">
                          {t("appointments.step_schedule_assignment") ||
                            "Schedule and assignment"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="startAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("appointments.start") || "Start time"}
                            </FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
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
                              <FormLabel>
                                {t("appointments.end") || "End time"}
                              </FormLabel>
                              {selectedService ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleAutoEndAt}
                                >
                                  {t("appointments.use_duration") || "Use duration"}
                                </Button>
                              ) : null}
                            </div>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              {t("appointments.end_optional") ||
                                "Leave blank to auto-calculate from service duration."}
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="staffId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("appointments.staff") || "Staff"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
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
                            <FormLabel>
                              {t("appointments.room") || "Room"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={
                                  t("appointments.select_room") || "Select room"
                                }
                                searchPlaceholder={
                                  t("appointments.search_rooms") || "Search rooms..."
                                }
                                onSearch={setRoomSearch}
                                isLoading={roomsQuery.isLoading}
                                emptyMessage={
                                  t("appointments.no_rooms") || "No rooms found"
                                }
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
                                        <span className="font-medium">
                                          {room.name}
                                        </span>
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
                        name="status"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>
                              {t("appointments.status") || "Status"}
                            </FormLabel>
                            <FormControl>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={field.value || "booked"}
                                onChange={(event) => field.onChange(event.target.value)}
                              >
                                <option value="booked">
                                  {t("appointments.status_booked") || "Booked"}
                                </option>
                                <option value="confirmed">
                                  {t("appointments.status_confirmed") || "Confirmed"}
                                </option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {requiredRoomTypeId ? (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
                        {t("appointments.room_required") ||
                          "This service requires a specific room type."}
                      </div>
                    ) : null}
                  </section>

                  <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">03</div>
                        <div className="font-semibold text-foreground">
                          {t("appointments.step_source_notes") ||
                            "Source and notes"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="sourceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("appointments.source_type") || "Source type"}
                            </FormLabel>
                            <FormControl>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={field.value || "single_service"}
                                onChange={(event) => field.onChange(event.target.value)}
                              >
                                {APPOINTMENT_SOURCE_TYPE_OPTIONS.map((sourceType) => (
                                  <option key={sourceType} value={sourceType}>
                                    {getAppointmentSourceTypeLabel(t, sourceType)}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sourceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("appointments.source_id") || "Source ID"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                value={field.value ?? ""}
                                onChange={(event) =>
                                  field.onChange(
                                    event.target.value
                                      ? Number(event.target.value)
                                      : undefined,
                                  )
                                }
                                placeholder={
                                  t("appointments.source_id_placeholder") ||
                                  "Optional reference"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {watchedSourceType === "package" ? (
                        <FormField
                          control={form.control}
                          name="customerPackageId"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>
                                {t("appointments.customer_package") ||
                                  "Customer package"}
                              </FormLabel>
                              <FormControl>
                                <SearchableSelect
                                  value={field.value ? String(field.value) : ""}
                                  onValueChange={(value) =>
                                    field.onChange(value ? Number(value) : undefined)
                                  }
                                  placeholder={
                                    t("appointments.select_customer_package") ||
                                    "Select customer package"
                                  }
                                  searchPlaceholder={
                                    t("appointments.search_customer_packages") ||
                                    "Search customer packages..."
                                  }
                                  isLoading={customerPackagesQuery.isLoading}
                                  emptyMessage={
                                    t("appointments.no_customer_packages") ||
                                    "No matching customer packages found"
                                  }
                                  allowClear={!!field.value}
                                  onClear={() => field.onChange(undefined)}
                                  dir={dir}
                                >
                                  {customerPackages.length ? (
                                    customerPackages.map((customerPackage) => (
                                      <SearchableSelectItem
                                        key={customerPackage.id}
                                        value={String(customerPackage.id)}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {customerPackage.plan?.name ||
                                              `#${customerPackage.id}`}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {t("appointments.sessions_remaining") ||
                                              "Remaining sessions"}
                                            : {customerPackage.remainingSessions ?? 0}
                                          </span>
                                        </div>
                                      </SearchableSelectItem>
                                    ))
                                  ) : (
                                    <SearchableSelectEmpty
                                      message={
                                        t("appointments.no_customer_packages") ||
                                        "No matching customer packages found"
                                      }
                                    />
                                  )}
                                </SearchableSelect>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : null}

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>
                              {t("appointments.notes") || "Notes"}
                            </FormLabel>
                            <FormControl>
                              <textarea
                                {...field}
                                value={field.value ?? ""}
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

                      <FormField
                        control={form.control}
                        name="internalNotes"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>
                              {t("appointments.internal_notes") ||
                                "Internal notes"}
                            </FormLabel>
                            <FormControl>
                              <textarea
                                {...field}
                                value={field.value ?? ""}
                                rows={3}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder={
                                  t("appointments.internal_notes_placeholder") ||
                                  "Add private operational notes..."
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>

                  <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-background/95 py-4 backdrop-blur sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isBusy}
                    >
                      {t("cancel") || "Cancel"}
                    </Button>
                    <Button type="submit" disabled={isBusy}>
                      {isBusy
                        ? t("processing") || "Processing"
                        : t("appointments.create") || "Create appointment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentCreateDrawer;
