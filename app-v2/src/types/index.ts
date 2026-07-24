export interface Airport {
  iata: string;
  city: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

export interface FlightLeg {
  airline: string;
  airlineName: string;
  flightNumber: string;
  aircraft: string;
  departure: string;
  arrival: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  durationMinutes: number;
  stops: number;
  stopAirports?: string[];
  stopDurations?: number[];
  operatingCarrier?: string;
}

export interface FareBreakdown {
  baseFare: number;
  airportTax: number;
  localTaxes: number;
  serviceFee: number;
  baggageHand: string;
  baggageChecked: string;
  totalFees: number;
}

export interface TicketRules {
  cancellation: string;
  refund: string;
  change: string;
  checkedBaggage: string;
  handBaggage: string;
  seatSelection: string;
}

export interface PriceHistoryPoint {
  timestamp: string;
  price: number;
  source: string;
}

export interface FlightOffer {
  id: string;
  origin: string;
  destination: string;
  totalDurationMinutes: number;
  outboundLegs: FlightLeg[];
  returnLegs?: FlightLeg[];
  totalPrice: number;
  currency: string;
  fareBreakdown: FareBreakdown;
  ticketRules: TicketRules;
  bookingLink: string;
  sources: string[];
  crossRef: CrossRef;
  deepLink?: string;
  lastUpdated: string;
  priceHistory: PriceHistoryPoint[];
  promoTag?: PromoTag;
}

export interface CrossRef {
  sourcesChecked: number;
  prices: Record<string, number>;
  avgPrice: number;
  divergencePct: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface PromoTag {
  text: string;
  color: 'green' | 'yellow' | 'red' | 'blue';
  icon: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo?: string;
  adults: number;
  children: number;
  infants: number;
  currency: string;
  tripType: 'roundtrip' | 'oneway';
  directOnly: boolean;
}

export interface Monitor {
  id: string;
  params: SearchParams;
  targetPrice: number;
  lastPrice?: number;
  lastChecked?: string;
  active: boolean;
  created: string;
  alerts: MonitorAlert[];
}

export interface MonitorAlert {
  timestamp: string;
  price: number;
  message: string;
}

export interface SearchConfig {
  anonymousMode: boolean;
  preferredRegions: string[];
  scanNightMode: boolean;
  scanNightStart: number;
  scanNightEnd: number;
  randomIntervalMin: number;
  randomIntervalMax: number;
}
