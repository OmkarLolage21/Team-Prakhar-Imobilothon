"use client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ParkingLotDetail } from "@/components/parking-lot-detail"

export default function LotDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardLayout>
      <ParkingLotDetail lotId={params.id} />
    </DashboardLayout>
  )
}
