"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { TeamManagement } from "@/components/team-management"

export default function TeamPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team & Admin</h1>
          <p className="text-muted-foreground mt-1">Manage team members and access permissions</p>
        </div>
        <TeamManagement />
      </div>
    </DashboardLayout>
  )
}
