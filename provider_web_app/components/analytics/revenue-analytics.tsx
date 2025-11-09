"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useRevenue } from "@/hooks/use-revenue"

// Simple target function: moving average * 1.05 or static fallback
function computeData(points: { date: string; amount: number }[]): { date: string; revenue: number; target: number }[] {
  if (!points.length) return []
  const out: { date: string; revenue: number; target: number }[] = []
  let rollingSum = 0
  points.forEach((p, idx) => {
    rollingSum += p.amount
    const avg = rollingSum / (idx + 1)
    const target = Math.round(avg * 1.05)
    out.push({ date: formatLabel(p.date), revenue: p.amount, target })
  })
  return out
}

function formatLabel(dateStr: string): string {
  // Expect YYYY-MM-DD; fallback raw
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return dateStr
}

export function RevenueAnalytics({ days = 30 }: { days?: number }) {
  const { revenue, loading, error } = useRevenue(days)
  const chartData = computeData(revenue)
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Revenue Trend</h2>
      {loading && <p className="text-sm text-muted-foreground">Loading revenue...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && chartData.length === 0 && (
        <p className="text-sm text-muted-foreground">No revenue data.</p>
      )}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: `1px solid var(--color-border)`,
                borderRadius: "8px",
              }}
              labelStyle={{ color: "var(--color-foreground)" }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-chart-1)"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Actual Revenue"
            />
            <Area
              type="monotone"
              dataKey="target"
              stroke="var(--color-muted-foreground)"
              strokeDasharray="5 5"
              fill="none"
              name="Target"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
