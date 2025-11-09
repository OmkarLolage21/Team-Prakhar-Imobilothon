"use client"

import { TrendingUp, Users, IndianRupee, AlertCircle } from "lucide-react"
import { useSessions } from "@/hooks/use-sessions"
import { formatINR } from "@/lib/utils"

export function KPICards() {
  // Pull live sessions (only active, no recently ended) for accurate count
  const { sessions } = useSessions(200, 0)
  const activeCount = sessions.filter(s => !s.ended_at).length
  // Aggregate revenue from active sessions (authorized or estimated) for a rough live figure
  const liveRevenue = sessions.reduce((sum, s) => sum + (s.amount_captured || s.amount_authorized || s.cost_estimated || 0), 0)
  // Occupancy proxy: active sessions / (active sessions + 20 buffer) – placeholder until real capacity metric wired
  const occupancyRate = activeCount ? Math.min(100, Math.round((activeCount / (activeCount + 20)) * 100)) : 0
  const alerts = sessions.filter(s => s.grace_ends_at && new Date(s.grace_ends_at).getTime() < Date.now() && !s.ended_at).length
  const kpis = [
    {
      label: "Live Revenue",
      value: formatINR(liveRevenue, { showZero: true }),
      change: "",
  icon: IndianRupee,
      color: "text-chart-1",
    },
    {
      label: "Active Sessions",
      value: String(activeCount),
      change: "",
      icon: Users,
      color: "text-chart-2",
    },
    {
      label: "Occupancy (Approx)",
      value: `${occupancyRate}%`,
      change: "",
      icon: TrendingUp,
      color: "text-chart-3",
    },
    {
      label: "Warnings / Over Grace",
      value: String(alerts),
      change: "",
      icon: AlertCircle,
      color: "text-chart-4",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div key={kpi.label} className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-chart-1 mt-2">{kpi.change}</p>
              </div>
              <Icon className={`${kpi.color} opacity-80`} size={24} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
