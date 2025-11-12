import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockVehicles } from "@/lib/mockData";
import { useOffers } from "@/hooks/useOffers";
import { createBooking, formatINR, getAddOns, type AddOn, requestEVPairing } from "@/lib/api";
import { ArrowLeft, Shield, CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useVehicles } from "@/hooks/useVehicles";

const Booking = () => {
  const navigate = useNavigate();
  const { id, type } = useParams();
  // Disable polling here to avoid extra network after confirmation; we only need cached offers for details
  const { offers } = useOffers({ poll: false });
  const { vehicles, activeVehicle, setActiveVehicleId } = useVehicles();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [evPairingStatus, setEvPairingStatus] = useState<'idle'|'pending'|'done'|'error'>('idle');
  const [evPairingInfo, setEvPairingInfo] = useState<{charger_id:string; est_kwh:number; est_time_min:number; confidence:number}|null>(null);
  const offer = offers.find((o) => o.id === id);
  const vehicle = mockVehicles[0]; // legacy placeholder
  const isEVSelected = !!activeVehicle?.isEV;
  const evCompatible = !!offer?.features?.ev;

  if (!offer) return <div>Offer not found</div>;

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  useEffect(()=>{
    (async ()=>{
      try { const list = await getAddOns(); setAddons(list); } catch(e){ /* silent */ }
    })();
  }, []);

  const handleConfirm = async () => {
    if (!id) return;
    try {
      setIsProcessing(true);
      const eta = new Date(Date.now() + 30 * 60000).toISOString();
      const mode = type === 'smart-hold' ? 'smart_hold' : 'guaranteed';
      const res = await createBooking(id, eta, mode as 'guaranteed' | 'smart_hold', selectedAddOnIds);
      setIsComplete(true);
      toast.success("Booking confirmed!");
      // If EV vehicle, attempt pairing
      if (isEVSelected) {
        setEvPairingStatus('pending');
        try {
          const pairing = await requestEVPairing({ booking_slot_id: id, eta: eta });
          setEvPairingInfo(pairing);
          setEvPairingStatus('done');
          try {
            // Persist pairing to localStorage for EnRoute retrieval
            const key = `ev_pairing_${res.booking_id}`;
            localStorage.setItem(key, JSON.stringify(pairing));
          } catch {}
        } catch(err:any){
          setEvPairingStatus('error');
        }
      }
      // Navigate to EnRoute with booking id
      setTimeout(() => {
        navigate(`/en-route?booking_id=${res.booking_id}`);
      }, 1000);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create booking');
    } finally {
      setIsProcessing(false);
    }
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
        {/* Vehicle selection */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Select Vehicle</h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {vehicles.map(v => (
              <button
                key={v.id}
                onClick={()=>setActiveVehicleId(v.id)}
                className={`min-w-[180px] text-left border rounded-lg px-4 py-3 ${activeVehicle?.id===v.id ? 'border-primary ring-1 ring-primary/50' : 'border-muted'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{v.make} {v.model}</div>
                  {v.isEV && <Badge variant="secondary">EV</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{v.plate}</div>
              </button>
            ))}
          </div>
          {isEVSelected && (
            <div className="mt-3 text-xs text-primary">EV settings applied — showing EV-compatible spots and pricing.</div>
          )}
        </Card>

        {/* Compatibility notice */}
        {isEVSelected && !evCompatible && (
          <Card className="p-4 border-destructive bg-destructive/5">
            <p className="text-sm text-destructive">This location isn’t marked EV-compatible. Choose another offer or a non‑EV vehicle.</p>
          </Card>
        )}

        {/* Price Breakdown */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Price Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Base Rate</span>
              <span className="text-sm font-medium">{formatINR(offer.price)}/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pre-authorization</span>
              <span className="text-sm font-medium">{formatINR(offer.price * 2)}</span>
            </div>
            {selectedAddOnIds.length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Add‑ons Subtotal</span>
                <span className="text-sm font-medium">₹{selectedAddOnIds.reduce((sum, id)=> sum + (addons.find(a=>a.id===id)?.price_inr||0), 0)}</span>
              </div>
            )}
            {isSmartHold && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Backup SLA</span>
                <Badge variant="outline" className="text-xs">Free</Badge>
              </div>
            )}
            <div className="pt-2 border-t flex justify-between">
              <span className="font-semibold">Pre-auth Total</span>
              <span className="font-bold text-primary">
                {formatINR((offer.price * 2) + selectedAddOnIds.reduce((sum, id)=> sum + (addons.find(a=>a.id===id)?.price_inr||0), 0))}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            You'll only be charged for actual usage. Unused amount will be released.
          </p>
        </Card>

        {/* Add-Ons */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Enhance Your Stay</h3>
          {addons.length === 0 && <p className="text-xs text-muted-foreground">Loading add-ons...</p>}
          <div className="grid gap-3">
            {addons.map(a => {
              const active = selectedAddOnIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={()=>toggleAddOn(a.id)}
                  className={`text-left border rounded-lg px-4 py-3 flex items-start gap-3 ${active ? 'border-primary bg-primary/5' : 'border-muted'}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.name}</span>
                      {a.recommended && <Badge variant="secondary" className="text-[10px]">Rec</Badge>}
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">{a.description}</p>
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">₹{a.price_inr}</div>
                </button>
              );
            })}
          </div>
          {selectedAddOnIds.length > 0 && <p className="text-xs mt-3">Selected: {selectedAddOnIds.length}</p>}
        </Card>

        {/* EV Pairing Status */}
        {isEVSelected && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">EV Charger Pairing</h3>
            {evPairingStatus === 'idle' && <p className="text-xs text-muted-foreground">Will attempt to pair charger after confirmation.</p>}
            {evPairingStatus === 'pending' && <p className="text-xs flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Finding optimal charger...</p>}
            {evPairingStatus === 'error' && <p className="text-xs text-destructive">Failed to pair charger.</p>}
            {evPairingStatus === 'done' && evPairingInfo && (
              <div className="text-xs">
                <p className="mb-1">Assigned: <span className="font-medium">{evPairingInfo.charger_id}</span></p>
                <p>Est. {evPairingInfo.est_kwh} kWh in ~{evPairingInfo.est_time_min}m (confidence {Math.round(evPairingInfo.confidence*100)}%)</p>
              </div>
            )}
          </Card>
        )}

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
          disabled={isProcessing || isComplete || (isEVSelected && !evCompatible)}
          className="w-full h-14 text-base font-semibold"
        >
          {isProcessing && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {isComplete && <CheckCircle2 className="w-5 h-5 mr-2" />}
          {isProcessing
            ? "Processing..."
            : isComplete
            ? "Confirmed!"
            : `Confirm & Pay ${formatINR(offer.price * 2)}`}
        </Button>
      </div>
    </div>
  );
};

export default Booking;
