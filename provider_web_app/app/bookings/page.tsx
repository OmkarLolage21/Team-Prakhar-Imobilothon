"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { BookingsLedger } from "@/components/bookings-ledger"

export default function BookingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bookings & Payments</h1>
          <p className="text-muted-foreground mt-1">View all bookings and payment transactions</p>
        </div>
        <BookingsLedger />
      </div>
    </DashboardLayout>
  )
}
