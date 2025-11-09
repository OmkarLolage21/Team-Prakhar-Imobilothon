"use client";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

export interface LotItem {
  id: string;
  name: string;
  location?: string | null;
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
      const res = await fetch(`${API_BASE}/inventory/lots`, { cache: "no-store" });
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      const data: LotItem[] = await res.json();
      setLots(data);
    } catch (e: any) {
      setError(e.message || "Failed to load lots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { lots, loading, error, refetch: fetchData };
}
