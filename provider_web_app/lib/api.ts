/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: any;
export const API_BASE = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_URL) || "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.json();
}

export interface BookingLedgerItem {
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
  paymentStatus?: "paid" | "pending" | "failed" | null;
}

export interface SessionItem {
  session_id: string;
  booking_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  validation_method?: string | null;
  bay_label?: string | null;
  grace_ends_at?: string | null;
}

export const api = {
  getRecentBookings: (limit = 50) => get<BookingLedgerItem[]>(`/bookings/recent?limit=${limit}`),
  getLiveSessions: (limit = 100) => get<SessionItem[]>(`/sessions/live?limit=${limit}`),
  getDailyRevenue: (days = 30) => get<{ date: string; amount: number }[]>(`/analytics/revenue/daily?days=${days}`),
  getDailyOccupancy: (days = 30) => get<{ date: string; occupancy: number }[]>(`/analytics/occupancy/daily?days=${days}`),
  getLots: () => get<any[]>(`/inventory/lots`),
  getLotDetail: (id: string) => get<any>(`/inventory/lots/${id}`),
  createLot: async (payload: any) => {
    const res = await fetch(`${API_BASE}/inventory/lots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`createLot failed: ${res.status}`);
    return res.json();
  },
};
