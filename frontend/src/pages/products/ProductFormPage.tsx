/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Package } from "lucide-react";
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
  useCreateProduct,
  useUpdateProduct,
  type ProductFormValues,
} from "@/hooks/products/useProductMutations";
import {
  productFormSchema,
  type ProductFormSchema,
} from "@/pages/products/schemas/productFormSchema";
import type { Product, ProductsResponse } from "@/pages/products/types";

const normalizeValue = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const apiBaseUrl = (import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/api\/v1\/?$/, "");

const resolvePublicImageUrl = (
  imageUrl?: string | null,
  imagePath?: string | null,
) => {
  if (imageUrl) return imageUrl;
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  if (!apiBaseUrl) return cleanPath;
  return `${apiBaseUrl}${cleanPath}`;
};

const ProductFormPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const location = useLocation();
  const queryClient = useQueryClient();

  const locationProduct = (location.state as { product?: Product } | null)
    ?.product;

  const cachedProduct = useMemo(() => {
    if (!id) return undefined;
    const cached = queryClient.getQueriesData<ProductsResponse>({
      queryKey: ["products"],
    });
    for (const [, data] of cached) {
      const match = data?.data?.find(
        (product) => String(product.id) === String(id),
      );
      if (match) return match;
    }
    return undefined;
  }, [id, queryClient]);

  const product = locationProduct || cachedProduct;
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const existingImageUrl = useMemo(
    () => resolvePublicImageUrl(product?.imageUrl, product?.imagePath),
    [product?.imageUrl, product?.imagePath],
  );

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(id);

  const form = useForm<ProductFormSchema>({
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      sku: "",
      name: "",
      barcode: "",
      costKwd: 0,
      priceKwd: 0,
      currentQty: 0,
    },
  });

  useEffect(() => {
    if (isEditMode && product) {
      form.reset({
        sku: product.sku ?? "",
        name: product.name ?? "",
        barcode: product.barcode ?? "",
        costKwd:
          product.costKwd ??
          (Number.isFinite(product.costCents)
            ? Number(product.costCents) / 1000
            : 0),
        priceKwd:
          product.priceKwd ??
          (Number.isFinite(product.priceCents)
            ? Number(product.priceCents) / 1000
            : 0),
        currentQty: product.currentQty ?? 0,
      });
      setImageFile(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }, [isEditMode, product, form]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const onSubmit: SubmitHandler<ProductFormSchema> = (values) => {
    const payload: ProductFormValues = {
      sku: normalizeValue(values.sku) ?? null,
      name: values.name,
      barcode: normalizeValue(values.barcode) ?? null,
      costKwd: Number(values.costKwd ?? 0),
      priceKwd: Number(values.priceKwd ?? 0),
      currentQty: Number(values.currentQty ?? 0),
      image: imageFile ?? undefined,
    };

    if (isEditMode) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;
  const dir = i18n.dir();
  const imageSrc = imagePreview ?? existingImageUrl;

  if (isEditMode && !product) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="text-lg font-semibold">
            {t("products.product_not_loaded") || "Product not loaded"}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("products.return_to_list") ||
              "Please return to the products list and select a product to edit."}
          </p>
          <Button type="button" onClick={() => navigate("/inventory/products")}>
            {t("products.back_to_products") || "Back to Products"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedComponent
      permission={isEditMode ? "products.update" : "products.create"}
    >
      <div
        className="min-h-screen p-4 my-4 bg-background text-foreground"
        dir={dir}
      >
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            type="button"
            onClick={() => navigate("/inventory/products")}
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
            {t("products.back_to_products") || "Back to Products"}
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
                <Package className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">
                  {isEditMode
                    ? t("products.edit_product") || "Edit product"
                    : t("products.create_product") || "Create product"}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {isEditMode
                    ? t("products.edit_product_description") ||
                      "Update product details and pricing."
                    : t("products.create_product_description") ||
                      "Create a new product entry."}
                </p>
              </div>
            </div>
          </div>

          <Card className="bg-card border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-8">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        P
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("products.details") || "Product details"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("products.basic_info") || "Basic Information"}
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
                              {t("products.name") || t("name") || "Name"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("products.enter_name") ||
                                  t("enter_name") ||
                                  "Product name"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("products.sku") || "SKU"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("products.enter_sku") || "SKU"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("products.barcode") || "Barcode"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  t("products.enter_barcode") || "Barcode"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="product-image"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-[var(--color-text-main)]"
                          >
                            {t("products.image") || "Image"}
                          </label>
                          <span className="text-xs text-muted-foreground">
                            {t("products.image_optional") || "Optional"}
                          </span>
                        </div>
                        <Input
                          id="product-image"
                          ref={imageInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setImageFile(file);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("products.image_hint") ||
                            "PNG, JPG, or WEBP up to 5MB."}
                        </p>
                        {imageSrc ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={imageSrc}
                              alt={
                                product?.name || t("products.image") || "Image"
                              }
                              className="h-16 w-16 rounded-lg object-cover border border-border"
                              loading="lazy"
                            />
                            <div className="text-xs text-muted-foreground">
                              {imageFile?.name ||
                                t("products.current_image") ||
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
                                {t("products.clear_image") || "Clear"}
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {t("products.no_image") || "No image uploaded."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        C
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("products.pricing") || "Pricing"}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground">
                          {t("products.pricing_details") || "Pricing Details"}
                        </h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="costKwd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("products.cost_kwd") || "Cost (KWD)"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step={0.001}
                                {...field}
                              />
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
                              {t("products.price_kwd") || "Price (KWD)"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step={0.001}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currentQty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-[var(--color-text-main)]">
                              {t("products.quantity") || "Quantity"}
                            </FormLabel>
                            <FormControl>
                              <Input type="number" step={1} {...field} />
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
                      onClick={() => navigate("/inventory/products")}
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
                          {t("products.processing") ||
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
                              {t("products.update") || "Update product"}
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
                              {t("products.create") || "Create product"}
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

export default ProductFormPage;
