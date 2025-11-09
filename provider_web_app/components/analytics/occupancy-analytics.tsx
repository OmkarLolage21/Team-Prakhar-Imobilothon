"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useOccupancy } from "@/hooks/use-occupancy"

function formatData(points: { date: string; occupancy: number }[]) {
  return points.map(p => ({
    day: formatLabel(p.date),
    occupancy: Math.round(p.occupancy),
    capacity: 100,
  }))
}

function formatLabel(dateStr: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return dateStr
}

export function OccupancyAnalytics({ days = 7 }: { days?: number }) {
  const { occupancy, loading, error } = useOccupancy(days)
  const chartData = formatData(occupancy.slice(-7)) // last 7 days for weekly chart
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Weekly Occupancy</h2>
      {loading && <p className="text-sm text-muted-foreground">Loading occupancy...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && chartData.length === 0 && <p className="text-sm text-muted-foreground">No occupancy data.</p>}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "var(--color-foreground)" }}
            />
            <Legend />
            <Bar dataKey="occupancy" fill="var(--color-chart-2)" name="Occupancy %" />
            <Bar dataKey="capacity" fill="var(--color-muted)" name="Capacity %" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
