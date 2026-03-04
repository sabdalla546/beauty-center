/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Briefcase } from "lucide-react";
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
  useCreateService,
  useUpdateService,
  type ServiceFormValues,
} from "@/hooks/services/useServiceMutations";
import {
  serviceFormSchema,
  type ServiceFormSchema,
} from "@/pages/services/schemas/serviceFormSchema";
import type { Service, ServicesResponse } from "@/pages/services/types";
import { useRoomTypes } from "@/hooks/roomTypes/useRoomTypes";

const normalizeValue = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const apiBaseUrl = (import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/api\/v1\/?$/, "");
const uploadsBaseUrl = (import.meta.env.VITE_UPLOADS_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

const joinBaseAndPath = (base: string, path: string) => {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanBase.endsWith("/uploads") && cleanPath.startsWith("/uploads/")) {
    return `${cleanBase}${cleanPath.slice("/uploads".length)}`;
  }
  return `${cleanBase}${cleanPath}`;
};

const resolvePublicImageUrl = (
  imageUrl?: string | null,
  imagePath?: string | null,
) => {
  if (imagePath) {
    if (imagePath.startsWith("http")) return imagePath;
    if (uploadsBaseUrl) return joinBaseAndPath(uploadsBaseUrl, imagePath);
    if (apiBaseUrl) return joinBaseAndPath(apiBaseUrl, imagePath);
    return imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  }
  if (imageUrl) return imageUrl;
  return null;
};

const ServiceFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const location = useLocation();
  const queryClient = useQueryClient();
  const [roomSearchTerm, setRoomSearchTerm] = useState("");

  const { data: roomTypesRes, isLoading: roomTypesLoading } = useRoomTypes();
  const roomTypes = roomTypesRes?.data ?? [];

  const locationService = (location.state as { service?: Service } | null)
    ?.service;

  const cachedService = useMemo(() => {
    if (!id) return undefined;
    const cached = queryClient.getQueriesData<ServicesResponse>({
      queryKey: ["services"],
    });
    for (const [, data] of cached) {
      const match = data?.data?.find(
        (service) => String(service.id) === String(id),
      );
      if (match) return match;
    }
    return undefined;
  }, [id, queryClient]);

  const service = locationService || cachedService;
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const existingImageUrl = useMemo(
    () => resolvePublicImageUrl(service?.imageUrl, service?.imagePath),
    [service?.imageUrl, service?.imagePath],
  );

  const createMutation = useCreateService();
  const updateMutation = useUpdateService(id);

  const form = useForm<ServiceFormSchema>({
    resolver: zodResolver(serviceFormSchema) as any,
    defaultValues: {
      code: "",
      name: "",
      durationMinutes: 30,
      priceKwd: 0,
      requiredRoomTypeId: undefined,
    },
  });

  useEffect(() => {
    if (isEditMode && service) {
      form.reset({
        code: service.code ?? "",
        name: service.name ?? "",
        durationMinutes: service.durationMinutes ?? 30,
        priceKwd: service.priceKwd ?? 0,
        requiredRoomTypeId: service.requiredRoomTypeId ?? undefined,
      });
      setImageFile(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }, [isEditMode, service, form]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const onSubmit: SubmitHandler<ServiceFormSchema> = (values) => {
    const payload: ServiceFormValues = {
      code: normalizeValue(values.code) ?? null,
      name: values.name,
      durationMinutes: Number(values.durationMinutes),
      priceKwd: Number(values.priceKwd),
      requiredRoomTypeId:
        values.requiredRoomTypeId !== undefined
          ? Number(values.requiredRoomTypeId)
          : null,
      image: imageFile ?? undefined,
    };

    if (isEditMode) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    roomTypesLoading;
  const dir = i18n.dir();
  const imageSrc = imagePreview ?? existingImageUrl;

  if (isEditMode && !service) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="text-lg font-semibold">
            {t("services.service_not_loaded") || "Service not loaded"}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("services.return_to_list") ||
              "Please return to the services list and select a service to edit."}
          </p>
          <Button onClick={() => navigate("/services")}>
            {t("services.back_to_services") || "Back to Services"}
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

  const filteredRoomTypes = roomSearchTerm
    ? roomTypes.filter((roomType) =>
        roomType.name.toLowerCase().includes(roomSearchTerm.toLowerCase()),
      )
    : roomTypes;

  return (
    <ProtectedComponent
      permission={isEditMode ? "services.update" : "services.create"}
    >
      <div className="min-h-screen p-4 my-4 bg-background text-foreground" dir={dir}>
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => navigate("/services")}
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
            {t("services.back_to_services") || "Back to Services"}
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
                <Briefcase className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">
                  {isEditMode
                    ? t("services.edit_service") || "Edit service"
                    : t("services.create_service") || "Create service"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("services.edit_service_description") ||
                      "Update service details."
                    : t("services.create_service_description") ||
                      "Create a new service entry."}
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
                        S
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("services.details") || "Service details"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("services.basic_info") || "Basic Information"}
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
                              {t("services.name") || t("name") || "Name"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("services.enter_name") ||
                                  t("enter_name") ||
                                  "Service name"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("services.code") || "Code"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("services.enter_code") || "Code"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="service-image"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-[var(--color-text-main)]"
                          >
                            {t("services.image") || "Image"}
                          </label>
                          <span className="text-xs text-muted-foreground">
                            {t("services.image_optional") || "Optional"}
                          </span>
                        </div>
                        <Input
                          id="service-image"
                          ref={imageInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setImageFile(file);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("services.image_hint") ||
                            "PNG, JPG, or WEBP up to 5MB."}
                        </p>
                        {imageSrc ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={imageSrc}
                              alt={service?.name || t("services.image") || "Image"}
                              className="h-16 w-16 rounded-lg object-cover border border-border"
                              loading="lazy"
                            />
                            <div className="text-xs text-muted-foreground">
                              {imageFile?.name ||
                                t("services.current_image") ||
                                "Current image"}
                            </div>
                            {imageFile ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  setImageFile(null);
                                  if (imageInputRef.current) {
                                    imageInputRef.current.value = "";
                                  }
                                }}
                              >
                                {t("services.clear_image") || "Clear"}
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {t("services.no_image") || "No image uploaded."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        P
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("services.pricing") || "Pricing"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("services.pricing_details") || "Pricing Details"}
                        </h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="durationMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("services.duration") || "Duration"}
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min={5} max={1440} {...field} />
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
                              {t("services.price_kwd") || "Price (KWD)"}
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
                        name="requiredRoomTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("services.room_type") || "Room type"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={
                                  t("services.select_room_type") || "Select room type"
                                }
                                searchPlaceholder={
                                  t("services.search_room_types") ||
                                  "Search room types..."
                                }
                                onSearch={setRoomSearchTerm}
                                isLoading={roomTypesLoading}
                                emptyMessage={
                                  t("services.no_room_types") ||
                                  "No room types available"
                                }
                                allowClear={!!field.value}
                                onClear={() => field.onChange(undefined)}
                                dir={dir}
                              >
                                {filteredRoomTypes.length ? (
                                  filteredRoomTypes.map((roomType) => (
                                    <SearchableSelectItem
                                      key={roomType.id}
                                      value={String(roomType.id)}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {roomType.name}
                                        </span>
                                        {roomType.requiresPrivate ? (
                                          <span className="text-xs text-muted-foreground">
                                            {t("services.requires_private") ||
                                              "Private room"}
                                          </span>
                                        ) : null}
                                      </div>
                                    </SearchableSelectItem>
                                  ))
                                ) : (
                                  <SearchableSelectEmpty
                                    message={
                                      t("services.no_room_types") ||
                                      "No room types available"
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
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[120px]"
                      onClick={() => navigate("/services")}
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
                    <Button
                      type="submit"
                      disabled={isBusy}
                      className="min-w-[140px]"
                    >
                      {isBusy ? (
                        <span className="flex items-center gap-2">
                          <ClipLoader
                            size={16}
                            color="hsl(var(--primary-foreground))"
                          />
                          {t("services.processing") || t("processing") || "Processing"}
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
                              {t("services.update") || "Update service"}
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
                              {t("services.create") || "Create service"}
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

export default ServiceFormPage;
