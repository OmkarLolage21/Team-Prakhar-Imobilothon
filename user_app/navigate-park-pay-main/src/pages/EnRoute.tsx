import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOffers } from "@/hooks/useOffers";
import { Navigation, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getBooking, formatINR, getIndoorPath, type NavPath } from "@/lib/api";
import ParkingMap from "@/components/ParkingMap";

const EnRoute = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [showSwapBanner, setShowSwapBanner] = useState(false);
  const { offers } = useOffers();
  const bookingId = search.get('booking_id');
  const [origin, setOrigin] = useState<{lat:number; lng:number} | undefined>(undefined);
  const [eta, setEta] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | undefined>(undefined);
  const [indoorPath, setIndoorPath] = useState<NavPath | null>(null);
  const [gettingIndoor, setGettingIndoor] = useState(false);
  const [pairing, setPairing] = useState<{charger_id:string; est_kwh:number; est_time_min:number; confidence:number}|null>(null);
  const offer = useMemo(() => offers.find(o => o.id === selectedOfferId) || offers[0], [offers, selectedOfferId]);

  // Watch geolocation (live ETA from current location)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
    );
    return () => { try { navigator.geolocation.clearWatch(id); } catch {} };
  }, []);

  // Load booking and map it to an offer id (slot_id)
  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      try {
        const b = await getBooking(bookingId);
        if (b?.slot_id) setSelectedOfferId(b.slot_id);
        // Load saved EV pairing (if any)
        try {
          const raw = localStorage.getItem(`ev_pairing_${bookingId}`);
          if (raw) setPairing(JSON.parse(raw));
        } catch {}
      } catch {
        // ignore
      }
    };
    void load();
  }, [bookingId]);

  const handleAcceptSwap = () => {
    setShowSwapBanner(false);
  };

  const simulateSwap = () => {
    setShowSwapBanner(true);
  };

  const handleGuideToBay = async () => {
    if (!origin || !selectedOfferId) return;
    try {
      setGettingIndoor(true);
      const path = await getIndoorPath(origin.lat, origin.lng, selectedOfferId);
      setIndoorPath(path);
    } catch {
      setIndoorPath(null);
    } finally {
      setGettingIndoor(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Live Map with route */}
      <div className="relative">
        <ParkingMap
          offers={offer ? [offer] : offers}
          origin={origin}
          selectedOfferId={offer?.id}
          onOfferClick={() => {}}
          onEtaChange={setEta}
          indoorPath={indoorPath ? { nodes: indoorPath.nodes.map(n=>({ lat:n.lat, lng:n.lng, level:n.level })) } : null}
        />
        <div className="absolute top-3 right-3">
          <div className="flex gap-2">
            <Button
              onClick={handleGuideToBay}
              variant="default"
              size="sm"
              className="bg-primary text-white"
              disabled={!origin || !selectedOfferId || gettingIndoor}
            >
              {gettingIndoor ? 'Guiding…' : 'Guide to Bay'}
            </Button>
            <Button
              onClick={simulateSwap}
              variant="outline"
              size="sm"
              className="bg-card"
            >
              Simulate Confidence Drop
            </Button>
          </div>
        </div>
      </div>
      {!origin && (
        <div className="px-4 py-2">
          <Card className="p-3 text-sm">Enable location to show live ETA from your position.</Card>
        </div>
      )}

      {/* Swap Banner */}
      {showSwapBanner && (
        <div className="px-4 py-4 animate-in slide-in-from-top">
          <Alert className="border-warning bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertDescription className="ml-2">
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-warning">
                    Confidence Decreased
                  </p>
                  <p className="text-sm text-foreground mt-1">
                    Switching to nearby guaranteed spot. Price and SLA preserved.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Central Plaza</span>
                  <ArrowRight className="w-4 h-4" />
                  <span className="font-medium">Metro Station Parking</span>
                  <Badge className="ml-auto bg-success">+2 min</Badge>
                </div>
                <Button
                  onClick={handleAcceptSwap}
                  className="w-full"
                  size="sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept & Update Route
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Booking Details */}
      <div className="px-4 py-6 space-y-4">
        {indoorPath && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Last 200m Guidance</h3>
            <ol className="list-decimal pl-5 text-sm space-y-1">
              {indoorPath.steps.map((s, i) => (
                <li key={i}>
                  {s.instruction} <span className="text-muted-foreground">({s.distance_m}m{s.level ? `, ${s.level}` : ''})</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
        <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{offer?.name ?? 'Your Parking'}</h2>
              <p className="text-sm text-muted-foreground">{offer?.address ?? 'Address shared in confirmation'}</p>
            </div>
            <Badge className="bg-gradient-primary">Smart Hold</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Your Booking</span>
              <span className="text-sm text-muted-foreground">{bookingId ? `#${bookingId.slice(0,6)}…` : '#BK—'}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Expected Arrival</span>
              <span className="text-sm font-semibold">{eta ?? 'Calculating...'}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Rate</span>
              <span className="text-sm font-semibold">{formatINR(offer?.price ?? 150)}/hour</span>
            </div>
          </div>
        </Card>

        {pairing && (
          <Card className="p-4">
            <h3 className="font-semibold mb-1">EV Charging</h3>
            <p className="text-sm">Assigned charger <span className="font-medium">{pairing.charger_id}</span>. Est. {pairing.est_kwh} kWh in ~{pairing.est_time_min}m (confidence {Math.round(pairing.confidence*100)}%).</p>
          </Card>
        )}

        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm">
            <strong className="text-primary">Backup Active:</strong> We're monitoring
            availability. If needed, we'll switch you to a guaranteed spot automatically.
          </p>
        </Card>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 space-y-3">
        <Button
          onClick={() => navigate(`/validation?booking_id=${bookingId ?? ''}`)}
          className="w-full h-14 text-base font-semibold"
        >
          I've Arrived
        </Button>
        <Button variant="outline" className="w-full">
          Cancel Booking
        </Button>
      </div>
    </div>
  );
};

export default EnRoute;
