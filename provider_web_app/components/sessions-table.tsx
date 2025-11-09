"use client"

import { useSessions } from "@/hooks/use-sessions"
import { formatINR } from "@/lib/utils"

export function SessionsTable() {
  // Use live sessions (no recent ended) for recent active/completed display
  const { sessions } = useSessions(50, 0)
  const rows = sessions.slice(0, 15).map((s) => {
    // duration formatting
    const minutes = s.duration_minutes ?? 0
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const duration = minutes ? `${h}h ${m}m` : "--"
    const amountSource = s.amount_captured ?? s.amount_authorized ?? s.cost_estimated ?? null
    const amount = amountSource != null ? formatINR(amountSource, { showZero: true }) : "--"
    const status = s.ended_at ? "Completed" : "Active"
    return {
      id: s.session_id.slice(0, 8),
      customer: s.customer_email ? s.customer_email.split("@")[0] : "anon",
      lot: s.lot_name || "--",
      duration,
      amount,
      status,
    }
  })

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Recent Sessions</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Session ID</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Customer</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Lot</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Duration</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Amount</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((session) => (
              <tr key={session.id} className="border-b border-border hover:bg-muted/50 transition">
                <td className="py-3 px-4 text-foreground font-medium">{session.id}</td>
                <td className="py-3 px-4 text-foreground">{session.customer}</td>
                <td className="py-3 px-4 text-foreground">{session.lot}</td>
                <td className="py-3 px-4 text-foreground">{session.duration}</td>
                <td className="py-3 px-4 text-foreground font-semibold">{session.amount}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      session.status === "Active" ? "bg-chart-1/20 text-chart-1" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {session.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
