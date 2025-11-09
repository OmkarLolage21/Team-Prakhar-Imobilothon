"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { day: "Mon", revenue: 4200, transactions: 24 },
  { day: "Tue", revenue: 3800, transactions: 21 },
  { day: "Wed", revenue: 5100, transactions: 29 },
  { day: "Thu", revenue: 4600, transactions: 26 },
  { day: "Fri", revenue: 6200, transactions: 35 },
  { day: "Sat", revenue: 7100, transactions: 42 },
  { day: "Sun", revenue: 5800, transactions: 33 },
]

export function RevenueChart() {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Weekly Revenue</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
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
          <Bar dataKey="revenue" fill="var(--color-chart-1)" />
          <Bar dataKey="transactions" fill="var(--color-chart-2)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
