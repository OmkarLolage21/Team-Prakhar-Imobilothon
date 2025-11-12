import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OfferCard } from "@/components/OfferCard";
import { Map, List, ArrowLeft, RefreshCw } from "lucide-react";
import ParkingMap from "@/components/ParkingMap";
import { useOffers } from "@/hooks/useOffers";
import { useVehicles } from "@/hooks/useVehicles";

const Offers = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const locationId = search.get('lot_id') || undefined;
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedOfferId, setSelectedOfferId] = useState<string | undefined>(undefined);
  const [eta, setEta] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{lat:number; lng:number} | undefined>(undefined);
  const { offers, loading, error, refetch, lastUpdated } = useOffers({ lotId: locationId });
  const { activeVehicle } = useVehicles();
  const filteredOffers = (activeVehicle?.isEV ? offers.filter(o => o.features.ev) : offers);

  // Try to get geolocation for routing (optional)
  useEffect(()=>{
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 4000 }
    );
  },[]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Available Parking</h1>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-5 h-5" />
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("map")}
            >
              <Map className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <div className="px-4 py-4 space-y-2">
          <ParkingMap 
            offers={filteredOffers}
            origin={origin}
            selectedOfferId={selectedOfferId}
            onOfferClick={(id) => { setSelectedOfferId(id); navigate(`/offer/${id}`); }}
            onEtaChange={setEta}
          />
          {!origin && (
            <p className="text-xs text-muted-foreground px-1">Enable location to compute ETA from your current position.</p>
          )}
          {eta && selectedOfferId && origin && (
            <p className="text-xs text-muted-foreground px-1">Route to <strong>{offers.find(o=>o.id===selectedOfferId)?.name || 'selected'}</strong>: {eta}</p>
          )}
        </div>
      )}

      {/* Offers List */}
      <div className="px-4 py-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading offers..." : `${filteredOffers.length} options found${activeVehicle?.isEV ? ' (EV-ready)' : ''}`}
              {lastUpdated ? <span className="ml-2 text-xs">Updated {new Date(lastUpdated).toLocaleTimeString()}</span> : null}
              {error && <span className="text-destructive ml-2">{error}</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm">
                Sort by
              </Button>
            </div>
          </div>

          {filteredOffers.map((offer) => (
            <div key={offer.id} className={selectedOfferId === offer.id ? 'ring-2 ring-primary rounded-lg' : ''}>
              <OfferCard
                offer={offer}
                onClick={() => { setSelectedOfferId(offer.id); navigate(`/offer/${offer.id}`); }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Offers;
