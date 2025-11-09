import { ParkingOffer, Vehicle, Booking } from "@/types/parking";

export const mockOffers: ParkingOffer[] = [
  {
    id: "1",
    name: "Central Plaza Garage",
    address: "123 Main St, Downtown",
    distance: 0.3,
    price: 150,
    currency: "₹",
    availability: {
      percentage: 86,
      confidence: 5,
      trend: "stable",
    },
    features: {
      ev: true,
      accessible: true,
      covered: true,
      security: true,
    },
    sla: {
      hasBackup: true,
      guaranteedSpot: false,
    },
    nudge: {
      timeAdjustment: 10,
      successIncrease: 8,
      priceReduction: 10,
    },
    location: {
      lat: 28.6139,
      lng: 77.2090,
    },
    operatingHours: "24/7",
    entranceInfo: "Enter from Main St, first right after traffic light",
    rules: [
      "Maximum 4 hours parking",
      "EV charging available - ₹50/hour",
      "Height limit: 2.1m",
    ],
  },
  {
    id: "2",
    name: "Metro Station Parking",
    address: "45 Station Road",
    distance: 0.5,
    price: 100,
    currency: "₹",
    availability: {
      percentage: 92,
      confidence: 3,
      trend: "rising",
    },
    features: {
      ev: false,
      accessible: true,
      covered: false,
      security: true,
    },
    sla: {
      hasBackup: false,
      guaranteedSpot: true,
    },
    location: {
      lat: 28.6149,
      lng: 77.2100,
    },
    operatingHours: "5:00 AM - 11:00 PM",
    entranceInfo: "Adjacent to metro station exit B",
    rules: [
      "All day parking available",
      "CCTV monitored",
      "Bike parking also available",
    ],
  },
  {
    id: "3",
    name: "Tech Park Underground",
    address: "789 Innovation Drive",
    distance: 0.8,
    price: 180,
    currency: "₹",
    availability: {
      percentage: 64,
      confidence: 8,
      trend: "falling",
    },
    features: {
      ev: true,
      accessible: true,
      covered: true,
      security: true,
    },
    sla: {
      hasBackup: true,
      guaranteedSpot: false,
    },
    nudge: {
      timeAdjustment: -15,
      successIncrease: 12,
      priceReduction: 20,
    },
    location: {
      lat: 28.6129,
      lng: 77.2080,
    },
    operatingHours: "24/7",
    entranceInfo: "Underground entrance, ramp B",
    rules: [
      "Premium parking with valet",
      "Fast EV charging - ₹80/hour",
      "Wash service available",
    ],
  },
  {
    id: "4",
    name: "City Mall Parking",
    address: "56 Commerce Street",
    distance: 1.2,
    price: 120,
    currency: "₹",
    availability: {
      percentage: 78,
      confidence: 6,
      trend: "stable",
    },
    features: {
      ev: true,
      accessible: true,
      covered: true,
      security: true,
    },
    sla: {
      hasBackup: true,
      guaranteedSpot: false,
    },
    location: {
      lat: 28.6119,
      lng: 77.2070,
    },
    operatingHours: "8:00 AM - 10:00 PM",
    entranceInfo: "Mall entrance level 1",
    rules: [
      "Free parking with ₹1000+ purchase",
      "Validation required",
      "Weekend surge pricing",
    ],
  },
];

export const mockVehicles: Vehicle[] = [
  {
    id: "v1",
    plate: "DL 01 AB 1234",
    make: "Tesla",
    model: "Model 3",
    isEV: true,
    needsAccessibility: false,
  },
];

export const mockActiveBooking: Booking = {
  id: "b1",
  offerId: "1",
  offerName: "Central Plaza Garage",
  vehicleId: "v1",
  startTime: new Date(Date.now() + 30 * 60000),
  status: "reserved",
  type: "smart-hold",
  price: 150,
};
