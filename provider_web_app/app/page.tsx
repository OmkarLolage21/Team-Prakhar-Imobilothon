import { DashboardLayout } from "@/components/dashboard-layout"
import { KPICards } from "@/components/kpi-cards"
import { AlertsPanel } from "@/components/alerts-panel"
import { OccupancyChart } from "@/components/occupancy-chart"
import { RevenueChart } from "@/components/revenue-chart"
import { SessionsTable } from "@/components/sessions-table"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition">
              Last 7 days
            </button>
          </div>
        </div>

        <KPICards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OccupancyChart />
          </div>
          <AlertsPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart />
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg. Session Duration</span>
                <span className="font-semibold text-foreground">2h 34m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Customer Satisfaction</span>
                <span className="font-semibold text-foreground">4.8/5.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Repeat Customers</span>
                <span className="font-semibold text-foreground">68%</span>
              </div>
            </div>
          </div>
        </div>

        <SessionsTable />
      </div>
    </DashboardLayout>
  )
}
