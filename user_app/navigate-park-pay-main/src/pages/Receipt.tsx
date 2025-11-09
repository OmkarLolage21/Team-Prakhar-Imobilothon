import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, Share2, ThumbsUp, ThumbsDown, Clock, MapPin, IndianRupee } from "lucide-react";
import { getLiveSessions, formatINR, resolveSessionCharge, getLotDetail } from "@/lib/api";

const Receipt = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const sessionId = search.get('session_id');
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [receipt, setReceipt] = useState<{
    bookingId?: string;
    lot?: string;
    bay?: string;
    checkIn?: string;
    checkOut?: string;
    duration?: string;
    totalCharged?: number | null;
  }>({ totalCharged: null });
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!sessionId) return;
      const live = await getLiveSessions(500, 48);
  const s = live.find(x => x.session_id === sessionId);
      if (!s) return;
      // derive fields
      const started = s.started_at ? new Date(s.started_at) : null;
      const ended = s.ended_at ? new Date(s.ended_at) : new Date();
      let duration = "--";
  if (started && ended) {
        const mins = Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 60000));
        const h = Math.floor(mins / 60); const m = mins % 60;
        duration = `${h ? `${h}h ` : ''}${m}m`;
      }
      const charge = resolveSessionCharge(s);
      const base = {
        bookingId: s.booking_id || undefined,
        lot: s.lot_name || '—',
        bay: s.bay_label || '—',
        checkIn: started ? started.toLocaleTimeString() : undefined,
        checkOut: ended ? ended.toLocaleTimeString() : undefined,
        duration,
        totalCharged: charge,
      };
      // Fallback: if lot name missing but lot_id available, fetch lot detail
      if ((!s.lot_name || s.lot_name === '') && s.lot_id) {
        try {
          const lot = await getLotDetail(s.lot_id);
          setReceipt({ ...base, lot: lot.name || base.lot });
        } catch {
          setReceipt(base);
        }
      } else {
        setReceipt(base);
      }
    }
    void load();
  }, [sessionId]);

  const handleFeedback = (value: "yes" | "no") => {
    setFeedback(value);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Success Header */}
      <div className="bg-gradient-confidence text-white px-6 pt-12 pb-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Session Complete!</h1>
          <p className="text-white/80">Thank you for using ParkSmart</p>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Receipt Card */}
        <Card className="p-6 shadow-elevated" ref={receiptRef}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
              <h2 className="text-xl font-bold">Receipt</h2>
              <Badge className="bg-success">Paid</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Booking ID</span>
                <span className="text-sm font-medium">{receipt.bookingId ?? '—'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Location</span>
                <span className="text-sm font-medium text-right">{receipt.lot ?? '—'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bay</span>
                <span className="text-sm font-medium">{receipt.bay ?? '—'}</span>
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Duration</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-medium">{receipt.checkIn ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-medium">{receipt.checkOut ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="font-medium">Total Duration</span>
                  <span className="font-semibold">{receipt.duration ?? '—'}</span>
                </div>
              </div>

              {/* Optional breakdown could be filled later from payments */}

              <div className="pt-3 border-t flex justify-between items-center">
                <span className="text-lg font-bold">Total Charged</span>
                <span className="text-2xl font-bold text-primary">{formatINR(receipt.totalCharged ?? null)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Feedback */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Quick Feedback</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Was the parking spot available when you arrived?
          </p>
          <div className="flex gap-3">
            <Button
              variant={feedback === "yes" ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleFeedback("yes")}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Yes
            </Button>
            <Button
              variant={feedback === "no" ? "destructive" : "outline"}
              className="flex-1"
              onClick={() => handleFeedback("no")}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              No
            </Button>
          </div>
          {feedback && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Thank you for your feedback! It helps us improve.
            </p>
          )}
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={async () => {
              // Try to generate PDF via dynamic import; fallback to print
              try {
                const html2canvas = (await import('html2canvas')).default;
                const jsPDF = (await import('jspdf')).default;
                const node = receiptRef.current;
                if (!node) return;
                const canvas = await html2canvas(node, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
                const w = canvas.width * ratio;
                const h = canvas.height * ratio;
                const x = (pageWidth - w) / 2;
                const y = 24;
                pdf.addImage(imgData, 'PNG', x, y, w, h);
                pdf.save(`receipt-${receipt.bookingId || sessionId || 'session'}.pdf`);
              } catch (e) {
                window.print();
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              const text = `Parking Receipt\nBooking: ${receipt.bookingId || '—'}\nLocation: ${receipt.lot || '—'}\nBay: ${receipt.bay || '—'}\nDuration: ${receipt.duration || '—'}\nTotal: ${formatINR(receipt.totalCharged ?? null)}`;
              if (navigator.share) {
                navigator.share({ title: 'Parking Receipt', text });
              } else {
                const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(url, '_blank');
              }
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
        <Button
          onClick={() => navigate("/home")}
          className="w-full h-14 text-base font-semibold"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default Receipt;
