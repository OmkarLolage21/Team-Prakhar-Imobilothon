// API client for backend integration
// Uses Vite env var VITE_API_URL for base URL
const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export interface BackendOffer {
  slot_id: string;
  cluster_id: string;
  distance_m: number;
  eta_minute: string;
  p_free: number;
  price: number;
  mode_options: string[];
  ev: boolean;
  accessible: boolean;
}

export interface BackendBookingResponse {
  booking_id: string;
  slot_id: string;
  eta_minute: string;
  mode: string;
  status: string;
  p_free_at_hold?: number | null;
  backups: { slot_id: string; confidence?: number | null }[];
}

export interface BackendSessionResponse {
  session_id: string;
  booking_id?: string;
  started_at?: string;
  ended_at?: string;
  validation_method?: string;
  bay_label?: string;
  grace_ends_at?: string;
  lot_name?: string;
  lot_id?: string;
  lot_lat?: number;
  lot_lng?: number;
  slot_id?: string;
  dynamic_price?: number;
  payment_status?: string;
  amount_authorized?: number;
  amount_captured?: number;
  duration_minutes?: number;
  cost_estimated?: number;
}

// Bookings recent for dashboard
// Matches backend BookingLedgerItem shape from /bookings/recent
export interface RecentBookingItem {
  id: string;
  customer?: string | null;
  email?: string | null;
  lot?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  duration?: string | null;
  amount?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  slot_id?: string | null; // optional convenience
}
export async function getRecentBookings(limit = 25): Promise<RecentBookingItem[]> {
  const u = new URL(url('/bookings/recent'));
  u.searchParams.set('limit', String(limit));
  return handle(await fetch(u.toString()));
}

export function parseAmountToNumber(a?: string | null): number | null {
  if (!a) return null;
  // strip currency symbols and commas
  const cleaned = a.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Inventory lots (for dropdown)
export interface LotItem { id: string; name: string; latitude?: number; longitude?: number; capacity: number; occupancy: number; amenities: string[]; }

export async function getLots(): Promise<LotItem[]> {
  return handle(await fetch(url('/inventory/lots')));
}

export interface LotDetail { id: string; name: string; location?: string; capacity: number; occupancy: number; amenities: string[]; slots: Array<{ slot_id: string; is_ev: boolean; is_accessible: boolean; occupied: boolean; dynamic_price: number }>; }

export async function getLotDetail(locationId: string): Promise<LotDetail> {
  return handle(await fetch(url(`/inventory/lots/${locationId}`)));
}

function url(p: string) { return `${BASE_URL}${p}`; }

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function searchOffers(lat: number, lng: number, etaIso: string): Promise<BackendOffer[]> {
  const u = new URL(url('/offers/search'));
  u.searchParams.set('lat', String(lat));
  u.searchParams.set('lng', String(lng));
  u.searchParams.set('eta', etaIso);
  return handle<BackendOffer[]>(await fetch(u.toString()));
}

export async function createBooking(
  slot_id: string,
  etaIso: string,
  mode: 'guaranteed' | 'smart_hold',
  add_on_ids?: string[],
): Promise<BackendBookingResponse> {
  return handle(await fetch(url('/bookings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id, eta: etaIso, mode, add_on_ids: add_on_ids ?? [] })
  }));
}

export async function getBooking(booking_id: string): Promise<BackendBookingResponse> {
  return handle(await fetch(url(`/bookings/${booking_id}`)));
}

export async function startSession(booking_id: string, validation_method?: string): Promise<BackendSessionResponse> {
  return handle(await fetch(url('/sessions/start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id, validation_method })
  }));
}

export async function validateSession(session_id: string, validation_method: string, bay_label?: string): Promise<BackendSessionResponse> {
  return handle(await fetch(url(`/sessions/${session_id}/validate`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ validation_method, bay_label })
  }));
}

export async function endSession(session_id: string): Promise<BackendSessionResponse> {
  return handle(await fetch(url(`/sessions/${session_id}/end`), { method: 'POST' }));
}

export async function extendSession(session_id: string, minutes: number): Promise<BackendSessionResponse> {
  return handle(await fetch(url(`/sessions/${session_id}/extend`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes })
  }));
}

export async function getLiveSessions(limit = 100, recentHours = 0): Promise<BackendSessionResponse[]> {
  const u = new URL(url('/sessions/live'));
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('recent_hours', String(recentHours));
  return handle(await fetch(u.toString()));
}

// Profile & Vehicles
export interface Profile { user_id: string; name: string; email: string; phone?: string }
export async function getProfile(): Promise<Profile> { return handle(await fetch(url('/profile/'))); }
export async function updateProfile(partial: Partial<Profile>): Promise<Profile> {
  return handle(await fetch(url('/profile/'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(partial) }));
}

export interface Vehicle { id: string; plate: string; make: string; model: string; type: string; isEV: boolean; needsAccessibility: boolean }
export async function getVehicles(): Promise<Vehicle[]> { return handle(await fetch(url('/vehicles/'))); }
export async function addVehicle(v: Omit<Vehicle, 'id'>): Promise<Vehicle> {
  return handle(await fetch(url('/vehicles/'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) }));
}
export async function deleteVehicle(id: string): Promise<{ ok: boolean }> {
  return handle(await fetch(url(`/vehicles/${id}`), { method: 'DELETE' }));
}

// Unified pricing source: choose captured -> authorized -> estimated -> dynamic fallback
export function resolveSessionCharge(s: BackendSessionResponse): number | null {
  if (typeof s.amount_captured === 'number') return s.amount_captured;
  if (typeof s.amount_authorized === 'number' && s.ended_at) return s.amount_authorized; // ended but not captured yet
  if (typeof s.cost_estimated === 'number') return s.cost_estimated;
  if (typeof s.dynamic_price === 'number') return s.dynamic_price;
  return null;
}

export function formatINR(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '₹--';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// Add-ons marketplace & EV pairing
export interface AddOn { id: string; code: string; name: string; description?: string; price_inr: number; category: string; recommended: boolean }
export async function getAddOns(): Promise<AddOn[]> { return handle(await fetch(url('/services/addons'))); }

export interface EVPairingRequest { booking_slot_id: string; desired_kwh?: number; eta: string }
export interface EVPairingResponse { slot_id: string; charger_id: string; est_kwh: number; est_time_min: number; confidence: number }
export async function requestEVPairing(req: EVPairingRequest): Promise<EVPairingResponse> {
  return handle(await fetch(url('/services/ev_pair'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }));
}

// Indoor navigation (last 200m)
export interface NavNode { id: string; lat: number; lng: number; level?: string }
export interface NavStep { instruction: string; distance_m: number; level?: string }
export interface NavPath { origin: NavNode; destination: NavNode; nodes: NavNode[]; steps: NavStep[] }
export async function getIndoorPath(origin_lat: number, origin_lng: number, slot_id: string, entrance_lat?: number, entrance_lng?: number): Promise<NavPath> {
  const u = new URL(url('/navigation/path'));
  u.searchParams.set('origin_lat', String(origin_lat));
  u.searchParams.set('origin_lng', String(origin_lng));
  u.searchParams.set('slot_id', slot_id);
  if (entrance_lat != null) u.searchParams.set('entrance_lat', String(entrance_lat));
  if (entrance_lng != null) u.searchParams.set('entrance_lng', String(entrance_lng));
  return handle(await fetch(u.toString()));
}

export interface LocateRequest { session_id: string; current_lat: number; current_lng: number; bay_label?: string }
export async function locateMyCar(req: LocateRequest): Promise<NavPath> {
  return handle(await fetch(url('/navigation/locate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }));
}

// Carbon scoring
export interface CarbonSession { session_id: string; grams_co2: number; efficiency_score: number; recommendations: string[] }
export interface CarbonDashboard { total_sessions: number; total_co2_grams: number; avg_per_session: number; top_reducer_tip?: string }
export async function getCarbonForSession(session_id: string): Promise<CarbonSession> { return handle(await fetch(url(`/carbon/session/${session_id}`))); }
export async function getCarbonDashboard(): Promise<CarbonDashboard> { return handle(await fetch(url('/carbon/dashboard'))); }

// Violations (overstay/misuse) – stub endpoints
export interface ViolationEvent { id: string; session_id: string; kind: string; severity: string; detected_at: string; recommended_action?: string }
export async function getActiveViolations(): Promise<ViolationEvent[]> { return handle(await fetch(url('/violations/active'))); }
export interface ViolationStats { active: number; today: number; overstay: number; misuse: number }
export async function getViolationStats(): Promise<ViolationStats> { return handle(await fetch(url('/violations/stats'))); }
