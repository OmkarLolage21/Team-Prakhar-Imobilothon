"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { time: "12 AM", sessions: 12, revenue: 60 },
  { time: "4 AM", sessions: 8, revenue: 40 },
  { time: "8 AM", sessions: 45, revenue: 225 },
  { time: "12 PM", sessions: 120, revenue: 600 },
  { time: "4 PM", sessions: 95, revenue: 475 },
  { time: "8 PM", sessions: 65, revenue: 325 },
  { time: "12 AM", sessions: 20, revenue: 100 },
]

export function PeakHoursAnalytics() {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Peak Hours Analysis</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#1f2937" }}
          />
          <Legend />
          <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} name="Sessions" />
          <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue ($)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
