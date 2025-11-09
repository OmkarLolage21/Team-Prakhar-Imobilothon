import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getRecentBookings, formatINR, parseAmountToNumber, type RecentBookingItem } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

const History = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<RecentBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { (async () => { try { const data = await getRecentBookings(100); setItems(data); } catch(e:any){ setErr(e?.message||'Failed'); } finally { setLoading(false);} })(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={()=>navigate('/profile')}><ArrowLeft className="w-5 h-5"/></Button>
        <h1 className="text-lg font-semibold">Parking History</h1>
      </div>
      <div className="px-4 py-6 space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        {!loading && items.length === 0 && <p className="text-sm">No bookings yet.</p>}
        {items.map(b => (
          <Card key={b.id} className="p-4 flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">#{(b.id || '').slice(0,6)}…</span>
              <span className="uppercase text-xs px-2 py-1 rounded bg-muted">{b.status ?? '—'}</span>
            </div>
            <div className="text-xs text-muted-foreground">{(b.startDate ?? '').replace('T',' ').slice(0,16) || '—'}</div>
            <div className="flex justify-between text-sm mt-1">
              <span>{b.lot || '—'}</span>
              <span>{formatINR(parseAmountToNumber(b.amount) || 0)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default History;
