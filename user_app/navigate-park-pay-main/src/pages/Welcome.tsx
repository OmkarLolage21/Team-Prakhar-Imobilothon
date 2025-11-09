import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MapPin, Zap, Shield } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-sm">
          <MapPin className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4">
          ParkSmart
        </h1>
        
        <p className="text-xl text-white/90 mb-12 max-w-md">
          Find, book, and secure your parking spot with predictive confidence
        </p>

        {/* Features */}
        <div className="space-y-4 mb-12 w-full max-w-md">
          <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-white">Predictive Availability</h3>
              <p className="text-sm text-white/80">Real-time confidence metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-white">Smart Hold with Backup</h3>
              <p className="text-sm text-white/80">Automatic swap if needed</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-white">Smart Pricing</h3>
              <p className="text-sm text-white/80">Demand-based nudges</p>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => navigate("/home")}
          className="w-full max-w-md bg-white text-primary hover:bg-white/90 font-semibold text-lg h-14 rounded-2xl shadow-elevated"
        >
          Get Started
        </Button>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-sm text-white/60">
          Demo mode - All data is simulated for hackathon showcase
        </p>
      </div>
    </div>
  );
};

export default Welcome;
