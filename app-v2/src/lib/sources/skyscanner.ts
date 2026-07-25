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

// Cache local: um código IATA sempre resolve pro mesmo skyId/entityId - não
// precisa gastar cota da RapidAPI perguntando de novo a cada busca. Cache
// não expira (aeroportos praticamente nunca mudam de código).
const ENTITY_CACHE_KEY = 'viagens_skyscanner_entity_cache_v1';

function loadEntityCache(): Record<string, { skyId: string; entityId: string }> {
  try {
    const raw = localStorage.getItem(ENTITY_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveEntityToCache(iata: string, entity: { skyId: string; entityId: string }) {
  try {
    const cache = loadEntityCache();
    cache[iata] = entity;
    localStorage.setItem(ENTITY_CACHE_KEY, JSON.stringify(cache));
  } catch { /* não crítico */ }
}

async function resolveEntity(iata: string): Promise<{ skyId: string; entityId: string } | { error: string } | null> {
  const cached = loadEntityCache()[iata];
  if (cached) return cached;

  try {
    const resp = await fetch(`/api/flights-skyscanner?action=searchAirport&query=${iata}`);
    if (!resp.ok) return { error: `HTTP ${resp.status}` };
    const data = await resp.json();
    if (data?.message) return { error: String(data.message).slice(0, 120) };
    if (!data?.data?.length) return { error: 'sem resultado pro aeroporto' };
    const match = data.data.find((a: { navigation: { relevantFlightParams: { skyId: string; flightPlaceType: string } } }) =>
      a.navigation.relevantFlightParams.flightPlaceType === 'AIRPORT' &&
      a.navigation.relevantFlightParams.skyId === iata
    ) || data.data[0];
    const entity = { skyId: match.navigation.relevantFlightParams.skyId, entityId: match.navigation.entityId };
    saveEntityToCache(iata, entity);
    return entity;
  } catch (err) { return { error: String(err).slice(0, 120) }; }
}

async function searchFlightsWithPolling(params: Record<string, string>): Promise<{ itineraries: SkyItinerary[]; error?: string }> {
  const allItineraries: SkyItinerary[] = [];
  const maxPolls = 3; // cada poll consome 1 requisição da cota gratuita da RapidAPI
  let sessionId: string | undefined;

  for (let attempt = 0; attempt < maxPolls; attempt++) {
    const searchParams = new URLSearchParams(params);
    if (sessionId) searchParams.set('sessionId', sessionId);
    searchParams.set('action', 'searchFlights');

    const resp = await fetch(`/api/flights-skyscanner?${searchParams}`);
    if (!resp.ok) return { itineraries: allItineraries, error: `HTTP ${resp.status}` };
    const result = await resp.json();
    if (result?.message) return { itineraries: allItineraries, error: String(result.message).slice(0, 120) };
    if (!result?.data?.itineraries) break;

    allItineraries.push(...result.data.itineraries);
    if (result.data.context?.status === 'complete') break;
    if (result.data.context?.sessionId) {
      sessionId = result.data.context.sessionId;
    } else break;
    await new Promise(r => setTimeout(r, 2000));
  }

  return { itineraries: allItineraries };
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

  const bookingUrl = `https://www.skyscanner.com/transport/flights/${params.origin.toLowerCase()}/${params.destination.toLowerCase()}/${params.dateFrom.replace(/-/g, '')}/${params.dateTo ? `${params.dateTo.replace(/-/g, '')}/` : ''}`;

  return {
    id: `sky-${legs[0]?.carriers?.marketing?.[0]?.alternateId || 'xx'}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    origin: params.origin, destination: params.destination,
    totalDurationMinutes: outboundLegs.reduce((sum, l) => sum + l.durationMinutes, 0) + returnLegs.reduce((sum, l) => sum + l.durationMinutes, 0),
    outboundLegs,
    returnLegs: returnLegs.length ? returnLegs : undefined,
    // A API ja recebe "adults" na busca e devolve o preco total pra esse
    // grupo de passageiros - nao multiplicar de novo (senao dobra o preco
    // quando ha mais de 1 adulto).
    totalPrice: price,
    currency: params.currency,
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
      prices: { Skyscanner: price },
      avgPrice: price,
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

    if (!originEntity || 'error' in originEntity) {
      return { source: 'skyscanner', offers: [], latencyMs: Date.now() - t0, error: `Origem (${params.origin}): ${originEntity && 'error' in originEntity ? originEntity.error : 'falha'}` };
    }
    if (!destEntity || 'error' in destEntity) {
      return { source: 'skyscanner', offers: [], latencyMs: Date.now() - t0, error: `Destino (${params.destination}): ${destEntity && 'error' in destEntity ? destEntity.error : 'falha'}` };
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

    const { itineraries, error: pollError } = await searchFlightsWithPolling(searchParams);
    const offers = itineraries.slice(0, 10).map(itin => buildOffer(itin, params)).filter((o): o is FlightOffer => o !== null);

    return { source: 'skyscanner', offers, latencyMs: Date.now() - t0, error: offers.length === 0 ? pollError : undefined };
  } catch (err) {
    return { source: 'skyscanner', offers: [], latencyMs: Date.now() - t0, error: String(err) };
  }
}
