import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Clock,
  SlidersHorizontal,
  Zap,
  Accessibility,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Home = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    ev: false,
    accessible: false,
    maxPrice: "",
  });

  const handleSearch = () => {
    if (destination) {
      navigate("/offers");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <div className="bg-gradient-primary text-white px-6 pt-12 pb-8">
        <h1 className="text-2xl font-bold mb-2">Find Parking</h1>
        <p className="text-white/80">Where would you like to park?</p>
      </div>

      {/* Search Section */}
      <div className="px-6 -mt-6">
        <Card className="p-4 shadow-elevated">
          <div className="space-y-4">
            {/* Destination Input */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Enter destination..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Arrival Time */}
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="time"
                defaultValue="14:00"
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </span>
              {(filters.ev || filters.accessible || filters.maxPrice) && (
                <Badge variant="default" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>

            {/* Filters Panel */}
            {showFilters && (
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ev-filter" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    EV Charging
                  </Label>
                  <Switch
                    id="ev-filter"
                    checked={filters.ev}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, ev: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="accessible-filter"
                    className="flex items-center gap-2"
                  >
                    <Accessibility className="w-4 h-4" />
                    Accessibility
                  </Label>
                  <Switch
                    id="accessible-filter"
                    checked={filters.accessible}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, accessible: checked })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="max-price">Max Price (₹/hour)</Label>
                  <Input
                    id="max-price"
                    type="number"
                    placeholder="No limit"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: e.target.value })
                    }
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={!destination}
              className="w-full h-12 text-base font-semibold"
            >
              <Search className="w-5 h-5 mr-2" />
              Search Parking
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-6 mt-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card
            className="p-4 cursor-pointer hover:shadow-card transition-all"
            onClick={() => navigate("/profile")}
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium">My Vehicles</p>
            </div>
          </Card>

          <Card
            className="p-4 cursor-pointer hover:shadow-card transition-all"
            onClick={() => navigate("/booking")}
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium">View Booking</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
