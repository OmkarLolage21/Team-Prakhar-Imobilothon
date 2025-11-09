"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BookingDetail({ id }: { id: string }) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const b = await api.getBooking(id);
        if (alive) setData(b);
      } catch (e: any) {
        if (alive) setError(e.message || "Failed to load booking");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="p-6">Loading booking...</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (!data) return <div className="p-6">Not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bookings">
          <button aria-label="Back to bookings" className="p-2 rounded hover:bg-muted transition"><ChevronLeft className="w-5 h-5" /></button>
        </Link>
        <h1 className="text-2xl font-bold">Booking {data.booking_id}</h1>
      </div>
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Info label="Slot" value={data.slot_id} />
          <Info label="Mode" value={data.mode} />
          <Info label="Status" value={data.status} />
          <Info label="ETA" value={data.eta_minute} />
          <Info label="p_free_at_hold" value={data.p_free_at_hold?.toFixed?.(2)} />
          <Info label="Backups" value={data.backups?.length} />
        </div>
        {data.backups?.length ? (
          <div>
            <p className="font-semibold mb-2">Backup Slots</p>
            <div className="flex flex-wrap gap-2">
              {data.backups.map((b: any) => (
                <span key={b.slot_id} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                  {b.slot_id} {b.confidence ? `(${b.confidence.toFixed(2)})` : ""}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-all">{value ?? "-"}</p>
    </div>
  );
}
