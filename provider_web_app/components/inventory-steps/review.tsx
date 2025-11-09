export function InventoryReview({ formData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Review Your Information</h2>
        <p className="text-muted-foreground">Please verify all details before completing setup</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Basic Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lot Name:</span>
              <span className="text-foreground font-medium">{formData.name || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description:</span>
              <span className="text-foreground font-medium">{formData.description || "Not provided"}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Location</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address:</span>
              <span className="text-foreground font-medium">{formData.address || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">City, State:</span>
              <span className="text-foreground font-medium">
                {formData.city || "Not provided"}, {formData.state || "Not provided"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coordinates:</span>
              <span className="text-foreground font-medium">
                {formData.latitude || "N/A"}, {formData.longitude || "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Capacity</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Spaces:</span>
              <span className="text-foreground font-medium">{formData.totalSpaces || "0"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Handicap Spaces:</span>
              <span className="text-foreground font-medium">{formData.handicapSpaces || "0"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">EV Chargers:</span>
              <span className="text-foreground font-medium">{formData.evChargers || "0"}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {formData.amenities.length > 0 ? (
              formData.amenities.map((amenity: string) => (
                <span key={amenity} className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                  {amenity}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">No amenities selected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
