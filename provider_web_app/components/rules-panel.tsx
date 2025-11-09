import { Clock, AlertCircle, Users } from "lucide-react"

export function RulesPanel() {
  const rules = [
    {
      title: "Operating Hours",
      icon: Clock,
      items: ["6 AM - 11 PM", "24/7 on weekends"],
    },
    {
      title: "Restrictions",
      icon: AlertCircle,
      items: ["Max 8 hours per session", "No overnight parking"],
    },
    {
      title: "Capacity Rules",
      icon: Users,
      items: ["Max 150 vehicles", "Reserve 5 handicap spaces"],
    },
  ]

  return (
    <div className="space-y-4">
      {rules.map((rule, idx) => {
        const Icon = rule.icon
        return (
          <div key={idx} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="text-primary" size={20} />
              <h3 className="font-semibold text-foreground">{rule.title}</h3>
            </div>
            <ul className="space-y-2">
              {rule.items.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
