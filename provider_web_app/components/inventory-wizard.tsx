"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { ChevronRight, ChevronLeft, MapPin, Settings, Check } from "lucide-react"
import { InventoryBasicInfo } from "@/components/inventory-steps/basic-info"
import { InventoryLocation } from "@/components/inventory-steps/location"
import { InventoryCapacity } from "@/components/inventory-steps/capacity"
import { InventoryAmenities } from "@/components/inventory-steps/amenities"
import { InventoryReview } from "@/components/inventory-steps/review"

export function InventoryWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    latitude: "",
    longitude: "",
    totalSpaces: "",
    handicapSpaces: "",
    evChargers: "",
    amenities: [] as string[],
  })
  const router = useRouter()

  const steps = [
    { title: "Basic Info", icon: Settings },
    { title: "Location", icon: MapPin },
    { title: "Capacity", icon: Settings },
    { title: "Amenities", icon: Settings },
    { title: "Review", icon: Check },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // If no lat/lng provided, geocode using geocode.xyz
    let lat = formData.latitude ? Number(formData.latitude) : undefined
    let lng = formData.longitude ? Number(formData.longitude) : undefined
    const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`.trim()
    if ((!lat || !lng) && fullAddress) {
      try {
        const res = await fetch(`https://geocode.xyz?locate=${encodeURIComponent(fullAddress)}&json=1`)
        if (res.ok) {
          const data = await res.json()
          const plat = parseFloat(data.latt)
          const plng = parseFloat(data.longt)
          if (!Number.isNaN(plat) && !Number.isNaN(plng)) {
            lat = plat
            lng = plng
          }
        }
      } catch (_) {
        // ignore geocode failure; backend will accept undefined and UI can edit later
      }
    }

    const payload = {
      name: formData.name,
      address: fullAddress,
      latitude: lat,
      longitude: lng,
      totalSpaces: Number(formData.totalSpaces || 0),
      handicapSpaces: Number(formData.handicapSpaces || 0),
      evChargers: Number(formData.evChargers || 0),
      amenities: formData.amenities || [],
    }
    try {
      const res = await api.createLot(payload)
      alert(`Inventory added successfully! Lot ID: ${res.id}`)
      setCurrentStep(0)
      setFormData({
        name: "",
        description: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        latitude: "",
        longitude: "",
        totalSpaces: "",
        handicapSpaces: "",
        evChargers: "",
        amenities: [],
      })
      // Navigate back to inventory to see the new lot
      router.push("/inventory")
    } catch (e: any) {
      alert(`Failed to create lot: ${e.message || e}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = idx === currentStep
            const isCompleted = idx < currentStep

            return (
              <div key={idx} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                        ? "border-chart-1 bg-chart-1 text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded transition ${isCompleted ? "bg-chart-1" : "bg-border"}`} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-sm">
          {steps.map((step, idx) => (
            <span
              key={idx}
              className={`${idx === currentStep ? "text-primary font-semibold" : "text-muted-foreground"}`}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-card rounded-lg border border-border p-8 mb-8">
        {currentStep === 0 && <InventoryBasicInfo formData={formData} onChange={handleInputChange} />}
        {currentStep === 1 && <InventoryLocation formData={formData} onChange={handleInputChange} />}
        {currentStep === 2 && <InventoryCapacity formData={formData} onChange={handleInputChange} />}
        {currentStep === 3 && <InventoryAmenities formData={formData} onChange={handleInputChange} />}
        {currentStep === 4 && <InventoryReview formData={formData} />}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-6 py-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        {currentStep === steps.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
          >
            Complete Setup
            <Check size={20} />
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
          >
            Next
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  )
}
