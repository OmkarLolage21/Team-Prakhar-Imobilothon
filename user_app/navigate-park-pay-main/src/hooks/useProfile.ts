import { useEffect, useState } from 'react';
import { getProfile, updateProfile, Profile } from '@/lib/api';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const p = await getProfile();
      setProfile(p);
    } catch (e: any) {
      setError(e?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function save(partial: Partial<Profile>) {
    const updated = await updateProfile(partial);
    setProfile(updated);
    return updated;
  }

  useEffect(() => { void refresh(); }, []);

  return { profile, loading, error, refresh, save };
}
