"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { PricingRulesManager } from "@/components/pricing-rules-manager"

export default function PricingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pricing & Rules</h1>
          <p className="text-muted-foreground mt-1">Configure pricing tiers and parking rules</p>
        </div>
        <PricingRulesManager />
      </div>
    </DashboardLayout>
  )
}
