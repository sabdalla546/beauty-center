export interface PaymentMethod {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentMethodsResponse {
  data: PaymentMethod[];
}
