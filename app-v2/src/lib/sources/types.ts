import type { FlightOffer } from '../../types';

export interface SourceParams {
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo?: string;
  adults: number;
  currency: string;
}

export type SourceName = 'travelpayouts' | 'google_flights' | 'skyscanner';

export interface SourceResult {
  source: SourceName;
  offers: FlightOffer[];
  latencyMs: number;
  error?: string;
}
