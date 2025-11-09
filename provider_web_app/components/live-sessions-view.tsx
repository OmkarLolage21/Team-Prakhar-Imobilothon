"use client"

import { useMemo, useState } from "react"
import { MapPin, Clock, DollarSign } from "lucide-react"
import { SessionsMap } from "@/components/sessions-map"
import { SessionsList } from "@/components/sessions-list"
import { useSessions } from "@/hooks/use-sessions"

export function LiveSessionsView() {
  const [viewMode, setViewMode] = useState<"map" | "list">("list")
  const [selectedSession, setSelectedSession] = useState<number | null>(null)

  const { sessions, loading, error } = useSessions(100)

  // transform backend sessions into UI shape with synthetic derived fields for now
  const uiSessions = useMemo(() => {
  return sessions.map((s, idx) => {
      // derive duration placeholder
      let duration: string | null = null
      if (s.started_at) {
        const start = new Date(s.started_at)
        const now = new Date()
        const mins = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60000))
        const h = Math.floor(mins / 60)
        const m = mins % 60
        duration = `${h}h ${m}m`
      }
      return {
        id: idx + 1, // numeric id for UI components
        session_id: s.session_id,
        customer: s.booking_id?.slice(0, 8) || "anon",
        phone: null,
        lot: s.bay_label || "Lot",
        space: s.bay_label || "--",
        startTime: s.started_at ? new Date(s.started_at).toLocaleTimeString() : "--",
        duration,
        estimatedCost: "--",
        status: "active",
        vehicle: "--",
        plate: "--",
      }
    })
  }, [sessions])

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("list")}
          className={`px-4 py-2 rounded-lg transition ${
            viewMode === "list"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          List View
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={`px-4 py-2 rounded-lg transition ${
            viewMode === "map"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Map View
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Active Sessions</p>
          <p className="text-2xl font-bold text-foreground">{loading ? "--" : uiSessions.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Avg Duration</p>
          <p className="text-2xl font-bold text-foreground">--</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Current Revenue</p>
          <p className="text-2xl font-bold text-chart-1">--</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Warnings</p>
          <p className="text-2xl font-bold text-chart-4">--</p>
        </div>
      </div>

      {/* Content */}
      {viewMode === "map" ? (
  <SessionsMap sessions={uiSessions} selectedSession={selectedSession} onSelectSession={(id) => setSelectedSession(id)} />
      ) : (
  <SessionsList sessions={uiSessions} selectedSession={selectedSession} onSelectSession={(id) => setSelectedSession(id)} />
      )}

      {/* Session Details */}
      {selectedSession && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Session Details</h2>
          {(() => {
            const session = uiSessions.find((s) => s.id === selectedSession)
            if (!session) return null

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="text-lg font-semibold text-foreground">{session.customer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-lg font-semibold text-foreground">{session.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vehicle</p>
                    <p className="text-lg font-semibold text-foreground">{session.vehicle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">License Plate</p>
                    <p className="text-lg font-semibold text-foreground">{session.plate}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-primary" size={20} />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold text-foreground">{session.lot} - Space {session.space}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="text-primary" size={20} />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold text-foreground">{session.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-chart-1" size={20} />
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Cost</p>
                      <p className="font-semibold text-foreground">{session.estimatedCost}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">
                      Send Alert
                    </button>
                    <button className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition">
                      End Session
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
