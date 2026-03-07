/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DoorOpen } from "lucide-react";
import { ClipLoader } from "react-spinners";

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
import { Checkbox } from "@/components/ui/checkbox";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useRoomTypes } from "@/hooks/roomTypes/useRoomTypes";
import {
  useCreateRoomType,
  useUpdateRoomType,
  type RoomTypeFormValues,
} from "@/hooks/roomTypes/useRoomTypeMutations";
import {
  roomTypeFormSchema,
  type RoomTypeFormSchema,
} from "@/pages/rooms/schemas/roomTypeFormSchema";
import type { RoomType } from "@/pages/rooms/types";

const RoomTypeFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const location = useLocation();

  const { data: roomTypesRes, isLoading } = useRoomTypes();
  const roomTypes = roomTypesRes?.data ?? [];

  const locationRoomType = (location.state as { roomType?: RoomType } | null)
    ?.roomType;
  const roomType =
    locationRoomType ||
    roomTypes.find((item) => String(item.id) === String(id));

  const createMutation = useCreateRoomType();
  const updateMutation = useUpdateRoomType(id);

  const form = useForm<RoomTypeFormSchema>({
    resolver: zodResolver(roomTypeFormSchema) as any,
    defaultValues: {
      name: "",
      requiresPrivate: false,
    },
  });

  useEffect(() => {
    if (isEditMode && roomType) {
      form.reset({
        name: roomType.name ?? "",
        requiresPrivate: Boolean(roomType.requiresPrivate),
      });
    }
  }, [isEditMode, roomType, form]);

  const onSubmit: SubmitHandler<RoomTypeFormSchema> = (values) => {
    const payload: RoomTypeFormValues = {
      name: values.name,
      requiresPrivate: Boolean(values.requiresPrivate),
    };

    if (isEditMode) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isBusy =
    createMutation.isPending || updateMutation.isPending || isLoading;
  const dir = i18n.dir();

  if (isEditMode && !isLoading && !roomType) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="text-lg font-semibold">
            {t("rooms.room_type_not_loaded") || "Room type not loaded"}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("rooms.return_to_room_types") ||
              "Please return to the room types list and select a room type to edit."}
          </p>
          <Button type="button" onClick={() => navigate("/rooms/types")}>
            {t("rooms.back_to_room_types") || "Back to Room Types"}
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading && isEditMode) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader size={50} color="hsl(var(--primary))" />
      </div>
    );
  }

  return (
    <ProtectedComponent
      permission={isEditMode ? "room_types.update" : "room_types.create"}
    >
      <div className="min-h-screen p-4 my-4 bg-background text-foreground" dir={dir}>
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            type="button"
            onClick={() => navigate("/rooms/types")}
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
            {t("rooms.back_to_room_types") || "Back to Room Types"}
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
                <DoorOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">
                  {isEditMode
                    ? t("rooms.edit_room_type") || "Edit room type"
                    : t("rooms.create_room_type") || "Create room type"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("rooms.edit_room_type_description") ||
                      "Update room type details."
                    : t("rooms.create_room_type_description") ||
                      "Create a new room type."}
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
                        T
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("rooms.room_type_details") || "Room type details"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("rooms.basic_info") || "Basic Information"}
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
                              {t("rooms.room_type") || "Room type"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("rooms.enter_room_type") ||
                                  "Room type name"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="requiresPrivate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("rooms.requires_private") || "Private room"}
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2">
                                <Checkbox
                                  checked={Boolean(field.value)}
                                  onCheckedChange={(value) =>
                                    field.onChange(value === true)
                                  }
                                />
                                <span className="text-sm text-foreground">
                                  {t("rooms.private_required_hint") ||
                                    "Requires a private room"}
                                </span>
                              </div>
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
                      onClick={() => navigate("/rooms/types")}
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
                      className="min-w-[160px]"
                    >
                      {isBusy ? (
                        <span className="flex items-center gap-2">
                          <ClipLoader
                            size={16}
                            color="hsl(var(--primary-foreground))"
                          />
                          {t("rooms.processing") || t("processing") || "Processing"}
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
                              {t("rooms.update_room_type") || "Update room type"}
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
                              {t("rooms.create_room_type") || "Create room type"}
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

export default RoomTypeFormPage;
