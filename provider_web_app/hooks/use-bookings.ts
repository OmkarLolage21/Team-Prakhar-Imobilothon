"use client";
import { useEffect, useState } from "react";
import { api, BookingLedgerItem } from "@/lib/api";

interface UseBookingsResult {
  bookings: BookingLedgerItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBookings(limit = 50): UseBookingsResult {
  const [bookings, setBookings] = useState<BookingLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecentBookings(limit);
      setBookings(data);
    } catch (e: any) {
      setError(e.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000); // refresh every 30s
    return () => clearInterval(id);
  }, [limit]);

  return { bookings, loading, error, refetch: fetchData };
}
