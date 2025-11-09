"use client"

export function InventoryCapacity({ formData, onChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Capacity & Features</h2>
        <p className="text-muted-foreground">How many spaces does your lot have?</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Total Parking Spaces</label>
          <input
            type="number"
            value={formData.totalSpaces}
            onChange={(e) => onChange("totalSpaces", e.target.value)}
            placeholder="150"
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Handicap Accessible Spaces</label>
          <input
            type="number"
            value={formData.handicapSpaces}
            onChange={(e) => onChange("handicapSpaces", e.target.value)}
            placeholder="5"
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">EV Charging Stations</label>
          <input
            type="number"
            value={formData.evChargers}
            onChange={(e) => onChange("evChargers", e.target.value)}
            placeholder="10"
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  )
}
