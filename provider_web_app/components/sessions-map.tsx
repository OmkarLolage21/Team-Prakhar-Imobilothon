"use client"

import { AlertCircle, CheckCircle } from "lucide-react"

interface SessionsMapProps {
  sessions: any[]
  selectedSession: number | null
  onSelectSession: (id: number) => void
}

export function SessionsMap({ sessions, selectedSession, onSelectSession }: SessionsMapProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 h-96 flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Map integration with Mapbox would go here</p>
        <p className="text-sm text-muted-foreground">Showing {sessions.length} active sessions</p>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {sessions.slice(0, 3).map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`p-3 rounded-lg border-2 transition text-left ${
                selectedSession === session.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {session.status === "warning" ? (
                  <AlertCircle size={16} className="text-chart-4" />
                ) : (
                  <CheckCircle size={16} className="text-chart-1" />
                )}
                <span className="font-semibold text-foreground text-sm">{session.lot}</span>
              </div>
              <p className="text-xs text-muted-foreground">{session.customer}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
