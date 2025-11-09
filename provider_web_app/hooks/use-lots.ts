"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface LotItem {
  id: string;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity: number;
  occupancy: number;
  amenities: string[];
}

export function useLots(): { lots: LotItem[]; loading: boolean; error: string | null; refetch: () => void } {
  const [lots, setLots] = useState<LotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: LotItem[] = await api.getLots();
      setLots(data);
    } catch (e: any) {
      setError(e.message || "Failed to load lots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000); // auto refresh every 30s
    return () => clearInterval(id);
  }, []);

  return { lots, loading, error, refetch: fetchData };
}
