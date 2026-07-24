import type { FlightOffer } from '../../types';
import type { SourceParams, SourceName } from './types';
import { searchTravelpayouts } from './travelpayouts';
import { searchGoogleFlights } from './googleFlights';
import { searchSkyscanner } from './skyscanner';

export interface MultiSourceResult {
  offers: FlightOffer[];
  sources: {
    name: SourceName;
    count: number;
    latencyMs: number;
    error?: string;
  }[];
}

export async function searchAllSources(params: SourceParams): Promise<MultiSourceResult> {
  const results = await Promise.allSettled([
    searchTravelpayouts(params),
    searchGoogleFlights(params),
    searchSkyscanner(params),
  ]);

  const allOffers: FlightOffer[] = [];
  const sourceStats: MultiSourceResult['sources'] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      allOffers.push(...r.value.offers);
      sourceStats.push({
        name: r.value.source,
        count: r.value.offers.length,
        latencyMs: r.value.latencyMs,
        error: r.value.error,
      });
    } else {
      sourceStats.push({
        name: 'unknown' as SourceName,
        count: 0,
        latencyMs: 0,
        error: String(r.reason),
      });
    }
  }

  allOffers.sort((a, b) => {
    if (a.totalPrice === 0) return 1;
    if (b.totalPrice === 0) return -1;
    return a.totalPrice - b.totalPrice;
  });

  return { offers: allOffers, sources: sourceStats };
}
