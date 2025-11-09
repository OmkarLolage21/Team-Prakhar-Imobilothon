import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Preferences = () => {
  const navigate = useNavigate();
  const [evPreferred, setEvPreferred] = useState(false);
  const [accessiblePreferred, setAccessiblePreferred] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem('prefs');
    if (v) {
      try { const o = JSON.parse(v); setEvPreferred(!!o.evPreferred); setAccessiblePreferred(!!o.accessiblePreferred); } catch {}
    }
  }, []);

  const save = () => {
    localStorage.setItem('prefs', JSON.stringify({ evPreferred, accessiblePreferred }));
    alert('Preferences saved');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={()=>navigate('/profile')}><ArrowLeft className="w-5 h-5"/></Button>
        <h1 className="text-lg font-semibold">Preferences</h1>
      </div>
      <div className="px-4 py-6 space-y-4">
        <Card className="p-4">
          <label className="flex items-center gap-2 text-sm mb-3">
            <input type="checkbox" checked={evPreferred} onChange={e=>setEvPreferred(e.target.checked)} /> Prefer EV-compatible spots
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={accessiblePreferred} onChange={e=>setAccessiblePreferred(e.target.checked)} /> Need accessibility features
          </label>
        </Card>
        <Button onClick={save} className="w-full">Save</Button>
      </div>
    </div>
  );
};
export default Preferences;
