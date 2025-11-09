import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, IndianRupee, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { endSession, getLiveSessions, extendSession, resolveSessionCharge, formatINR, getLotDetail, locateMyCar } from "@/lib/api";

const Session = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const sessionId = search.get('session_id');
  const [duration, setDuration] = useState(0);
  const [showGracePeriod, setShowGracePeriod] = useState(false);
  const [cost, setCost] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(150);
  const [ending, setEnding] = useState(false);
  const [extending, setExtending] = useState(false);
  const [lotName, setLotName] = useState<string | null>(null);
  const [bay, setBay] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState<string[]>([]);
  const [pairing, setPairing] = useState<{charger_id:string; est_kwh:number; est_time_min:number; confidence:number}|null>(null);
  const [locating, setLocating] = useState(false);
  const [locatePath, setLocatePath] = useState<{steps:{instruction:string; distance_m:number; level?:string}[]}|null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!sessionId) return;
      const live = await getLiveSessions(200, 6);
      const sess = live.find(s => s.session_id === sessionId);
      if (sess && mounted) {
        // duration_minutes from backend; convert to seconds baseline
        if (sess.duration_minutes != null) setDuration(sess.duration_minutes * 60);
        const charge = resolveSessionCharge(sess);
        if (charge != null) setCost(charge);
        if (sess.dynamic_price != null) setRate(sess.dynamic_price);
        if (sess.grace_ends_at) {
          const graceMs = new Date(sess.grace_ends_at).getTime() - Date.now();
          if (graceMs < 10 * 60 * 1000) setShowGracePeriod(true);
        }
        setLotName(sess.lot_name ?? null);
        setBay(sess.bay_label ?? null);
      }
    }
    void load();
    // Load EV pairing info
    try {
      if (sessionId) {
  const raw = localStorage.getItem(`ev_pairing_${search.get('booking_id') || ''}`) || localStorage.getItem(`ev_pairing_${sessionId}`);
        if (raw) setPairing(JSON.parse(raw));
      }
    } catch {}
    const interval = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, [sessionId]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentCost = cost != null ? Math.round(cost) : Math.floor((duration / 3600) * (rate ?? 150));
  const elapsedMinutes = Math.floor(duration / 60);
  // Original slot period assumed 60 minutes until we have per-slot duration.
  const slotPeriodMin = 60;
  const remaining = slotPeriodMin - elapsedMinutes;
  const canExtend = remaining <= 15;

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
              <h2 className="text-xl font-bold">{lotName ?? 'Parking Lot'}</h2>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>Bay: {bay ?? '—'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Cost</p>
                  <p className="text-2xl font-bold text-primary">{formatINR(currentCost)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="font-semibold">{formatINR(rate ?? 150)}/hr</p>
              </div>
            </div>
          </div>
        </Card>
        {pairing && (
          <Card className="p-4">
            <h3 className="font-semibold mb-1">EV Charging</h3>
            <p className="text-sm">Charger <span className="font-medium">{pairing.charger_id}</span> in progress. Est. {pairing.est_kwh} kWh (~{pairing.est_time_min}m). Confidence {Math.round(pairing.confidence*100)}%.</p>
          </Card>
        )}

        {/* Session Controls */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Session Controls</h3>
          <div className="space-y-3">
            <Button className="w-full" variant="outline" disabled={extending || !sessionId || !canExtend} onClick={async () => {
              if (!sessionId) return;
              setExtending(true);
              try {
                await extendSession(sessionId, 15);
              } catch (e) { /* swallow */ }
              setExtending(false);
            }}>
              <Clock className="w-4 h-4 mr-2" />
              {extending ? 'Extending…' : `Extend Session (+15m)`}
            </Button>
            <Button className="w-full" variant="outline" onClick={async ()=>{
              setRulesOpen(s=>!s);
              if (!rulesOpen) {
                const live = await getLiveSessions(50, 6);
                const sess = live.find(s => s.session_id === sessionId);
                if (sess?.lot_id) {
                  try { const lot = await getLotDetail(sess.lot_id); setRules(lot.amenities?.length ? lot.amenities : ['Max 4h parking','Validation required','Follow on-site signage']); } catch { setRules(['Max 4h parking','Validation required','Follow on-site signage']); }
                } else {
                  setRules(['Max 4h parking','Validation required','Follow on-site signage']);
                }
              }
            }}>
              View Parking Rules
            </Button>
            <Button className="w-full" variant="outline" disabled={locating || !sessionId} onClick={async ()=>{
              if (!sessionId) return; setLocating(true);
              try {
                // For MVP we reuse bay label once loaded; fallback static bay label
                const path = await locateMyCar({ session_id: sessionId, current_lat: 18.5204, current_lng: 73.8567, bay_label: bay || undefined });
                setLocatePath({ steps: path.steps });
              } catch { setLocatePath(null); }
              setLocating(false);
            }}>
              {locating ? 'Locating…' : 'Locate My Car'}
            </Button>
          </div>
        </Card>
        {locatePath && (
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Path to Bay</h3>
            <ol className="list-decimal pl-5 text-sm space-y-1">
              {locatePath.steps.map((s,i)=>(<li key={i}>{s.instruction} <span className="text-muted-foreground">({s.distance_m}m{s.level?`, ${s.level}`:''})</span></li>))}
            </ol>
          </Card>
        )}

        {rulesOpen && (
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Parking Rules</h3>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {rules.map((r,i)=>(<li key={i}>{r}</li>))}
            </ul>
          </Card>
        )}

        {/* Cost Estimator */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Cost Estimator</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+30 minutes</span>
              <span className="font-medium">{formatINR(currentCost + Math.round((rate ?? 150)/2))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+1 hour</span>
              <span className="font-medium">{formatINR(currentCost + Math.round(rate ?? 150))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+2 hours</span>
              <span className="font-medium">{formatINR(currentCost + Math.round((rate ?? 150) * 2))}</span>
            </div>
          </div>
        </Card>

        {/* Policy Reminder */}
        <Card className="p-4 bg-muted">
          <p className="text-sm text-muted-foreground">
            <strong>Reminder:</strong> Maximum 4 hours parking. Grace period: 10 minutes
            after time limit. Overstay fee: {formatINR(500)}/hour.
          </p>
        </Card>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
        <Button
          onClick={async () => {
            if (!sessionId) { navigate('/receipt'); return; }
            setEnding(true);
            try {
              await endSession(sessionId);
            } catch (e) { /* ignore for now */ }
            setEnding(false);
            navigate(`/receipt?session_id=${sessionId}`);
          }}
          className="w-full h-14 text-base font-semibold"
          variant="destructive"
          disabled={ending}
        >
          {ending ? 'Ending…' : 'End Session & Exit'}
        </Button>
      </div>
    </div>
  );
};

export default Session;
