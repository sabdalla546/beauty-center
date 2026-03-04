/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CreditCard } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  type PaymentMethodFormValues,
} from "@/hooks/paymentMethods/usePaymentMethodMutations";
import {
  paymentMethodFormSchema,
  type PaymentMethodFormSchema,
} from "@/pages/paymentMethods/schemas/paymentMethodFormSchema";
import type { PaymentMethod } from "@/pages/paymentMethods/types";

const PaymentMethodFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const location = useLocation();
  const queryClient = useQueryClient();

  const locationMethod = (
    location.state as { method?: PaymentMethod } | null
  )?.method;

  const cachedMethod = useMemo(() => {
    if (!id) return undefined;
    const cached = queryClient.getQueriesData<PaymentMethod[]>({
      queryKey: ["payment-methods"],
    });
    for (const [, data] of cached) {
      const match = data?.find((method) => String(method.id) === String(id));
      if (match) return match;
    }
    return undefined;
  }, [id, queryClient]);

  const method = locationMethod || cachedMethod;

  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod(id);

  const form = useForm<PaymentMethodFormSchema>({
    resolver: zodResolver(paymentMethodFormSchema) as any,
    defaultValues: {
      code: "",
      nameEn: "",
      nameAr: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEditMode && method) {
      form.reset({
        code: method.code ?? "",
        nameEn: method.nameEn ?? "",
        nameAr: method.nameAr ?? "",
        isActive: method.isActive ?? true,
      });
    }
  }, [isEditMode, method, form]);

  const onSubmit: SubmitHandler<PaymentMethodFormSchema> = (values) => {
    const payload: PaymentMethodFormValues = {
      code: values.code,
      nameEn: values.nameEn,
      nameAr: values.nameAr,
      isActive: values.isActive,
    };

    if (isEditMode) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;
  const dir = i18n.dir();

  if (isEditMode && !method) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="text-lg font-semibold">
            {t("payment_methods.method_not_loaded") || "Payment method not loaded"}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("payment_methods.return_to_list") ||
              "Please return to the payment methods list and select a method to edit."}
          </p>
          <Button onClick={() => navigate("/system/payment-methods")}>
            {t("payment_methods.back_to_methods") || "Back to Payment Methods"}
          </Button>
        </Card>
      </div>
    );
  }

  if (isBusy) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader size={50} color="hsl(var(--primary))" />
      </div>
    );
  }

  return (
    <ProtectedComponent
      permission={isEditMode ? "payment_methods.update" : "payment_methods.create"}
    >
      <div className="min-h-screen p-4 my-4 bg-background text-foreground" dir={dir}>
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => navigate("/system/payment-methods")}
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
            {t("payment_methods.back_to_methods") || "Back to Payment Methods"}
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
                <CreditCard className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">
                  {isEditMode
                    ? t("payment_methods.edit_method") || "Edit payment method"
                    : t("payment_methods.create_method") || "Create payment method"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("payment_methods.edit_method_description") ||
                      "Update payment method details."
                    : t("payment_methods.create_method_description") ||
                      "Create a new payment method."}
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
                        P
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("payment_methods.details") || "Payment method details"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("payment_methods.basic_info") || "Basic Information"}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("payment_methods.code") || "Code"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("payment_methods.enter_code") || "Code"}
                                disabled={isEditMode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nameEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("payment_methods.name_en") || "Name (EN)"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("payment_methods.enter_name_en") || "Cash"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("payment_methods.name_ar") || "Name (AR)"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("payment_methods.enter_name_ar") || "نقداً"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        S
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("payment_methods.status") || "Status"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("payment_methods.activation") || "Activation"}
                        </h3>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3 rounded-xl border p-4 border-border bg-muted/20">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(v) => field.onChange(Boolean(v))}
                              />
                            </FormControl>
                            <FormLabel className="cursor-pointer">
                              {t("payment_methods.active") || "Active"}
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[120px]"
                      onClick={() => navigate("/system/payment-methods")}
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
                          {t("payment_methods.processing") ||
                            t("processing") ||
                            "Processing"}
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
                              {t("payment_methods.update") || "Update"}
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
                              {t("payment_methods.create") || "Create"}
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

export default PaymentMethodFormPage;
