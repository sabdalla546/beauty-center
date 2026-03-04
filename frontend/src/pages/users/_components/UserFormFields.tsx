// src/pages/users/_components/userFormFields.tsx
import { useTranslation } from "react-i18next";
import { User, Mail, Users, Lock } from "lucide-react";
import { useState } from "react";

// Components
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  SearchableSelect,
  SearchableSelectItem,
  SearchableSelectEmpty,
} from "@/components/ui/searchable-select";

// Types
import type { UseFormReturn } from "react-hook-form";
import type { UserFormValues } from "../schemas/userFormSchema";
import { Role } from "@/pages/roles&permissions/types";

interface UserFormFieldsProps {
  form: UseFormReturn<UserFormValues>;
  roles: Role[];
  isEditMode: boolean;
}

export const UserFormFields: React.FC<UserFormFieldsProps> = ({
  form,
  roles,
  isEditMode,
}) => {
  const { t, i18n } = useTranslation("common");
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const [roleSearchTerm, setRoleSearchTerm] = useState("");

  // Filter roles based on search term
  const filteredRoles = roles?.filter((role) =>
    role.name.toLowerCase().includes(roleSearchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 md:p-6 bg-slate-900/50 rounded-lg border border-slate-800">
      <FormField
        control={form.control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block text-sm font-medium text-slate-200 mb-1.5">
              {t("first_name", "First name")} *
            </FormLabel>
            <div className="relative">
              <User
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400"
                size={18}
              />
              <FormControl>
                <Input
                  placeholder={t("enter_first_name") || t("enter_name")}
                  {...field}
                  className="pl-8 bg-slate-950/70 border-slate-700 text-slate-50"
                  dir={dir}
                />
              </FormControl>
              <FormMessage className="text-red-400 text-sm mt-1" />
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block text-sm font-medium text-slate-200 mb-1.5">
              {t("last_name", "Last name")}
            </FormLabel>
            <div className="relative">
              <User
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400"
                size={18}
              />
              <FormControl>
                <Input
                  placeholder={t("enter_last_name") || t("enter_name")}
                  {...field}
                  className="pl-8 bg-slate-950/70 border-slate-700 text-slate-50"
                  dir={dir}
                />
              </FormControl>
              <FormMessage className="text-red-400 text-sm mt-1" />
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block text-sm font-medium text-slate-200 mb-1.5">
              {t("email")} *
            </FormLabel>
            <div className="relative">
              <Mail
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400"
                size={18}
              />
              <FormControl>
                <Input
                  type="email"
                  placeholder={t("enter_email")}
                  {...field}
                  className="pl-8 bg-slate-950/70 border-slate-700 text-slate-50"
                  dir={dir}
                />
              </FormControl>
              <FormMessage className="text-red-400 text-sm mt-1" />
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="roleId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="block text-sm font-medium text-slate-200 mb-1.5">
              {t("role")} *
            </FormLabel>
            <div className="relative">
              <Users
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400"
                size={18}
              />
              <FormControl>
                <SearchableSelect
                  value={
                    field.value !== undefined && field.value !== null
                      ? String(field.value)
                      : ""
                  }
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  placeholder={t("select_role")}
                  searchPlaceholder={t("search_roles")}
                  onSearch={setRoleSearchTerm}
                  isLoading={false}
                  emptyMessage={t("no_roles_found")}
                  allowClear={!!field.value}
                  onClear={() => field.onChange(undefined)}
                  dir={dir}
                  className="bg-slate-950/70 border-slate-700 text-slate-50"
                >
                  {filteredRoles?.length ? (
                    filteredRoles.map((role) => (
                      <SearchableSelectItem
                        key={role.id}
                        value={role.id.toString()}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-900/50 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-100">
                              {role.name}
                            </div>
                            {role.description && (
                              <div className="text-xs text-slate-400">
                                {role.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </SearchableSelectItem>
                    ))
                  ) : (
                    <SearchableSelectEmpty message={t("no_roles_found")} />
                  )}
                </SearchableSelect>
              </FormControl>
              <FormMessage className="text-red-400 text-sm mt-1" />
            </div>
          </FormItem>
        )}
      />

      {!isEditMode && (
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium text-slate-200 mb-1.5">
                {t("password")} *
              </FormLabel>
              <div className="relative">
                <Lock
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("enter_password")}
                    {...field}
                    className="pl-8 bg-slate-950/70 border-slate-700 text-slate-50"
                    dir={dir}
                  />
                </FormControl>
                <FormMessage className="text-red-400 text-sm mt-1" />
              </div>
            </FormItem>
          )}
        />
      )}

    </div>
  );
};
