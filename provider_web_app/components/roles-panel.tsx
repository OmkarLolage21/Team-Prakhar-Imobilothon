import { Shield, Lock, Eye } from "lucide-react"

export function RolesPanel() {
  const roles = [
    {
      name: "Admin",
      icon: Shield,
      permissions: ["Full access", "Manage team", "View analytics", "Configure settings"],
      color: "text-destructive",
    },
    {
      name: "Manager",
      icon: Lock,
      permissions: ["View all data", "Manage bookings", "View analytics", "Limited settings"],
      color: "text-chart-4",
    },
    {
      name: "Operator",
      icon: Eye,
      permissions: ["View sessions", "Process payments", "Basic reports"],
      color: "text-chart-2",
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Roles & Permissions</h2>
      {roles.map((role) => {
        const Icon = role.icon
        return (
          <div key={role.name} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={role.color} size={20} />
              <h3 className="font-semibold text-foreground">{role.name}</h3>
            </div>
            <ul className="space-y-2">
              {role.permissions.map((perm, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {perm}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
