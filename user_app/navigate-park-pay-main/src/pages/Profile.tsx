import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { useVehicles } from "@/hooks/useVehicles";
import { ArrowLeft, Plus, Car, Zap, Settings, History, CreditCard } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { vehicles, add, remove } = useVehicles();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ plate: "", make: "", model: "", isEV: false, needsAccessibility: false });

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
              {(profile?.name || 'Demo User').split(' ').map(s => s[0]).slice(0,2).join('')}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.name ?? 'Demo User'}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email ?? 'demo.user@example.com'}</p>
            </div>
          </div>
        </Card>

        {/* Vehicles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">My Vehicles</h3>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(s => !s)}>
              <Plus className="w-4 h-4 mr-2" />
              {showAdd ? 'Cancel' : 'Add Vehicle'}
            </Button>
          </div>

          {showAdd && (
            <Card className="p-4 mb-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="border rounded px-3 py-2 text-sm" placeholder="Plate" value={form.plate} onChange={e=>setForm({...form, plate:e.target.value})} />
                <input className="border rounded px-3 py-2 text-sm" placeholder="Make" value={form.make} onChange={e=>setForm({...form, make:e.target.value})} />
                <input className="border rounded px-3 py-2 text-sm" placeholder="Model" value={form.model} onChange={e=>setForm({...form, model:e.target.value})} />
                <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.isEV} onChange={e=>setForm({...form, isEV:e.target.checked})} /> EV</label>
                <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.needsAccessibility} onChange={e=>setForm({...form, needsAccessibility:e.target.checked})} /> Accessible</label>
              </div>
              <div className="text-right mt-3">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!form.plate || !form.make || !form.model) return;
                    // Backend expects a 'type' field; derive from EV checkbox
                    await add({ ...form, type: form.isEV ? 'ev_car' : 'car' });
                    setShowAdd(false);
                    setForm({ plate: '', make: '', model: '', isEV: false, needsAccessibility: false });
                  }}
                >
                  Save
                </Button>
              </div>
            </Card>
          )}

          {vehicles.map(v => (
            <Card key={v.id} className="p-4 mb-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{v.make} {v.model}</p>
                    {v.isEV && (
                      <Badge variant="secondary" className="gap-1">
                        <Zap className="w-3 h-3" />
                        EV
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{v.plate}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={()=>remove(v.id)}>Remove</Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-semibold mb-4">Quick Links</h3>
          <div className="space-y-2">
            <Card
              className="p-4 cursor-pointer hover:shadow-card transition-all"
              onClick={() => navigate('/history')}
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <span className="font-medium">Parking History</span>
              </div>
            </Card>

            <Card
              className="p-4 cursor-pointer hover:shadow-card transition-all"
              onClick={() => navigate('/payments')}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="font-medium">Payment Methods</span>
              </div>
            </Card>

            <Card
              className="p-4 cursor-pointer hover:shadow-card transition-all"
              onClick={() => navigate('/preferences')}
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
