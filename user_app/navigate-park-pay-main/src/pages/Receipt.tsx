import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, Share2, ThumbsUp, ThumbsDown, Clock, MapPin, IndianRupee } from "lucide-react";

const Receipt = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  const handleFeedback = (value: "yes" | "no") => {
    setFeedback(value);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Success Header */}
      <div className="bg-gradient-confidence text-white px-6 pt-12 pb-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Session Complete!</h1>
          <p className="text-white/80">Thank you for using ParkSmart</p>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Receipt Card */}
        <Card className="p-6 shadow-elevated">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
              <h2 className="text-xl font-bold">Receipt</h2>
              <Badge className="bg-success">Paid</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Booking ID</span>
                <span className="text-sm font-medium">#BK12345</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Location</span>
                <span className="text-sm font-medium text-right">
                  Central Plaza Garage
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bay</span>
                <span className="text-sm font-medium">L2-A15</span>
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Duration</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-medium">2:08 PM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-medium">3:23 PM</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="font-medium">Total Duration</span>
                  <span className="font-semibold">1h 15m</span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Rate (1h 15m)</span>
                    <span className="font-medium">₹188</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pre-authorization</span>
                    <span className="font-medium">₹300</span>
                  </div>
                  <div className="flex justify-between text-sm text-success">
                    <span>Refund</span>
                    <span className="font-medium">₹112</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-between items-center">
                <span className="text-lg font-bold">Total Charged</span>
                <span className="text-2xl font-bold text-primary">₹188</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Feedback */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Quick Feedback</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Was the parking spot available when you arrived?
          </p>
          <div className="flex gap-3">
            <Button
              variant={feedback === "yes" ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleFeedback("yes")}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Yes
            </Button>
            <Button
              variant={feedback === "no" ? "destructive" : "outline"}
              className="flex-1"
              onClick={() => handleFeedback("no")}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              No
            </Button>
          </div>
          {feedback && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Thank you for your feedback! It helps us improve.
            </p>
          )}
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
        <Button
          onClick={() => navigate("/home")}
          className="w-full h-14 text-base font-semibold"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default Receipt;
