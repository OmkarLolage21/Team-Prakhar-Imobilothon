"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Insights</h1>
          <p className="text-muted-foreground mt-1">Detailed performance metrics and business insights</p>
        </div>
        <AnalyticsDashboard />
      </div>
    </DashboardLayout>
  )
}
