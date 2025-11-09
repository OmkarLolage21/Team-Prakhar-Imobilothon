"use client"

import { ChevronRight, AlertCircle, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"

interface BookingsTableProps {
  bookings: any[]
}

export function BookingsTable({ bookings }: BookingsTableProps) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Booking ID</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Customer</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Location</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Duration</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Amount</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Payment</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b border-border hover:bg-muted/50 transition">
                <td className="py-3 px-4">
                  <p className="font-semibold text-foreground">{booking.id}</p>
                </td>
                <td className="py-3 px-4">
                  <div>
                    <p className="font-semibold text-foreground">{booking.customer}</p>
                    <p className="text-xs text-muted-foreground">{booking.email}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-foreground">{booking.lot}</td>
                <td className="py-3 px-4 text-foreground">{booking.duration}</td>
                <td className="py-3 px-4 font-semibold text-chart-1">{booking.amount}</td>
                <td className="py-3 px-4">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    {booking.paymentMethod}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {booking.paymentStatus === "paid" ? (
                      <>
                        <CheckCircle size={16} className="text-chart-1" />
                        <span className="text-chart-1 font-medium">Paid</span>
                      </>
                    ) : booking.paymentStatus === "pending" ? (
                      <>
                        <Clock size={16} className="text-chart-4" />
                        <span className="text-chart-4 font-medium">Pending</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} className="text-destructive" />
                        <span className="text-destructive font-medium">Failed</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Link href={`/bookings/${booking.id}`} aria-label={`View booking ${booking.id}`} className="inline-flex p-1 hover:bg-muted rounded transition text-foreground">
                    <ChevronRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
