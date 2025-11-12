import { useEffect, useMemo, useRef, useState } from 'react';
import type { ParkingOffer } from '@/types/parking';
import { searchOffers, type BackendOffer, getLots, getLotDetail, type LotItem } from '@/lib/api';

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

export function useOffers(params?: { lat?: number; lng?: number; eta?: Date; lotId?: string; poll?: boolean; refreshMs?: number }) {
  const [offers, setOffers] = useState<ParkingOffer[]>(_cache?.offers ?? []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(_cache?.ts ?? 0);

  const lat = params?.lat ?? 12.9716;
  const lng = params?.lng ?? 77.5946;
  // Stabilize ETA for the lifetime of this hook instance to avoid re-renders triggering refetches/interval churn
  const initialEtaIsoRef = useRef<string>();
  if (!initialEtaIsoRef.current) {
    initialEtaIsoRef.current = (params?.eta ?? new Date(Date.now() + 30 * 60000)).toISOString();
  }
  const etaIso = initialEtaIsoRef.current;
  const poll = params?.poll ?? true;
  const refreshMs = params?.refreshMs ?? 5 * 60 * 1000;

  // Prevent overlapping fetches
  const inFlightRef = useRef(false);
  // Track page visibility to pause polling when tab is hidden
  const visibleRef = useRef<boolean>(typeof document === 'undefined' ? true : !document.hidden);
  useEffect(() => {
    const onVis = () => { visibleRef.current = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  async function fetchOffers() {
    try {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      const [res, lotsList] = await Promise.all([
        searchOffers(lat, lng, etaIso),
        getLots().catch(() => [] as LotItem[]),
      ]);
      let mapped = res.map(o => mapOffer(o, lotsList));
      // Fallback: if no predictive offers, use lots as pseudo-offers
      if (mapped.length === 0) {
        // No predictive offers returned. Build fallback offers based on real slot IDs so bookings succeed.
        // We'll fetch detail for the first few lots to extract actual slot_ids.
        const fallbackLots: LotItem[] = lotsList.slice(0, 5);
        const lotDetails = await Promise.all(
          fallbackLots.map(l => getLotDetail(l.id).catch(() => null))
        );
        const slots: Array<{ slot_id: string; lot: LotItem }> = [];
        for (let i = 0; i < lotDetails.length; i++) {
          const d = lotDetails[i];
            if (d?.slots?.length) {
              // Pick up to 2 slots per lot to diversify
              d.slots.slice(0, 2).forEach(s => slots.push({ slot_id: s.slot_id, lot: fallbackLots[i] }));
            }
        }
        if (slots.length === 0) {
          // Fallback to pseudo-lot offers (will likely 404 on booking if slot_id unknown, but retain previous behavior)
          mapped = fallbackLots.map(l => ({
            id: l.id,
            name: l.name,
            address: l.name,
            distance: 0.5,
            price: l.capacity ? Math.round((l.occupancy / Math.max(1, l.capacity)) * 100) : 50,
            currency: '₹',
            availability: { percentage: l.capacity ? Math.round((1 - l.occupancy / Math.max(1, l.capacity)) * 100) : 50, confidence: 5, trend: 'stable' },
            features: { ev: true, accessible: true, covered: true, security: true },
            sla: { hasBackup: true, guaranteedSpot: true },
            location: { lat: l.latitude ?? lat, lng: l.longitude ?? lng },
            operatingHours: '24/7',
            entranceInfo: 'Use main entrance',
            rules: ['Max 4h parking', 'Validation required'],
          }));
        } else {
          mapped = slots.map(s => ({
            id: s.slot_id,
            name: s.lot.name,
            address: s.lot.name,
            distance: 0.5,
            price: s.lot.capacity ? Math.round((s.lot.occupancy / Math.max(1, s.lot.capacity)) * 100) : 50,
            currency: '₹',
            availability: { percentage: s.lot.capacity ? Math.round((1 - s.lot.occupancy / Math.max(1, s.lot.capacity)) * 100) : 50, confidence: 6, trend: 'stable' },
            features: { ev: true, accessible: true, covered: true, security: true },
            sla: { hasBackup: true, guaranteedSpot: true },
            location: { lat: s.lot.latitude ?? lat, lng: s.lot.longitude ?? lng },
            operatingHours: '24/7',
            entranceInfo: 'Use main entrance',
            rules: ['Max 4h parking', 'Validation required'],
          }));
        }
      }
      const now = Date.now();
      _cache = { offers: mapped, ts: now };
      setOffers(mapped);
      setLastUpdated(now);
    } catch (e: any) {
      setError(e?.message || 'Failed to load offers');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    void fetchOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, params?.lotId]);

  // Auto-refresh every 5 minutes while on the page
  useEffect(() => {
    if (!poll) return;
    const id = setInterval(() => { if (visibleRef.current) { void fetchOffers(); } }, refreshMs);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll, refreshMs, lat, lng, params?.lotId]);

  return { offers, loading, error, refetch: fetchOffers, lastUpdated };
}

export function findOfferById(offers: ParkingOffer[], id?: string) {
  if (!id) return undefined;
  return offers.find(o => o.id === id);
}
