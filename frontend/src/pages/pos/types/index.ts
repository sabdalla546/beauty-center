export type PosLineType = "service" | "product" | "package";

export interface PosOrderItem {
  id?: number;
  lineType: PosLineType;
  referenceId?: number | null;
  description?: string | null;
  quantity: number;
  unitPriceKwd: number;
  totalPriceKwd: number;
  unitPriceFils?: number | null;
  totalPriceFils?: number | null;
  unitPriceCents?: number | null;
  totalPriceCents?: number | null;
  staffId?: number | null;
  roomId?: number | null;
  appointmentId?: number | null;
  coveredByCustomerPackageId?: number | null;
  coveredQty?: number | null;
  uncoveredQty?: number | null;
}

export interface PosPayment {
  id?: number;
  orderId?: number;
  amountKwd: number;
  amountFils?: number | null;
  amountCents?: number | null;
  methodId: number;
  status?: string;
  providerReference?: string | null;
  createdAt?: string;
}

export interface PosCustomer {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

export interface PosOrder {
  id: number;
  externalRef?: string | null;
  customerId?: number | null;
  createdBy: number;
  shiftSessionId?: number | null;
  status: string;
  subtotalKwd: number;
  discountKwd: number;
  taxKwd: number;
  totalKwd: number;
  paidKwd?: number | null;
  refundedKwd?: number | null;
  netPaidKwd?: number | null;
  remainingKwd?: number | null;
  subtotalFils?: number | null;
  discountFils?: number | null;
  taxFils?: number | null;
  totalFils?: number | null;
  paidFils?: number | null;
  refundedFils?: number | null;
  netPaidFils?: number | null;
  remainingFils?: number | null;
  subtotalCents?: number | null;
  discountCents?: number | null;
  taxCents?: number | null;
  totalCents?: number | null;
  items?: PosOrderItem[];
  payments?: PosPayment[];
  customer?: PosCustomer | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosOrderResponse {
  data: PosOrder;
}

export interface PosOrdersResponse {
  data: PosOrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages?: number;
  };
}

export interface PosPayResponse {
  data: {
    orderId: number;
    status: string;
    alreadyPaid?: boolean;
    paidFils?: number;
    remainingFils?: number;
    invoice80?: {
      orderId: number;
      status: string;
      createdAt?: string | null;
      externalRef?: string | null;
      customerName?: string | null;
      items?: Array<{
        id: number;
        type: PosLineType;
        description: string;
        quantity: number;
        unitPriceFils: number;
        totalPriceFils: number;
        unitPriceKwd: number;
        totalPriceKwd: number;
      }>;
      payments?: Array<{
        id: number;
        amountFils: number;
        amountKwd: number;
        methodCode: string;
        methodNameAr: string | null;
        methodNameEn: string | null;
        providerReference: string | null;
        status: string;
        createdAt: string | null;
      }>;
      totals?: {
        subtotalFils: number;
        discountFils: number;
        taxFils: number;
        totalFils: number;
        paidFils: number;
        refundedFils: number;
        netPaidFils: number;
        remainingFils: number;
        subtotalKwd: number;
        discountKwd: number;
        taxKwd: number;
        totalKwd: number;
        paidKwd: number;
        refundedKwd: number;
        netPaidKwd: number;
        remainingKwd: number;
      };
      generatedAt: string;
    };
    invoice80Html?: string;
  };
}
