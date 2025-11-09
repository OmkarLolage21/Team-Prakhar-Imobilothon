import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockOffers } from "@/lib/mockData";
import { Navigation, Clock, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const EnRoute = () => {
  const navigate = useNavigate();
  const [showSwapBanner, setShowSwapBanner] = useState(false);
  const offer = mockOffers[0];

  const handleAcceptSwap = () => {
    setShowSwapBanner(false);
  };

  const simulateSwap = () => {
    setShowSwapBanner(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Map Placeholder */}
      <div className="h-96 bg-gradient-to-br from-primary/20 to-accent/20 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Navigation className="w-16 h-16 text-primary mx-auto mb-4" />
            <p className="text-xl font-semibold">Navigation Active</p>
            <p className="text-sm text-muted-foreground mt-1">
              Follow the route to your parking
            </p>
          </div>
        </div>

        {/* ETA Chip */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2">
          <Card className="px-4 py-2 shadow-elevated">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold">ETA: 8 minutes</span>
            </div>
          </Card>
        </div>

        {/* Demo Button */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
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
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{offer.name}</h2>
              <p className="text-sm text-muted-foreground">{offer.address}</p>
            </div>
            <Badge className="bg-gradient-primary">Smart Hold</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Your Booking</span>
              <span className="text-sm text-muted-foreground">#BK12345</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Expected Arrival</span>
              <span className="text-sm font-semibold">2:08 PM</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Rate</span>
              <span className="text-sm font-semibold">₹150/hour</span>
            </div>
          </div>
        </Card>

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
          onClick={() => navigate("/validation")}
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
