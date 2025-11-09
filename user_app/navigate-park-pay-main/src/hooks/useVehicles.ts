import { useEffect, useMemo, useState } from 'react';
import { getVehicles, addVehicle, deleteVehicle, type Vehicle } from '@/lib/api';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(() => {
    try { return localStorage.getItem('activeVehicleId'); } catch { return null; }
  });

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const v = await getVehicles();
      setVehicles(v);
    } catch (e: any) {
      setError(e?.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }

  async function add(v: Omit<Vehicle, 'id'>) {
    const created = await addVehicle(v);
    setVehicles(prev => [...prev, created]);
    return created;
  }

  async function remove(id: string) {
    await deleteVehicle(id);
    setVehicles(prev => prev.filter(x => x.id !== id));
    // If removed active vehicle, clear selection
    setActiveVehicleId(prev => (prev === id ? null : prev));
  }

  useEffect(() => { void refresh(); }, []);

  // Persist active vehicle id
  useEffect(() => {
    try {
      if (activeVehicleId) localStorage.setItem('activeVehicleId', activeVehicleId);
      else localStorage.removeItem('activeVehicleId');
    } catch {}
  }, [activeVehicleId]);

  const activeVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles[0];
  }, [vehicles, activeVehicleId]);

  return { vehicles, loading, error, refresh, add, remove, activeVehicle, activeVehicleId, setActiveVehicleId };
}
