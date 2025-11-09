"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { LiveSessionsView } from "@/components/live-sessions-view"

export default function SessionsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Live Sessions</h1>
          <p className="text-muted-foreground mt-1">Monitor active parking sessions in real-time</p>
        </div>
        <LiveSessionsView />
      </div>
    </DashboardLayout>
  )
}
