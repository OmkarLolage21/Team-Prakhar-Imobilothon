// Shared TypeScript types & mapping helpers
export type PaymentStatus = "paid" | "pending" | "failed" | null;

export interface UIBooking {
  id: string;
  customer?: string | null;
  email?: string | null;
  lot?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  duration?: string | null;
  amount?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
  paymentStatus?: PaymentStatus;
}

export interface UISession {
  id: string;
  customer?: string | null;
  lot?: string | null;
  space?: string | null;
  startTime?: string | null;
  duration?: string | null;
  estimatedCost?: string | null;
  status?: string | null;
  vehicle?: string | null;
  plate?: string | null;
}
