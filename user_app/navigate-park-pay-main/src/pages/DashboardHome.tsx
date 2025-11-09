import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatINR, getRecentBookings, parseAmountToNumber, type RecentBookingItem, getViolationStats, getActiveViolations, type ViolationEvent } from '@/lib/api';

const DashboardHome = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<RecentBookingItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [vStats, setVStats] = useState<{active:number; today:number; overstay:number; misuse:number} | null>(null);
  const [violations, setViolations] = useState<ViolationEvent[] | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await getRecentBookings(25);
        setItems(data);
        // Violations
        try {
          const [s, v] = await Promise.all([getViolationStats(), getActiveViolations()]);
          setVStats(s);
          setViolations(v);
        } catch {}
      } catch (e: any) {
        setErr(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(() => {
    const list = items ?? [];
    const active = list.filter(i => (i.status?.toLowerCase() === 'active')).length;
    const spent = list.reduce((sum, i) => sum + (parseAmountToNumber(i.amount) || 0), 0);
    const total = list.length || 1;
    const paid = list.filter(i => i.paymentStatus === 'paid').length;
    const successPct = Math.round((paid / total) * 100);
    return { active, spent, successPct };
  }, [items]);
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-primary text-white px-6 pt-12 pb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-white/80">Your parking at a glance</p>
      </div>

      <div className="px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold">{loading ? '—' : stats.active}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold">{loading ? formatINR(0) : formatINR(stats.spent)}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Success</p>
            <p className="text-xl font-bold">{loading ? '—' : `${stats.successPct}%`}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold mb-2">Quick actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => navigate('/booking')} className="h-12">Find Parking</Button>
            <Button onClick={() => navigate('/profile')} variant="outline" className="h-12">Manage Vehicles</Button>
          </div>
          {err && <p className="text-xs text-destructive mt-3">{err}</p>}
        </Card>

        {/* Violations Overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Incidents</h3>
            <Button size="sm" variant="outline" onClick={()=>navigate('/incidents')}>View all</Button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="p-3 text-center"><p className="text-[11px] text-muted-foreground">Active</p><p className="text-lg font-bold">{vStats?.active ?? '—'}</p></Card>
            <Card className="p-3 text-center"><p className="text-[11px] text-muted-foreground">Overstay</p><p className="text-lg font-bold">{vStats?.overstay ?? '—'}</p></Card>
            <Card className="p-3 text-center"><p className="text-[11px] text-muted-foreground">Misuse</p><p className="text-lg font-bold">{vStats?.misuse ?? '—'}</p></Card>
          </div>
          <div className="space-y-2">
            {(violations ?? []).slice(0,3).map(v => (
              <div key={v.id} className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{v.kind}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(v.detected_at).toLocaleTimeString()} · Sess {v.session_id}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] px-2 py-1 rounded ${v.severity==='critical' ? 'bg-destructive/10 text-destructive' : v.severity==='warn' ? 'bg-yellow-500/10 text-yellow-700' : 'bg-muted text-foreground/70'}`}>{v.severity}</span>
                </div>
              </div>
            ))}
            {(violations?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground">No active incidents.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};
export default DashboardHome;
