"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { InventoryWizard } from "@/components/inventory-wizard"
import { InventoryLotsList } from "@/components/inventory-lots-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function InventoryPage() {
  const [showWizard, setShowWizard] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground mt-1">Add and manage your parking lots</p>
          </div>
          <Button onClick={() => setShowWizard(!showWizard)} className="gap-2">
            <Plus className="w-4 h-4" />
            {showWizard ? "View Lots" : "Add New Lot"}
          </Button>
        </div>

        {showWizard ? <InventoryWizard /> : <InventoryLotsList />}
      </div>
    </DashboardLayout>
  )
}
