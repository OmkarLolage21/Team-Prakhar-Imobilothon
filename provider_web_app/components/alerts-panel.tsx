import { AlertCircle, AlertTriangle, Info } from "lucide-react"

export function AlertsPanel() {
  const alerts = [
    {
      type: "critical",
      title: "High Occupancy",
      message: "Lot A is at 95% capacity",
      icon: AlertCircle,
    },
    {
      type: "warning",
      title: "Payment Failed",
      message: "3 sessions have pending payments",
      icon: AlertTriangle,
    },
    {
      type: "info",
      title: "Maintenance Scheduled",
      message: "Lot B maintenance at 2 PM",
      icon: Info,
    },
  ]

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Active Alerts</h2>
      <div className="space-y-3">
        {alerts.map((alert, idx) => {
          const Icon = alert.icon
          const bgColor =
            alert.type === "critical"
              ? "bg-destructive/10"
              : alert.type === "warning"
                ? "bg-chart-4/10"
                : "bg-chart-2/10"
          const textColor =
            alert.type === "critical" ? "text-destructive" : alert.type === "warning" ? "text-chart-4" : "text-chart-2"

          return (
            <div key={idx} className={`${bgColor} rounded-lg p-3 flex gap-3`}>
              <Icon className={`${textColor} flex-shrink-0`} size={18} />
              <div className="flex-1 min-w-0">
                <p className={`${textColor} font-medium text-sm`}>{alert.title}</p>
                <p className="text-muted-foreground text-xs">{alert.message}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
