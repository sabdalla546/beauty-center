export interface ShiftSession {
  id: number;
  userId: number;
  openedAt: string;
  closedAt?: string | null;
  openingCashFils?: number | null;
  closingCashFils?: number | null;
  expectedCashFils?: number | null;
  notes?: string | null;
}

export interface ShiftOpenResponse {
  data: ShiftSession | null;
}

export interface ShiftCloseSummary {
  shiftId: number;
  openedAt: string;
  closedAt: string;
  openingCashFils: number;
  sumCashFils: number;
  expectedCashFils: number;
  closingCashFils: number;
  varianceFils: number;
}

export interface ShiftCloseResponse {
  data: ShiftCloseSummary;
}

export interface ShiftSummary {
  shiftId: number;
  period: {
    from: string;
    to: string;
  };
  sales: {
    grossFils: number;
    refundsFils: number;
    netFils: number;
  };
  paymentsByMethod: Array<{
    methodId: number;
    methodCode: string;
    methodName: string;
    salesFils: number;
    refundsFils: number;
    netFils: number;
  }>;
  cashControl: {
    openingCashFils: number;
    expectedCashFils: number;
    actualCashFils: number;
    varianceFils: number;
  };
  commissions: {
    totalCommissionFils: number;
    byStaff: Array<{
      staffId: number;
      staffName: string;
      commissionFils: number;
      breakdown: Array<{
        orderItemId: number;
        baseFils: number;
        percent: number;
        commissionFils: number;
      }>;
    }>;
  };
}

export interface ShiftSummaryResponse {
  data: ShiftSummary;
}
