import { useEffect, useMemo, useState } from 'react';
import type { ParkingOffer } from '@/types/parking';
import { searchOffers, type BackendOffer, getLots, type LotItem } from '@/lib/api';

// Simple in-memory cache to reuse offers between screens
let _cache: { offers: ParkingOffer[]; ts: number } | null = null;

function mapOffer(o: BackendOffer, lots?: LotItem[]): ParkingOffer {
  const pct = Math.max(0, Math.min(100, Math.round(o.p_free * 100)));
  const confidence = Math.max(1, Math.min(10, Math.round(o.p_free * 10)));
  // Try to find a lot with same cluster or slot prefix to get coordinates
  const lot = lots?.[0];
  return {
    id: o.slot_id,
    name: o.cluster_id || `Lot ${o.slot_id}`,
    address: `Near ${o.cluster_id || 'city center'}`,
    distance: Math.round((o.distance_m / 1000) * 10) / 10,
    price: Math.round(o.price),
    currency: '₹',
    availability: { percentage: pct, confidence, trend: 'stable' },
    features: { ev: !!o.ev, accessible: !!o.accessible, covered: true, security: true },
    sla: { hasBackup: o.mode_options?.includes('smart_hold') ?? true, guaranteedSpot: o.mode_options?.includes('guaranteed') ?? true },
    location: { lat: lot?.latitude ?? 12.9716, lng: lot?.longitude ?? 77.5946 },
    operatingHours: '24/7',
    entranceInfo: 'Use main entrance; follow signs',
    rules: ['Follow on-site instructions', 'Max height 2.1m', 'EV charging subject to availability'],
  };
}

export function useOffers(params?: { lat?: number; lng?: number; eta?: Date; lotId?: string }) {
  const [offers, setOffers] = useState<ParkingOffer[]>(_cache?.offers ?? []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState<string | null>(null);

  const lat = params?.lat ?? 12.9716;
  const lng = params?.lng ?? 77.5946;
  const etaIso = (params?.eta ?? new Date(Date.now() + 30 * 60000)).toISOString();

  async function fetchOffers() {
    try {
      setLoading(true);
      setError(null);
      const [res, lots] = await Promise.all([
        searchOffers(lat, lng, etaIso),
        getLots().catch(() => [] as LotItem[]),
      ]);
      let mapped = res.map(o => mapOffer(o, lots));
      // Fallback: if no predictive offers, use lots as pseudo-offers
      if (mapped.length === 0) {
        const lots: LotItem[] = await getLots();
        mapped = lots.map(l => ({
          id: l.id,
          name: l.name,
          address: l.name,
          distance: 0.5,
          price:  l.capacity ? Math.round( (l.occupancy / Math.max(1,l.capacity)) * 100 ) : 50,
          currency: '₹',
          availability: { percentage: l.capacity ? Math.round((1 - l.occupancy / Math.max(1,l.capacity)) * 100) : 50, confidence: 5, trend: 'stable' },
          features: { ev: true, accessible: true, covered: true, security: true },
          sla: { hasBackup: true, guaranteedSpot: true },
          location: { lat: l.latitude ?? lat, lng: l.longitude ?? lng },
          operatingHours: '24/7',
          entranceInfo: 'Use main entrance',
          rules: ['Max 4h parking', 'Validation required'],
        }));
      }
      _cache = { offers: mapped, ts: Date.now() };
      setOffers(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, etaIso, params?.lotId]);

  return { offers, loading, error, refetch: fetchOffers };
}

export function findOfferById(offers: ParkingOffer[], id?: string) {
  if (!id) return undefined;
  return offers.find(o => o.id === id);
}
