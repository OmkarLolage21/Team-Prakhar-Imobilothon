"use client"

import { useMemo, useState } from "react"
import { Search, Download, ChevronDown } from "lucide-react"
import { BookingsTable } from "@/components/bookings-table"
import { PaymentsSummary } from "@/components/payments-summary"
import { useBookings } from "@/hooks/use-bookings"

export function BookingsLedger() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dateRange, setDateRange] = useState("7days")
  const { bookings, loading, error } = useBookings(50)

  const filteredBookings = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return bookings.filter((booking) => {
      const customer = (booking.customer || "").toLowerCase()
      const id = (booking.id || "").toLowerCase()
      const email = (booking.email || "").toLowerCase()
      const matchesSearch = customer.includes(term) || id.includes(term) || email.includes(term)
      const matchesStatus = filterStatus === "all" || booking.paymentStatus === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [bookings, searchTerm, filterStatus])

  const handleExport = () => {
    const headers = ["booking_id","customer","email","lot","startDate","endDate","duration","amount","paymentStatus","status"]
    const rows = filteredBookings.map(b => headers.map(h => (b as any)[h] ?? ""))
    const csv = [headers.join(","), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bookings_export_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <PaymentsSummary />

      {/* Filters and Search */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search by customer, booking ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <select aria-label="Payment status filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-8"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <ChevronDown
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"
                size={18}
              />
            </div>

            <div className="relative">
              <select aria-label="Date range filter"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-8"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              <ChevronDown
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"
                size={18}
              />
            </div>

            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition" aria-label="Export bookings CSV">
              <Download size={18} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      {error && <div className="text-destructive">{error}</div>}
      <BookingsTable bookings={loading ? [] : filteredBookings} />
    </div>
  )
}
