import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockVehicles } from "@/lib/mockData";
import { ArrowLeft, Plus, Car, Zap, Settings, History, CreditCard } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const vehicle = mockVehicles[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Profile & Settings</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* User Info */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
              JD
            </div>
            <div>
              <h2 className="text-xl font-bold">John Doe</h2>
              <p className="text-sm text-muted-foreground">john.doe@email.com</p>
            </div>
          </div>
        </Card>

        {/* Vehicles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">My Vehicles</h3>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </div>

          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{vehicle.make} {vehicle.model}</p>
                  {vehicle.isEV && (
                    <Badge variant="secondary" className="gap-1">
                      <Zap className="w-3 h-3" />
                      EV
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
              </div>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-semibold mb-4">Quick Links</h3>
          <div className="space-y-2">
            <Card
              className="p-4 cursor-pointer hover:shadow-card transition-all"
              onClick={() => {}}
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <span className="font-medium">Parking History</span>
              </div>
            </Card>

            <Card
              className="p-4 cursor-pointer hover:shadow-card transition-all"
              onClick={() => {}}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="font-medium">Payment Methods</span>
              </div>
            </Card>

            <Card
              className="p-4 cursor-pointer hover:shadow-card transition-all"
              onClick={() => {}}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-primary" />
                <span className="font-medium">Preferences</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Stats */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Your Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">24</p>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">₹3,450</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">96%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
