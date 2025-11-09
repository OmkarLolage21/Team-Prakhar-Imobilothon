"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { PricingTierForm } from "@/components/pricing-tier-form"
import { RulesPanel } from "@/components/rules-panel"

type Tier = { id: number; name: string; rate: number; duration: string; description: string }
type FormData = { name: string; rate: string; duration: string; description: string }

export function PricingRulesManager() {
  const [pricingTiers, setPricingTiers] = useState<Tier[]>([
    { id: 1, name: "Hourly", rate: 5.0, duration: "per hour", description: "Standard hourly rate" },
    { id: 2, name: "Daily", rate: 25.0, duration: "per day", description: "Full day parking" },
    { id: 3, name: "Monthly", rate: 300.0, duration: "per month", description: "Monthly pass" },
  ])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FormData>({ name: "", rate: "", duration: "", description: "" })

  const handleAddTier = () => {
    setEditingId(null)
    setFormData({ name: "", rate: "", duration: "", description: "" })
    setShowForm(true)
  }

  const handleEditTier = (tier: Tier) => {
    setEditingId(tier.id)
    setFormData({ name: tier.name, rate: String(tier.rate), duration: tier.duration, description: tier.description })
    setShowForm(true)
  }

  const handleSaveTier = () => {
    const cleaned: Tier = {
      id: editingId ?? Date.now(),
      name: formData.name,
      rate: Number.parseFloat(formData.rate) || 0,
      duration: formData.duration,
      description: formData.description,
    }
    if (editingId) {
      setPricingTiers(pricingTiers.map((t) => (t.id === editingId ? cleaned : t)))
    } else {
      setPricingTiers([...pricingTiers, cleaned])
    }
    setShowForm(false)
  }

  const handleDeleteTier = (id: number) => {
    setPricingTiers(pricingTiers.filter((t) => t.id !== id))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pricing Tiers */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Pricing Tiers</h2>
            <button
              onClick={handleAddTier}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              <Plus size={18} />
              Add Tier
            </button>
          </div>

          {showForm && (
            <PricingTierForm
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveTier}
              onCancel={() => setShowForm(false)}
            />
          )}

          <div className="space-y-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                  <p className="text-lg font-bold text-chart-1 mt-1">
                    ${tier.rate.toFixed(2)} <span className="text-sm text-muted-foreground">{tier.duration}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    aria-label="Edit pricing tier"
                    onClick={() => handleEditTier(tier)}
                    className="p-2 hover:bg-muted rounded-lg transition text-foreground"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    aria-label="Delete pricing tier"
                    onClick={() => handleDeleteTier(tier.id)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition text-destructive"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discount Rules */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Discount Rules</h2>
          <div className="space-y-3">
            {[
              { condition: "Loyalty Program", discount: "10%", description: "For repeat customers" },
              { condition: "Group Booking", discount: "15%", description: "5+ spaces booked" },
              { condition: "Off-Peak Hours", discount: "20%", description: "Before 9 AM or after 6 PM" },
            ].map((rule, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <h3 className="font-semibold text-foreground">{rule.condition}</h3>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-chart-2">{rule.discount}</p>
                  <button className="text-xs text-primary hover:underline mt-1">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rules Panel */}
      <RulesPanel />
    </div>
  )
}
