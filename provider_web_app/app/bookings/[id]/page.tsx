import { use } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { BookingDetail } from "@/components/booking-detail";

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <DashboardLayout>
      <BookingDetail id={id} />
    </DashboardLayout>
  );
}
