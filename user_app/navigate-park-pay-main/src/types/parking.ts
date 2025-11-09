export interface ParkingOffer {
  id: string;
  name: string;
  address: string;
  distance: number;
  price: number;
  currency: string;
  availability: {
    percentage: number;
    confidence: number;
    trend: 'stable' | 'rising' | 'falling';
  };
  features: {
    ev: boolean;
    accessible: boolean;
    covered: boolean;
    security: boolean;
  };
  sla: {
    hasBackup: boolean;
    guaranteedSpot: boolean;
  };
  nudge?: {
    timeAdjustment: number;
    successIncrease: number;
    priceReduction: number;
  };
  location: {
    lat: number;
    lng: number;
  };
  operatingHours: string;
  entranceInfo: string;
  rules: string[];
}

export interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  isEV: boolean;
  needsAccessibility: boolean;
}

export interface Booking {
  id: string;
  offerId: string;
  offerName: string;
  vehicleId: string;
  startTime: Date;
  endTime?: Date;
  status: 'reserved' | 'active' | 'completed' | 'cancelled';
  type: 'guaranteed' | 'smart-hold';
  price: number;
  bayInfo?: string;
  swapHistory?: {
    timestamp: Date;
    reason: string;
    newOfferId: string;
    newOfferName: string;
  }[];
}

export interface Session {
  bookingId: string;
  startTime: Date;
  estimatedEnd: Date;
  currentCost: number;
  isOverstay: boolean;
  graceMinutesRemaining?: number;
}
