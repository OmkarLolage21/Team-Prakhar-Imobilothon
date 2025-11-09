"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useLots } from "@/hooks/use-lots"

interface ParkingLot {
  id: string
  name: string
  location: string
  capacity: number
  occupancy: number
  amenities: string[]
}

const mockLots: ParkingLot[] = []

export function InventoryLotsList() {
  const { lots, loading, error } = useLots()
  const data: ParkingLot[] = (lots && lots.length
    ? lots
    : mockLots) as unknown as ParkingLot[]
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Your Parking Lots</h2>
        <p className="text-muted-foreground">Click on a lot to view details and manage parking spots</p>
      </div>

      {error && <div className="text-destructive">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(loading ? [] : data).map((lot) => {
          const occupancyRate = Math.round((lot.occupancy / lot.capacity) * 100)
          const availableSpots = lot.capacity - lot.occupancy

          return (
            <Link key={lot.id} href={`/lots/${lot.id}`}>
              <Card className="p-6 hover:shadow-lg hover:border-primary transition-all cursor-pointer h-full">
                <div className="space-y-4">
                  {/* Header */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{lot.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4" />
                      {lot.location}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Capacity</p>
                      <p className="text-lg font-bold text-foreground">{lot.capacity}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Occupied</p>
                      <p className="text-lg font-bold text-red-600">{lot.occupancy}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Available</p>
                      <p className="text-lg font-bold text-green-600">{availableSpots}</p>
                    </div>
                  </div>

                  {/* Occupancy Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Occupancy</span>
                      <span className="text-sm font-bold text-foreground">{occupancyRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          occupancyRate > 80 ? "bg-red-500" : occupancyRate > 50 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {(lot.amenities || []).map((amenity) => (
                        <span key={amenity} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* View Details Link */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium text-primary hover:underline">View Details →</p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
