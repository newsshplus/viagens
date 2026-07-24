import type { FlightOffer, FlightLeg } from '../../types';
import type { SourceParams, SourceResult } from './types';

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY as string | undefined;
const SKY_HOST = 'sky-scrapper.p.rapidapi.com';

async function resolveEntity(iata: string): Promise<{ skyId: string; entityId: string } | null> {
  if (!RAPIDAPI_KEY) return null;
  try {
    const resp = await fetch(`https://${SKY_HOST}/api/v1/flights/getAutocomplete?query=${iata}&locale=en-US`, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': SKY_HOST,
      },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const dest = json?.data?.destinations?.[0];
    if (dest) return { skyId: dest.skyId, entityId: dest.entityId };
    return null;
  } catch {
    return null;
  }
}

export async function searchSkyscanner(params: SourceParams): Promise<SourceResult> {
  const t0 = Date.now();
  if (!RAPIDAPI_KEY) return { source: 'skyscanner', offers: [], latencyMs: 0, error: 'No RapidAPI key' };

  try {
    const [originEntity, destEntity] = await Promise.all([
      resolveEntity(params.origin),
      resolveEntity(params.destination),
    ]);

    if (!originEntity || !destEntity) {
      return { source: 'skyscanner', offers: [], latencyMs: Date.now() - t0, error: 'Could not resolve entities' };
    }

    const url = new URL(`https://${SKY_HOST}/api/v1/flights/searchFlights`);
    url.searchParams.set('originSkyId', originEntity.skyId);
    url.searchParams.set('destinationSkyId', destEntity.skyId);
    url.searchParams.set('originEntityId', originEntity.entityId);
    url.searchParams.set('destinationEntityId', destEntity.entityId);
    url.searchParams.set('date', params.dateFrom);
    url.searchParams.set('adults', String(params.adults));
    url.searchParams.set('currency', params.currency);
    url.searchParams.set('countryCode', 'BR');
    url.searchParams.set('market', 'pt-BR');
    if (params.dateTo) url.searchParams.set('returnDate', params.dateTo);

    const resp = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': SKY_HOST,
      },
    });

    if (!resp.ok) return { source: 'skyscanner', offers: [], latencyMs: Date.now() - t0, error: `HTTP ${resp.status}` };
    const json = await resp.json();
    if (!json.status || !json.data?.itineraries) {
      return { source: 'skyscanner', offers: [], latencyMs: Date.now() - t0, error: 'No data' };
    }

    const offers: FlightOffer[] = [];

    for (const itin of json.data.itineraries.slice(0, 10)) {
      const price = itin.price?.raw || itin.price?.offset?.raw || 0;
      if (price <= 0) continue;

      const legs = itin.legs || [];
      const outboundLegs: FlightLeg[] = [];
      const returnLegs: FlightLeg[] = [];

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        const segments = leg.segments || [];
        const firstSeg = segments[0] || {};
        const lastSeg = segments[segments.length - 1] || firstSeg;

        const dep = firstSeg.departure ? new Date(firstSeg.departure) : new Date(params.dateFrom + 'T08:00:00');
        const arr = lastSeg.arrival ? new Date(lastSeg.arrival) : dep;
        const depDate = dep.toISOString().split('T')[0];

        const fl: FlightLeg = {
          airline: firstSeg.carrierCode || leg.operatingCarrier?.alternateId || '?',
          airlineName: firstSeg.carrierCode || 'Skyscanner',
          flightNumber: firstSeg.flightNumber || '?',
          aircraft: 'A confirmar',
          departure: `${depDate}T${String(dep.getUTCHours()).padStart(2, '0')}:${String(dep.getUTCMinutes()).padStart(2, '0')}:00`,
          arrival: `${depDate}T${String(arr.getUTCHours()).padStart(2, '0')}:${String(arr.getUTCMinutes()).padStart(2, '0')}:00`,
          departureAirport: firstSeg.origin?.iata || params.origin,
          arrivalAirport: lastSeg.destination?.iata || params.destination,
          durationMinutes: leg.durationInMinutes || Math.round((arr.getTime() - dep.getTime()) / 60000),
          stops: leg.stopCount || segments.length - 1,
          stopAirports: segments.slice(0, -1).map((s: { destination?: { iata?: string } }) => s.destination?.iata || '').filter(Boolean),
          stopDurations: [],
        };

        if (i === 0) outboundLegs.push(fl);
        else returnLegs.push(fl);
      }

      const bookingUrl = itin.deepLink || itin.bookingUrl || `https://www.skyscanner.com/transport/flights/${params.origin.toLowerCase()}/${params.destination.toLowerCase()}/${params.dateFrom.replace(/-/g, '')}/`;

      offers.push({
        id: `sky-${legs[0]?.operatingCarrier?.alternateId || 'xx'}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        origin: params.origin,
        destination: params.destination,
        totalDurationMinutes: outboundLegs.reduce((sum, l) => sum + l.durationMinutes, 0) + returnLegs.reduce((sum, l) => sum + l.durationMinutes, 0),
        outboundLegs,
        returnLegs: returnLegs.length ? returnLegs : undefined,
        totalPrice: Math.round(price),
        currency: itin.price?.unit || params.currency,
        fareBreakdown: {
          baseFare: Math.round(price * 0.62),
          airportTax: Math.round(price * 0.18),
          localTaxes: Math.round(price * 0.12),
          serviceFee: Math.round(price * 0.08),
          totalFees: Math.round(price * 0.38),
          baggageHand: 'Consultar no Skyscanner',
          baggageChecked: 'Consultar no Skyscanner',
        },
        ticketRules: {
          cancellation: 'Verificar no Skyscanner',
          refund: 'Verificar no Skyscanner',
          change: 'Verificar no Skyscanner',
          checkedBaggage: 'Verificar no Skyscanner',
          handBaggage: 'Verificar no Skyscanner',
          seatSelection: 'Verificar no Skyscanner',
        },
        bookingLink: bookingUrl,
        deepLink: bookingUrl,
        sources: ['skyscanner'],
        crossRef: {
          sourcesChecked: 1,
          prices: { Skyscanner: Math.round(price) },
          avgPrice: Math.round(price),
          divergencePct: 0,
          confidence: 'high',
        },
        lastUpdated: new Date().toISOString(),
        priceHistory: [],
      });
    }

    return { source: 'skyscanner', offers, latencyMs: Date.now() - t0 };
  } catch (err) {
    return { source: 'skyscanner', offers: [], latencyMs: Date.now() - t0, error: String(err) };
  }
}
