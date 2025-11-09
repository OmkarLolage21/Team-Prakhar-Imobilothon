"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { RevenueAnalytics } from "@/components/analytics/revenue-analytics"
import { OccupancyAnalytics } from "@/components/analytics/occupancy-analytics"
import { CustomerAnalytics } from "@/components/analytics/customer-analytics"
import { PeakHoursAnalytics } from "@/components/analytics/peak-hours-analytics"
import { useRevenue } from "@/hooks/use-revenue"
import { formatINR } from "@/lib/utils"

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("30days")
  const days = timeRange === "7days" ? 7 : timeRange === "90days" ? 90 : timeRange === "1year" ? 365 : 30
  const { revenue } = useRevenue(days)
  const avgRevenue = revenue.length ? Math.round(revenue.reduce((s, r) => s + (r.amount || 0), 0) / revenue.length) : 0

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <div className="relative">
          <select
            aria-label="Select time range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-8"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="1year">Last year</option>
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={18}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground mb-2">Avg Revenue/Day</p>
          <p className="text-3xl font-bold text-chart-1">{formatINR(avgRevenue, { showZero: true })}</p>
          <p className="text-xs text-chart-1 mt-2">vs last period</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground mb-2">Avg Occupancy</p>
          <p className="text-3xl font-bold text-chart-2">78%</p>
          <p className="text-xs text-chart-2 mt-2">+5.2% vs last period</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground mb-2">Avg Session Duration</p>
          <p className="text-3xl font-bold text-chart-3">2h 42m</p>
          <p className="text-xs text-chart-3 mt-2">+12 min vs last period</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground mb-2">Customer Retention</p>
          <p className="text-3xl font-bold text-chart-4">72%</p>
          <p className="text-xs text-chart-4 mt-2">+3.1% vs last period</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <RevenueAnalytics days={days} />
        <OccupancyAnalytics />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeakHoursAnalytics />
        <CustomerAnalytics />
      </div>
    </div>
  )
}
