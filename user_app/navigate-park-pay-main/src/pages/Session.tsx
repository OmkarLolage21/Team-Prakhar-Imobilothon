import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, IndianRupee, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Session = () => {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(0);
  const [showGracePeriod, setShowGracePeriod] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
      
      // Simulate grace period warning at 3 minutes for demo
      if (duration === 180) {
        setShowGracePeriod(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentCost = Math.floor((duration / 3600) * 150);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-primary text-white px-6 pt-12 pb-8">
        <div className="text-center">
          <Badge className="bg-white/20 text-white mb-4">Session Active</Badge>
          <h1 className="text-4xl font-bold mb-2">{formatTime(duration)}</h1>
          <p className="text-white/80">Parking duration</p>
        </div>
      </div>

      {/* Grace Period Warning */}
      {showGracePeriod && (
        <div className="px-4 py-4 animate-in slide-in-from-top">
          <Alert className="border-warning bg-warning/10">
            <AlertCircle className="h-5 w-5 text-warning" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-warning">
                Approaching Time Limit
              </p>
              <p className="text-sm text-foreground mt-1">
                Grace period: 10 minutes remaining. Extend or exit to avoid overstay fees.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="px-4 py-6 space-y-4">
        {/* Location Info */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">Central Plaza Garage</h2>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>Bay: Level 2, Row A, Spot 15</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Cost</p>
                  <p className="text-2xl font-bold text-primary">₹{currentCost}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="font-semibold">₹150/hr</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Session Controls */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Session Controls</h3>
          <div className="space-y-3">
            <Button className="w-full" variant="outline">
              <Clock className="w-4 h-4 mr-2" />
              Extend Session
            </Button>
            <Button className="w-full" variant="outline">
              View Parking Rules
            </Button>
          </div>
        </Card>

        {/* Cost Estimator */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Cost Estimator</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+30 minutes</span>
              <span className="font-medium">₹{currentCost + 75}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+1 hour</span>
              <span className="font-medium">₹{currentCost + 150}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+2 hours</span>
              <span className="font-medium">₹{currentCost + 300}</span>
            </div>
          </div>
        </Card>

        {/* Policy Reminder */}
        <Card className="p-4 bg-muted">
          <p className="text-sm text-muted-foreground">
            <strong>Reminder:</strong> Maximum 4 hours parking. Grace period: 10 minutes
            after time limit. Overstay fee: ₹500/hour.
          </p>
        </Card>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
        <Button
          onClick={() => navigate("/receipt")}
          className="w-full h-14 text-base font-semibold"
          variant="destructive"
        >
          End Session & Exit
        </Button>
      </div>
    </div>
  );
};

export default Session;
