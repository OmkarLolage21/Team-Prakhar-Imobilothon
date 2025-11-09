"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface OccupancyPoint { date: string; occupancy: number }

interface UseOccupancyResult {
  occupancy: OccupancyPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOccupancy(days = 30): UseOccupancyResult {
  const [occupancy, setOccupancy] = useState<OccupancyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDailyOccupancy(days);
      setOccupancy(data);
    } catch (e: any) {
      setError(e.message || "Failed to load occupancy data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000); // refresh each minute
    return () => clearInterval(id);
  }, [days]);

  return { occupancy, loading, error, refetch: fetchData };
}
