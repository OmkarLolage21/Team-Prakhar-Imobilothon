"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface RevenuePoint {
  date: string; // ISO or date string from backend
  amount: number; // captured revenue for the day
}

interface UseRevenueResult {
  revenue: RevenuePoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRevenue(days = 30): UseRevenueResult {
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDailyRevenue(days);
      setRevenue(data);
    } catch (e: any) {
      setError(e.message || "Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, [days]);

  return { revenue, loading, error, refetch: fetchData };
}
