import { TrendingUp, Users, DollarSign, AlertCircle } from "lucide-react"

export function KPICards() {
  const kpis = [
    {
      label: "Total Revenue",
      value: "$24,580",
      change: "+12.5%",
      icon: DollarSign,
      color: "text-chart-1",
    },
    {
      label: "Active Sessions",
      value: "342",
      change: "+8.2%",
      icon: Users,
      color: "text-chart-2",
    },
    {
      label: "Occupancy Rate",
      value: "87%",
      change: "+3.1%",
      icon: TrendingUp,
      color: "text-chart-3",
    },
    {
      label: "Alerts",
      value: "5",
      change: "-2 from yesterday",
      icon: AlertCircle,
      color: "text-chart-4",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div key={kpi.label} className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-chart-1 mt-2">{kpi.change}</p>
              </div>
              <Icon className={`${kpi.color} opacity-80`} size={24} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
