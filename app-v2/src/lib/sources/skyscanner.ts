import type { FlightOffer, FlightLeg } from '../../types';
import type { SourceParams, SourceResult } from './types';

interface SkyFlightLeg {
  id: string;
  origin: { id: string; name: string; displayCode: string; city: string; country: string };
  destination: { id: string; name: string; displayCode: string; city: string; country: string };
  durationInMinutes: number;
  stopCount: number;
  departure: string;
  arrival: string;
  carriers: { marketing: Array<{ id: number; alternateId: string; name: string }> };
  segments: Array<{
    origin: { displayCode: string; name: string };
    destination: { displayCode: string; name: string };
    departure: string;
    arrival: string;
    durationInMinutes: number;
    flightNumber: string;
    marketingCarrier: { displayCode: string; name: string };
  }>;
}

interface SkyItinerary {
  id: string;
  price: { raw: number; formatted: string };
  legs: SkyFlightLeg[];
}

async function resolveEntity(iata: string): Promise<{ skyId: string; entityId: string } | null> {
  try {
    const resp = await fetch(`/api/flights-skyscanner?action=searchAirport&query=${iata}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data?.data?.length) return null;
    const match = data.data.find((a: { navigation: { relevantFlightParams: { skyId: string; flightPlaceType: string } } }) =>
      a.navigation.relevantFlightParams.flightPlaceType === 'AIRPORT' &&
      a.navigation.relevantFlightParams.skyId === iata
    ) || data.data[0];
    return { skyId: match.navigation.relevantFlightParams.skyId, entityId: match.navigation.entityId };
  } catch { return null; }
}

async function searchFlightsWithPolling(params: Record<string, string>): Promise<SkyItinerary[]> {
  const allItineraries: SkyItinerary[] = [];
  let maxPolls = 5;
  let sessionId: string | undefined;

  for (let attempt = 0; attempt < maxPolls; attempt++) {
    const searchParams = new URLSearchParams(params);
    if (sessionId) searchParams.set('sessionId', sessionId);
    searchParams.set('action', 'searchFlights');

    const resp = await fetch(`/api/flights-skyscanner?${searchParams}`);
    if (!resp.ok) break;
    const result = await resp.json();
    if (!result?.data?.itineraries) break;

    allItineraries.push(...result.data.itineraries);
    if (result.data.context?.status === 'complete') break;
    if (result.data.context?.sessionId) {
      sessionId = result.data.context.sessionId;
    } else break;
    await new Promise(r => setTimeout(r, 2000));
  }

  return allItineraries;
}

function buildOffer(itin: SkyItinerary, params: SourceParams): FlightOffer | null {
  const legs = itin.legs || [];
  if (legs.length === 0) return null;
  const price = Math.round(itin.price?.raw || 0);
  if (price <= 0) return null;

  const outboundLegs: FlightLeg[] = [];
  const returnLegs: FlightLeg[] = [];

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const segments = leg.segments || [];
    const firstSeg = segments[0] || {};
    const marketing = leg.carriers?.marketing?.[0];
    const airlineCode = marketing?.alternateId || firstSeg.marketingCarrier?.displayCode || '?';
    const airlineName = marketing?.name || firstSeg.marketingCarrier?.name || 'Skyscanner';

    const fl: FlightLeg = {
      airline: airlineCode, airlineName,
      flightNumber: firstSeg.flightNumber ? `${airlineCode}${firstSeg.flightNumber}` : '?',
      aircraft: 'A confirmar',
      departure: leg.departure || `${params.dateFrom}T08:00:00`,
      arrival: leg.arrival || leg.departure || `${params.dateFrom}T08:00:00`,
      departureAirport: leg.origin?.displayCode || params.origin,
      arrivalAirport: leg.destination?.displayCode || params.destination,
      durationMinutes: leg.durationInMinutes || 120,
      stops: leg.stopCount || 0,
      stopAirports: segments.length > 1
        ? segments.slice(0, -1).map((s: { destination?: { displayCode?: string } }) => s.destination?.displayCode || '').filter(Boolean)
        : [],
      stopDurations: [],
    };

    if (i === 0) outboundLegs.push(fl);
    else returnLegs.push(fl);
  }

  const bookingUrl = `https://www.skyscanner.com/transport/flights/${params.origin.toLowerCase()}/${params.destination.toLowerCase()}/${params.dateFrom.replace(/-/g, '')}/`;

  return {
    id: `sky-${legs[0]?.carriers?.marketing?.[0]?.alternateId || 'xx'}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    origin: params.origin, destination: params.destination,
    totalDurationMinutes: outboundLegs.reduce((sum, l) => sum + l.durationMinutes, 0) + returnLegs.reduce((sum, l) => sum + l.durationMinutes, 0),
    outboundLegs,
    returnLegs: returnLegs.length ? returnLegs : undefined,
    totalPrice: price * params.adults,
    currency: params.currency,
    fareBreakdown: {
      baseFare: Math.round(price * params.adults * 0.62),
      airportTax: Math.round(price * params.adults * 0.18),
      localTaxes: Math.round(price * params.adults * 0.12),
      serviceFee: Math.round(price * params.adults * 0.08),
      totalFees: Math.round(price * params.adults * 0.38),
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
      prices: { Skyscanner: price * params.adults },
      avgPrice: price * params.adults,
      divergencePct: 0, confidence: 'high',
    },
    lastUpdated: new Date().toISOString(),
    priceHistory: [],
  };
}

export async function searchSkyscanner(params: SourceParams): Promise<SourceResult> {
  const t0 = Date.now();

  try {
    const [originEntity, destEntity] = await Promise.all([
      resolveEntity(params.origin),
      resolveEntity(params.destination),
    ]);

    if (!originEntity || !destEntity) {
      return { source: 'skyscanner', offers: [], latencyMs: Date.now() - t0, error: 'Could not resolve entities' };
    }

    const searchParams: Record<string, string> = {
      originSkyId: originEntity.skyId,
      destinationSkyId: destEntity.skyId,
      originEntityId: originEntity.entityId,
      destinationEntityId: destEntity.entityId,
      date: params.dateFrom,
      adults: String(params.adults),
      currency: params.currency,
    };
    if (params.dateTo) searchParams.returnDate = params.dateTo;

    const itineraries = await searchFlightsWithPolling(searchParams);
    const offers = itineraries.slice(0, 10).map(itin => buildOffer(itin, params)).filter((o): o is FlightOffer => o !== null);

    return { source: 'skyscanner', offers, latencyMs: Date.now() - t0 };
  } catch (err) {
    return { source: 'skyscanner', offers: [], latencyMs: Date.now() - t0, error: String(err) };
  }
}
