export function SessionsTable() {
  const sessions = [
    { id: "S001", customer: "user1", lot: "Lot A", duration: "2h 34m", amount: "$12.50", status: "Active" },
    { id: "S002", customer: "user2", lot: "Lot B", duration: "1h 15m", amount: "$6.25", status: "Active" },
    { id: "S003", customer: "user3", lot: "Lot C", duration: "45m", amount: "$3.75", status: "Completed" },
    { id: "S004", customer: "user4", lot: "Lot A", duration: "3h 22m", amount: "$16.75", status: "Active" },
    { id: "S005", customer: "user5", lot: "Lot B", duration: "30m", amount: "$2.50", status: "Completed" },
  ]

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Recent Sessions</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Session ID</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Customer</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Lot</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Duration</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Amount</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-border hover:bg-muted/50 transition">
                <td className="py-3 px-4 text-foreground font-medium">{session.id}</td>
                <td className="py-3 px-4 text-foreground">{session.customer}</td>
                <td className="py-3 px-4 text-foreground">{session.lot}</td>
                <td className="py-3 px-4 text-foreground">{session.duration}</td>
                <td className="py-3 px-4 text-foreground font-semibold">{session.amount}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      session.status === "Active" ? "bg-chart-1/20 text-chart-1" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {session.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
