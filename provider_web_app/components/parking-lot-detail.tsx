"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"

export function ParkingLotDetail({ lotId }: { lotId: string }) {
  const [lot, setLot] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getLotDetail(lotId)
        if (alive) setLot(data)
      } catch (e: any) {
        if (alive) setError(e.message || "Failed to load lot")
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [lotId])

  const occupiedSpots = useMemo(() => (lot?.slots || []).filter((s: any) => s.occupied).length, [lot])
  const capacity = lot?.capacity || 0
  const availableSpots = Math.max(0, capacity - occupiedSpots)
  const occupancyRate = capacity ? Math.round((occupiedSpots / capacity) * 100) : 0

  if (loading) return <div className="p-6">Loading lot...</div>
  if (error) return <div className="p-6 text-destructive">{error}</div>
  if (!lot) return <div className="p-6">Not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{lot.name}</h1>
          <p className="text-muted-foreground mt-1">{lot.location}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Capacity</p>
          <p className="text-2xl font-bold text-foreground mt-1">{capacity}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Occupied</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{occupiedSpots}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{availableSpots}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Occupancy Rate</p>
          <p className="text-2xl font-bold text-foreground mt-1">{occupancyRate}%</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Parking Spots</h2>
        <div className="grid grid-cols-10 gap-2">
          {(lot?.slots || []).map((spot: any) => (
            <div
              key={spot.slot_id}
              className={`aspect-square rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                spot.occupied
                  ? "bg-red-100 border-red-400 hover:bg-red-200"
                  : "bg-green-100 border-green-400 hover:bg-green-200"
              }`}
              title={`Spot ${spot.slot_id}${spot.occupied ? " - Occupied" : " - Available"}`}
            >
              <div className="text-center">
                <p className="text-[10px] font-semibold text-foreground truncate max-w-[60px]">{spot.slot_id.split("_").pop()}</p>
                {spot.occupied && <div className="text-lg mt-1">🚗</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-900">Legend</p>
            <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100 border-2 border-green-400 rounded"></div>
                <span>Available Spot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-100 border-2 border-red-400 rounded flex items-center justify-center text-xs">
                  🚗
                </div>
                <span>Occupied Spot</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
