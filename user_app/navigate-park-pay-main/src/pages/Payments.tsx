import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Plus } from 'lucide-react';

interface Method { id: string; last4: string; brand: string; exp: string }

const Payments = () => {
  const navigate = useNavigate();
  const [methods, setMethods] = useState<Method[]>([
    { id: 'm1', last4: '1234', brand: 'Visa', exp: '12/25' },
  ]);
  const addMock = () => setMethods(m => [...m, { id: 'm'+(m.length+1), last4: String(1000 + Math.floor(Math.random()*9000)), brand: 'Visa', exp: '01/27' }]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={()=>navigate('/profile')}><ArrowLeft className="w-5 h-5"/></Button>
        <h1 className="text-lg font-semibold">Payment Methods</h1>
      </div>
      <div className="px-4 py-6 space-y-4">
        {methods.map(m => (
          <Card key={m.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">•••• {m.last4}</p>
                <p className="text-xs text-muted-foreground">{m.brand} · Exp {m.exp}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">Remove</Button>
          </Card>
        ))}
        <Button onClick={addMock} variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2"/>Add Method</Button>
      </div>
    </div>
  );
};
export default Payments;
