export interface Product {
  id: number;
  sku?: string | null;
  name: string;
  barcode?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
  costKwd?: number | null;
  priceKwd?: number | null;
  costFils?: number | null;
  priceFils?: number | null;
  costCents?: number | null;
  priceCents?: number | null;
  currentQty?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages?: number;
  };
}
