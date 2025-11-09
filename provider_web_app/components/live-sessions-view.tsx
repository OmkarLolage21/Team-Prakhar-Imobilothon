"use client"

import { useMemo, useState, useEffect } from "react"
import { MapPin, Clock, IndianRupee } from "lucide-react"
import { api } from "@/lib/api"
import { SessionsMap } from "@/components/sessions-map"
import { SessionsList } from "@/components/sessions-list"
import { useSessions } from "@/hooks/use-sessions"
import { useLots } from "@/hooks/use-lots"
import { useToast } from "@/hooks/use-toast"

export function LiveSessionsView() {
  const [viewMode, setViewMode] = useState<"map" | "list">("list")
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [showLots, setShowLots] = useState(true)
  const [showSessions, setShowSessions] = useState(true)
  const [sending, setSending] = useState(false)
  const [ending, setEnding] = useState(false)
  const [extending, setExtending] = useState(false)
  const { toast } = useToast()

  const { sessions, loading, error, refetch } = useSessions(200, 6) // include sessions ended in last 6h
  const { lots } = useLots()

  // Auto-select first session if none selected when data loads
  useEffect(() => {
    if (!selectedSession && sessions.length > 0) {
      setSelectedSession(1)
    }
  }, [sessions, selectedSession])

  // transform backend sessions into UI shape with enriched values
  const uiSessions = useMemo(() => {
    const now = Date.now()
    return sessions.map((s, idx) => {
      // duration
      let duration: string | null = null
      let minutes = s.duration_minutes ?? 0
      if ((!minutes || minutes === 0) && s.started_at) {
        const start = new Date(s.started_at)
        minutes = Math.max(0, Math.floor((now - start.getTime()) / 60000))
      }
      // ensure we don't show 0m for active sessions just started (only if started_at <= now)
      if ((s.ended_at == null || s.ended_at === undefined) && s.started_at && new Date(s.started_at).getTime() <= now && minutes === 0) {
        minutes = 1
      }
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      duration = `${h}h ${m}m`
      // status/warning
  const isOverGrace = s.grace_ends_at ? Date.now() > new Date(s.grace_ends_at).getTime() : false
      const status = isOverGrace || !s.validation_method ? "warning" : "active"
      // extension badge: compare grace window to baseline 15 minutes
      const extended = (s.started_at && s.grace_ends_at)
        ? (new Date(s.grace_ends_at).getTime() - new Date(s.started_at).getTime()) > (15 * 60 * 1000)
        : false
      // cost: use authorized amount if present else dynamic price * hours
      const estimatedNumber = typeof s.cost_estimated === "number"
        ? s.cost_estimated
        : (typeof s.amount_authorized === "number" ? s.amount_authorized : (typeof s.dynamic_price === "number" ? s.dynamic_price * Math.max(1, Math.ceil(minutes / 60)) : NaN))
      const estimatedCost = Number.isFinite(estimatedNumber) ? `₹${estimatedNumber.toFixed(2)}` : "--"
      const customer = s.customer_email ? s.customer_email.split("@")[0] : (s.booking_id?.slice(0, 8) || "anon")
      return {
        id: idx + 1,
        session_id: s.session_id,
        customer,
        phone: null,
  lot: s.lot_name || s.slot_id?.split("_")[0] || "Lot",
        space: s.slot_id || s.bay_label || "--",
        startTime: s.started_at ? new Date(s.started_at).toLocaleTimeString() : "--",
        duration,
        estimatedCost,
        status,
        vehicle: "Car",
        plate: s.booking_id ? s.booking_id.slice(0, 6).toUpperCase() : "--",
        lat: s.lot_lat ?? null,
        lng: s.lot_lng ?? null,
        extended,
      }
    })
  }, [sessions])

  // KPI stats
  const stats = useMemo(() => {
    const count = uiSessions.length
    if (count === 0) return { avgDuration: "--", revenue: "--", warnings: 0 }
    const totalMin = uiSessions.reduce((acc, s) => {
      const parts = (s.duration || "0h 0m").split(" ")
      const h = parseInt(parts[0] || "0") || 0
      const m = parseInt((parts[1] || "0").replace("m", "")) || 0
      return acc + h * 60 + m
    }, 0)
    const avgMin = Math.floor(totalMin / count)
    const avgH = Math.floor(avgMin / 60)
    const avgM = avgMin % 60
  const revenue = sessions.reduce((sum, s) => sum + (s.cost_estimated || s.amount_authorized || 0), 0)
    const warnings = uiSessions.filter(s => s.status === "warning").length
    return {
      avgDuration: `${avgH}h ${avgM}m`,
      revenue: `₹${revenue.toFixed(2)}`,
      warnings,
    }
  }, [uiSessions, sessions])

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
          <p className="text-2xl font-bold text-foreground">{loading ? "--" : uiSessions.filter(s => !sessions.find(x => x.session_id === s.session_id)?.ended_at).length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Avg Duration</p>
          <p className="text-2xl font-bold text-foreground">{stats.avgDuration}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Current Revenue</p>
          <p className="text-2xl font-bold text-chart-1">{stats.revenue}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Warnings</p>
          <p className="text-2xl font-bold text-chart-4">{stats.warnings}</p>
        </div>
      </div>

      {/* Content */}
      {viewMode === "map" ? (
        <>
          <div className="flex gap-2 mb-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showLots} onChange={(e) => setShowLots(e.target.checked)} />
              Lots
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showSessions} onChange={(e) => setShowSessions(e.target.checked)} />
              Sessions
            </label>
          </div>
          <SessionsMap sessions={showSessions ? uiSessions : []} lots={showLots ? lots : []} selectedSession={selectedSession} onSelectSession={(id) => setSelectedSession(id)} />
        </>
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
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        <span>{session.duration}</span>
                        {session.extended && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Extended</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <IndianRupee className="text-chart-1" size={20} />
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Cost</p>
                      <p className="font-semibold text-foreground">{session.estimatedCost}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={sending}
                      onClick={async () => {
                        try {
                          setSending(true)
                          await api.sendSessionAlert(session.session_id, `Please confirm your parking validation for ${session.lot}.`)
                          toast({ title: "Alert sent", description: `Session ${session.session_id.slice(0,6)}…` })
                        } catch (e: any) {
                          toast({ title: "Failed to send alert", description: e.message || "Unknown error" })
                        } finally {
                          setSending(false)
                        }
                      }}
                    >
                      {sending ? "Sending…" : "Send Alert"}
                    </button>
                    <button
                      className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={ending}
                      onClick={async () => {
                        try {
                          setEnding(true)
                          await api.endSession(session.session_id)
                          toast({ title: "Session ended" })
                          refetch()
                        } catch (e: any) {
                          toast({ title: "Failed to end session", description: e.message || "Unknown error" })
                        } finally {
                          setEnding(false)
                        }
                      }}
                    >
                      {ending ? "Ending…" : "End Session"}
                    </button>
                    <button
                      className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={extending}
                      onClick={async () => {
                        try {
                          setExtending(true)
                          await api.extendSession(session.session_id, 15)
                          toast({ title: "Extended by 15m" })
                          refetch()
                        } catch (e: any) {
                          toast({ title: "Failed to extend", description: e.message || "Unknown error" })
                        } finally {
                          setExtending(false)
                        }
                      }}
                    >
                      {extending ? "Extending…" : "Extend +15m"}
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
