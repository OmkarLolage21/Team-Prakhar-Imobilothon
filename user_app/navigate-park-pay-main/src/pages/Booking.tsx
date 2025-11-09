import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockOffers, mockVehicles } from "@/lib/mockData";
import { ArrowLeft, Shield, CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Booking = () => {
  const navigate = useNavigate();
  const { id, type } = useParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const offer = mockOffers.find((o) => o.id === id);
  const vehicle = mockVehicles[0];

  if (!offer) return <div>Offer not found</div>;

  const handleConfirm = () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
      toast.success("Booking confirmed!");
      
      setTimeout(() => {
        navigate("/en-route");
      }, 2000);
    }, 2000);
  };

  const isSmartHold = type === "smart-hold";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/offer/${id}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Confirm Booking</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Booking Type */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {isSmartHold ? (
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">
                {isSmartHold ? "Smart Hold Booking" : "Guaranteed Spot"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSmartHold
                  ? "With automatic backup swap"
                  : "100% spot availability"}
              </p>
            </div>
          </div>

          {isSmartHold && (
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <p className="text-sm">
                <strong>How it works:</strong> We'll reserve a backup spot nearby. If
                confidence drops, we'll automatically switch you to the backup while
                preserving your price and arrival time.
              </p>
            </div>
          )}
        </Card>

        {/* Parking Details */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Parking Location</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Location</span>
              <span className="text-sm font-medium">{offer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Address</span>
              <span className="text-sm font-medium text-right max-w-[200px]">
                {offer.address}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Distance</span>
              <span className="text-sm font-medium">{offer.distance} km</span>
            </div>
          </div>
        </Card>

        {/* Vehicle */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Vehicle</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{vehicle.make} {vehicle.model}</p>
              <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
            </div>
            <div className="flex gap-2">
              {vehicle.isEV && <Badge variant="secondary">EV</Badge>}
            </div>
          </div>
        </Card>

        {/* Price Breakdown */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Price Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Base Rate</span>
              <span className="text-sm font-medium">{offer.currency}{offer.price}/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pre-authorization</span>
              <span className="text-sm font-medium">{offer.currency}{offer.price * 2}</span>
            </div>
            {isSmartHold && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Backup SLA</span>
                <Badge variant="outline" className="text-xs">Free</Badge>
              </div>
            )}
            <div className="pt-2 border-t flex justify-between">
              <span className="font-semibold">Pre-auth Total</span>
              <span className="font-bold text-primary">
                {offer.currency}{offer.price * 2}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            You'll only be charged for actual usage. Unused amount will be released.
          </p>
        </Card>

        {/* Payment Method */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Payment Method</h3>
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <CreditCard className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <p className="font-medium">•••• 1234</p>
              <p className="text-xs text-muted-foreground">Expires 12/25</p>
            </div>
            <Button variant="ghost" size="sm">Change</Button>
          </div>
        </Card>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
        <Button
          onClick={handleConfirm}
          disabled={isProcessing || isComplete}
          className="w-full h-14 text-base font-semibold"
        >
          {isProcessing && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {isComplete && <CheckCircle2 className="w-5 h-5 mr-2" />}
          {isProcessing
            ? "Processing..."
            : isComplete
            ? "Confirmed!"
            : `Confirm & Pay ${offer.currency}${offer.price * 2}`}
        </Button>
      </div>
    </div>
  );
};

export default Booking;
