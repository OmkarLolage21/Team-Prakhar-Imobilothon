"use client"
import { useEffect, useState } from "react"
import { TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { API_BASE } from "@/lib/api"
import { formatINR } from "@/lib/utils"

interface Summary {
  total_revenue: number
  paid_count: number
  pending_amount: number
  failed_count: number
}

export function PaymentsSummary() {
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/analytics/payments/summary`, { cache: "no-store" })
        if (!res.ok) throw new Error(`failed: ${res.status}`)
        const json = (await res.json()) as Summary
        setData(json)
      } catch (e: any) {
        setError(e.message || "Failed to load payments summary")
      }
    }
    run()
  }, [])

  const cards = [
    {
      label: "Total Revenue",
      value: data ? formatINR(data.total_revenue) : "--",
      change: "",
      icon: TrendingUp,
      color: "text-chart-1",
    },
    {
      label: "Paid Bookings",
      value: data ? String(data.paid_count) : "--",
      change: "",
      icon: CheckCircle,
      color: "text-chart-1",
    },
    {
      label: "Pending Payments",
      value: data ? formatINR(data.pending_amount) : "--",
      change: "",
      icon: Clock,
      color: "text-chart-4",
    },
    {
      label: "Failed Payments",
      value: data ? String(data.failed_count) : "--",
      change: "",
      icon: AlertCircle,
      color: "text-destructive",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {error && <div className="text-destructive col-span-4">{error}</div>}
      {cards.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                {item.change && <p className={`text-xs ${item.color} mt-2`}>{item.change}</p>}
              </div>
              <Icon className={`${item.color} opacity-80`} size={24} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
