"use client"

import { AlertCircle, CheckCircle, Phone } from "lucide-react"

interface SessionsListProps {
  sessions: any[]
  selectedSession: number | null
  onSelectSession: (id: number) => void
}

export function SessionsList({ sessions, selectedSession, onSelectSession }: SessionsListProps) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Customer</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Location</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Duration</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Est. Cost</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`border-b border-border hover:bg-muted/50 transition cursor-pointer ${
                  selectedSession === session.id ? "bg-primary/10" : ""
                }`}
              >
                <td className="py-3 px-4">
                  <div>
                    <p className="font-semibold text-foreground">{session.customer}</p>
                    <p className="text-xs text-muted-foreground">{session.vehicle}</p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <p className="font-semibold text-foreground">
                    {session.lot} - {session.space}
                  </p>
                </td>
                <td className="py-3 px-4 text-foreground">{session.duration}</td>
                <td className="py-3 px-4 font-semibold text-chart-1">{session.estimatedCost}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {session.status === "warning" ? (
                      <>
                        <AlertCircle size={16} className="text-chart-4" />
                        <span className="text-chart-4 font-medium">Exceeding</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} className="text-chart-1" />
                        <span className="text-chart-1 font-medium">Active</span>
                      </>
                    )}
                    {session.extended && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Extended</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <button className="p-1 hover:bg-muted rounded transition text-foreground" title="Call customer" aria-label="Call customer">
                    <Phone size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
