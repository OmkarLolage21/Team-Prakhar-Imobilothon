"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { time: "12 AM", "Lot A": 45, "Lot B": 32, "Lot C": 28 },
  { time: "4 AM", "Lot A": 38, "Lot B": 25, "Lot C": 20 },
  { time: "8 AM", "Lot A": 72, "Lot B": 68, "Lot C": 55 },
  { time: "12 PM", "Lot A": 95, "Lot B": 87, "Lot C": 78 },
  { time: "4 PM", "Lot A": 88, "Lot B": 82, "Lot C": 71 },
  { time: "8 PM", "Lot A": 65, "Lot B": 58, "Lot C": 48 },
  { time: "12 AM", "Lot A": 42, "Lot B": 35, "Lot C": 30 },
]

export function OccupancyChart() {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Occupancy Trends</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="time" stroke="var(--color-muted-foreground)" />
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
          <Line type="monotone" dataKey="Lot A" stroke="var(--color-chart-1)" strokeWidth={2} />
          <Line type="monotone" dataKey="Lot B" stroke="var(--color-chart-2)" strokeWidth={2} />
          <Line type="monotone" dataKey="Lot C" stroke="var(--color-chart-3)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
