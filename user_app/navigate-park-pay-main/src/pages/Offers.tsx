import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OfferCard } from "@/components/OfferCard";
import { mockOffers } from "@/lib/mockData";
import { Map, List, ArrowLeft } from "lucide-react";
import ParkingMap from "@/components/ParkingMap";

const Offers = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

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
        <div className="px-4 py-4">
          <ParkingMap 
            offers={mockOffers} 
            onOfferClick={(id) => navigate(`/offer/${id}`)} 
          />
        </div>
      )}

      {/* Offers List */}
      <div className="px-4 py-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {mockOffers.length} options found
            </p>
            <Button variant="ghost" size="sm">
              Sort by
            </Button>
          </div>

          {mockOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onClick={() => navigate(`/offer/${offer.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Offers;
