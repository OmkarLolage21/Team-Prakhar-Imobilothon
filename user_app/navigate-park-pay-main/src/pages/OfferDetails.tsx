import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { useOffers } from "@/hooks/useOffers";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Info,
  Zap,
  Accessibility,
  Shield,
  Building,
} from "lucide-react";
import { formatINR } from "@/lib/api";

const OfferDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  // No need to poll here; we only render details based on cached offers
  const { offers } = useOffers({ poll: false });
  const offer = offers.find((o) => o.id === id);

  if (!offer) {
  return <div className="p-6">Offer not found</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/offers")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Parking Details</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Main Info */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{offer.name}</h2>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{offer.address}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {offer.distance} km away
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {formatINR(offer.price)}
                </div>
                <div className="text-sm text-muted-foreground">per hour</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Predicted Availability</span>
                <Badge variant="outline" className="gap-1">
                  <Info className="w-3 h-3" />
                  Based on patterns
                </Badge>
              </div>
              <ConfidenceMeter
                percentage={offer.availability.percentage}
                confidence={offer.availability.confidence}
                trend={offer.availability.trend}
                size="lg"
                showLabel={false}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Confidence based on time/day trends and live signals
              </p>
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Features</h3>
          <div className="flex flex-wrap gap-2">
            {offer.features.ev && (
              <Badge variant="secondary" className="gap-2 px-3 py-2">
                <Zap className="w-4 h-4" />
                EV Charging
              </Badge>
            )}
            {offer.features.accessible && (
              <Badge variant="secondary" className="gap-2 px-3 py-2">
                <Accessibility className="w-4 h-4" />
                Accessible
              </Badge>
            )}
            {offer.features.covered && (
              <Badge variant="secondary" className="gap-2 px-3 py-2">
                <Building className="w-4 h-4" />
                Covered
              </Badge>
            )}
            {offer.features.security && (
              <Badge variant="secondary" className="gap-2 px-3 py-2">
                <Shield className="w-4 h-4" />
                24/7 Security
              </Badge>
            )}
          </div>
        </Card>

        {/* Operating Hours */}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Operating Hours</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {offer.operatingHours}
              </p>
            </div>
          </div>
        </Card>

        {/* Entrance Info */}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Entrance Information</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {offer.entranceInfo}
              </p>
            </div>
          </div>
        </Card>

        {/* Rules */}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Rules & Policies</h3>
              <ul className="space-y-1">
                {offer.rules.map((rule, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    • {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 space-y-3">
            {offer.sla.guaranteedSpot && (
          <Button
            onClick={() => navigate(`/booking/${offer.id}/guaranteed`)}
            className="w-full h-14 text-base font-semibold bg-success hover:bg-success/90"
          >
            Book Guaranteed Spot
          </Button>
        )}
        {offer.sla.hasBackup && (
          <Button
            onClick={() => navigate(`/booking/${offer.id}/smart-hold`)}
            className="w-full h-14 text-base font-semibold"
          >
            <Shield className="w-5 h-5 mr-2" />
            Book Smart Hold (with Backup)
          </Button>
        )}
      </div>
    </div>
  );
};

export default OfferDetails;
