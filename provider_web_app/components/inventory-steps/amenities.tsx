"use client"

export function InventoryAmenities({ formData, onChange }: any) {
  const amenityOptions = [
    { id: "lighting", label: "24/7 Lighting" },
    { id: "security", label: "Security Cameras" },
    { id: "covered", label: "Covered Parking" },
    { id: "valet", label: "Valet Service" },
    { id: "carwash", label: "Car Wash" },
    { id: "wifi", label: "WiFi" },
    { id: "restrooms", label: "Restrooms" },
    { id: "restaurant", label: "Restaurant Nearby" },
  ]

  const toggleAmenity = (id: string) => {
    const updated = formData.amenities.includes(id)
      ? formData.amenities.filter((a: string) => a !== id)
      : [...formData.amenities, id]
    onChange("amenities", updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Amenities</h2>
        <p className="text-muted-foreground">What amenities does your lot offer?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {amenityOptions.map((amenity) => (
          <button
            key={amenity.id}
            onClick={() => toggleAmenity(amenity.id)}
            className={`p-4 rounded-lg border-2 transition text-left ${
              formData.amenities.includes(amenity.id)
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span className="font-medium">{amenity.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
