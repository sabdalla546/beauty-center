export interface Customer {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CustomersResponse {
  message?: string;
  data: Customer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages?: number;
  };
}

export interface CustomerDetailsResponse {
  message?: string;
  customer: Customer;
}
