/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DoorOpen } from "lucide-react";
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
  useCreateRoom,
  useUpdateRoom,
  type RoomFormValues,
} from "@/hooks/rooms/useRoomMutations";
import {
  roomFormSchema,
  type RoomFormSchema,
} from "@/pages/rooms/schemas/roomFormSchema";
import type { Room, RoomsResponse } from "@/pages/rooms/types";
import { useRoomTypes } from "@/hooks/roomTypes/useRoomTypes";

const normalizeValue = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const RoomFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const location = useLocation();
  const queryClient = useQueryClient();
  const [roomTypeSearch, setRoomTypeSearch] = useState("");

  const { data: roomTypesRes, isLoading: roomTypesLoading } = useRoomTypes();
  const roomTypes = roomTypesRes?.data ?? [];

  const locationRoom = (location.state as { room?: Room } | null)?.room;

  const cachedRoom = useMemo(() => {
    if (!id) return undefined;
    const cached = queryClient.getQueriesData<RoomsResponse>({
      queryKey: ["rooms"],
    });
    for (const [, data] of cached) {
      const match = data?.data?.find(
        (room) => String(room.id) === String(id),
      );
      if (match) return match;
    }
    return undefined;
  }, [id, queryClient]);

  const room = locationRoom || cachedRoom;

  const createMutation = useCreateRoom();
  const updateMutation = useUpdateRoom(id);

  const form = useForm<RoomFormSchema>({
    resolver: zodResolver(roomFormSchema) as any,
    defaultValues: {
      name: "",
      roomTypeId: undefined,
      capacity: 1,
      status: "available",
    },
  });

  useEffect(() => {
    if (isEditMode && room) {
      form.reset({
        name: room.name ?? "",
        roomTypeId: room.roomTypeId ?? undefined,
        capacity: room.capacity ?? 1,
        status: room.status ?? "available",
      });
    }
  }, [isEditMode, room, form]);

  const onSubmit: SubmitHandler<RoomFormSchema> = (values) => {
    const payload: RoomFormValues = {
      name: values.name,
      roomTypeId:
        values.roomTypeId !== undefined ? Number(values.roomTypeId) : null,
      capacity: values.capacity ? Number(values.capacity) : undefined,
      status: normalizeValue(values.status),
    };

    if (isEditMode) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    roomTypesLoading;
  const dir = i18n.dir();

  if (isEditMode && !room) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="text-lg font-semibold">
            {t("rooms.room_not_loaded") || "Room not loaded"}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("rooms.return_to_list") ||
              "Please return to the rooms list and select a room to edit."}
          </p>
          <Button onClick={() => navigate("/rooms")}>
            {t("rooms.back_to_rooms") || "Back to Rooms"}
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

  const filteredRoomTypes = roomTypeSearch
    ? roomTypes.filter((roomType) =>
        roomType.name.toLowerCase().includes(roomTypeSearch.toLowerCase()),
      )
    : roomTypes;

  return (
    <ProtectedComponent
      permission={isEditMode ? "rooms.update" : "rooms.create"}
    >
      <div className="min-h-screen p-4 my-4 bg-background text-foreground" dir={dir}>
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => navigate("/rooms")}
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
            {t("rooms.back_to_rooms") || "Back to Rooms"}
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
                    ? t("rooms.edit_room") || "Edit room"
                    : t("rooms.create_room") || "Create room"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("rooms.edit_room_description") ||
                      "Update room information."
                    : t("rooms.create_room_description") ||
                      "Create a new room entry."}
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
                        R
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("rooms.details") || "Room details"}
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
                              {t("rooms.name") || t("name") || "Name"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("rooms.enter_name") ||
                                  t("enter_name") ||
                                  "Room name"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="roomTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("rooms.room_type") || "Room type"}
                            </FormLabel>
                            <FormControl>
                              <SearchableSelect
                                value={field.value ? String(field.value) : ""}
                                onValueChange={(value) =>
                                  field.onChange(value ? Number(value) : undefined)
                                }
                                placeholder={
                                  t("rooms.select_room_type") || "Select room type"
                                }
                                searchPlaceholder={
                                  t("rooms.search_room_types") ||
                                  "Search room types..."
                                }
                                onSearch={setRoomTypeSearch}
                                isLoading={roomTypesLoading}
                                emptyMessage={
                                  t("rooms.no_room_types") ||
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
                                            {t("rooms.requires_private") ||
                                              "Private room"}
                                          </span>
                                        ) : null}
                                      </div>
                                    </SearchableSelectItem>
                                  ))
                                ) : (
                                  <SearchableSelectEmpty
                                    message={
                                      t("rooms.no_room_types") ||
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
                      <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("rooms.capacity") || "Capacity"}
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min={1} max={50} {...field} />
                            </FormControl>
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
                              {t("rooms.status") || "Status"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("rooms.enter_status") || "available"
                                }
                              />
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
                      onClick={() => navigate("/rooms")}
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
                              {t("rooms.update") || "Update room"}
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
                              {t("rooms.create") || "Create room"}
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

export default RoomFormPage;
