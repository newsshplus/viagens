import type { SourceParams, SourceResult } from './types';

export async function searchGoogleFlights(params: SourceParams): Promise<SourceResult> {
  const t0 = Date.now();

  const bookingUrl = `https://www.google.com/travel/flights?q=Flights+from+${params.origin}+to+${params.destination}+on+${params.dateFrom}${params.dateTo ? `+return+${params.dateTo}` : ''}&curr=${params.currency}`;

  return {
    source: 'google_flights',
    offers: [],
    latencyMs: Date.now() - t0,
    error: 'Google Flights unavailable via API - use booking link',
  };
}
