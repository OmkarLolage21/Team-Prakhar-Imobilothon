import { use } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ParkingLotDetail } from "@/components/parking-lot-detail"

export default function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <DashboardLayout>
      <ParkingLotDetail lotId={id} />
    </DashboardLayout>
  )
}
