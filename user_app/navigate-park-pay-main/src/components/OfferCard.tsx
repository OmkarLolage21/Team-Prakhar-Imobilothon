import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { ParkingOffer } from "@/types/parking";
import { MapPin, Zap, Accessibility, Shield, TrendingUp } from "lucide-react";
import { formatINR } from "@/lib/api";

interface OfferCardProps {
  offer: ParkingOffer;
  onClick: () => void;
}

export const OfferCard = ({ offer, onClick }: OfferCardProps) => {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{offer.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3 h-3" />
              <span>{offer.distance} km away</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {formatINR(offer.price)}
            </div>
            <div className="text-xs text-muted-foreground">per hour</div>
          </div>
        </div>

        {/* Confidence Meter */}
        <ConfidenceMeter
          percentage={offer.availability.percentage}
          confidence={offer.availability.confidence}
          trend={offer.availability.trend}
          size="md"
        />

        {/* Features & Badges */}
        <div className="flex flex-wrap gap-2">
          {offer.features.ev && (
            <Badge variant="secondary" className="gap-1">
              <Zap className="w-3 h-3" />
              EV
            </Badge>
          )}
          {offer.features.accessible && (
            <Badge variant="secondary" className="gap-1">
              <Accessibility className="w-3 h-3" />
              Accessible
            </Badge>
          )}
          {offer.sla.hasBackup && (
            <Badge className="gap-1 bg-gradient-primary">
              <Shield className="w-3 h-3" />
              Smart Hold
            </Badge>
          )}
          {offer.sla.guaranteedSpot && (
            <Badge className="gap-1 bg-success">
              <Shield className="w-3 h-3" />
              Guaranteed
            </Badge>
          )}
        </div>

        {/* Nudge */}
        {offer.nudge && (
          <div className="p-2 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-warning" />
              <span className="text-warning font-medium">
                Arrive {offer.nudge.timeAdjustment > 0 ? "+" : ""}
                {offer.nudge.timeAdjustment}m → +{offer.nudge.successIncrease}% success,
                −{formatINR(offer.nudge.priceReduction)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
