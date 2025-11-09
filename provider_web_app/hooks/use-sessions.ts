"use client";
import { useEffect, useState } from "react";
import { api, SessionItem } from "@/lib/api";

interface UseSessionsResult {
  sessions: SessionItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSessions(limit = 100, recentHours = 0): UseSessionsResult {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
  const data = await api.getLiveSessions(limit, recentHours);
      setSessions(data);
    } catch (e: any) {
      setError(e.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15_000);
    return () => clearInterval(id);
  }, [limit, recentHours]);

  return { sessions, loading, error, refetch: fetchData };
}
