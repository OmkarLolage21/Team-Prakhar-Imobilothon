import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Smartphone, Car, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Validation = () => {
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(false);
  const [plateNumber, setPlateNumber] = useState("");

  const handleValidate = (method: string) => {
    setIsValidating(true);
    toast.loading("Validating...");
    
    setTimeout(() => {
      setIsValidating(false);
      toast.dismiss();
      toast.success("Validation successful! Bay: L2-A15");
      
      setTimeout(() => {
        navigate("/session");
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white px-6 pt-12 pb-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Validate Arrival</h1>
          <p className="text-white/80">Choose your validation method</p>
        </div>
      </div>

      <div className="px-4 -mt-6">
        <Card className="p-6 shadow-elevated">
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qr">
                <QrCode className="w-4 h-4 mr-2" />
                QR
              </TabsTrigger>
              <TabsTrigger value="nfc">
                <Smartphone className="w-4 h-4 mr-2" />
                NFC
              </TabsTrigger>
              <TabsTrigger value="plate">
                <Car className="w-4 h-4 mr-2" />
                Plate
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-6">
              <div className="space-y-6">
                <div className="aspect-square bg-muted rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-background rounded-xl mx-auto mb-4 flex items-center justify-center">
                      <QrCode className="w-32 h-32 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Scan the QR code at the entrance
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleValidate("qr")}
                  disabled={isValidating}
                  className="w-full h-12"
                >
                  {isValidating ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="w-5 h-5 mr-2" />
                  )}
                  {isValidating ? "Validating..." : "Scan QR Code"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="nfc" className="mt-6">
              <div className="space-y-6">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-card rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                      <Smartphone className="w-16 h-16 text-primary" />
                    </div>
                    <p className="text-sm font-medium">
                      Hold your phone near the NFC reader
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Usually located at the entrance barrier
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleValidate("nfc")}
                  disabled={isValidating}
                  className="w-full h-12"
                >
                  {isValidating ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="w-5 h-5 mr-2" />
                  )}
                  {isValidating ? "Validating..." : "Tap NFC"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="plate" className="mt-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="plate">Enter your plate number</Label>
                  <Input
                    id="plate"
                    placeholder="DL 01 AB 1234"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    className="mt-2 h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This is a fallback method if QR/NFC is unavailable
                  </p>
                </div>
                
                <Button
                  onClick={() => handleValidate("plate")}
                  disabled={isValidating || !plateNumber}
                  className="w-full h-12"
                >
                  {isValidating ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                  )}
                  {isValidating ? "Validating..." : "Validate with Plate"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Info Card */}
        <Card className="p-4 mt-4 bg-primary/5 border-primary/20">
          <p className="text-sm">
            <strong>Tip:</strong> QR and NFC are the fastest methods. Keep your
            booking confirmation handy for quick access.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Validation;
