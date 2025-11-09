import { useEffect, useState } from 'react';
import { getLots, type LotItem } from '@/lib/api';

export function useLots() {
  const [lots, setLots] = useState<LotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLots() {
    try {
      setLoading(true);
      setError(null);
      const res = await getLots();
      setLots(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load lots');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchLots(); }, []);

  return { lots, loading, error, refetch: fetchLots };
}
