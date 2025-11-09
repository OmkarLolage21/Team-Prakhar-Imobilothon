import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getActiveViolations, getViolationStats, type ViolationEvent } from '@/lib/api';

const Incidents = () => {
  const [stats, setStats] = useState<{active:number; today:number; overstay:number; misuse:number} | null>(null);
  const [list, setList] = useState<ViolationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  useEffect(()=>{
    (async ()=>{
      try{
        setLoading(true);
        setErr(null);
        const [s, l] = await Promise.all([getViolationStats(), getActiveViolations()]);
        setStats(s); setList(l);
      }catch(e:any){ setErr(e?.message||'Failed to load'); }
      finally{ setLoading(false); }
    })();
  },[]);
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-primary text-white px-6 pt-12 pb-8">
        <h1 className="text-2xl font-bold">Incidents</h1>
        <p className="text-white/80">Overstay & misuse monitoring</p>
      </div>
      <div className="px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold">{stats?.active ?? '—'}</p></Card>
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">Overstay</p><p className="text-xl font-bold">{stats?.overstay ?? '—'}</p></Card>
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">Misuse</p><p className="text-xl font-bold">{stats?.misuse ?? '—'}</p></Card>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Active incidents</h3>
          <div className="space-y-2">
            {list.map(v => (
              <div key={v.id} className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{v.kind}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(v.detected_at).toLocaleString()} · Sess {v.session_id}</p>
                  {v.recommended_action && <p className="text-[11px] mt-1">Suggested: {v.recommended_action}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-[11px] px-2 py-1 rounded ${v.severity==='critical' ? 'bg-destructive/10 text-destructive' : v.severity==='warn' ? 'bg-yellow-500/10 text-yellow-700' : 'bg-muted text-foreground/70'}`}>{v.severity}</span>
                  <div className="mt-2">
                    <Button size="sm" variant="outline">Acknowledge</Button>
                  </div>
                </div>
              </div>
            ))}
            {list.length===0 && <p className="text-xs text-muted-foreground">No incidents.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};
export default Incidents;
