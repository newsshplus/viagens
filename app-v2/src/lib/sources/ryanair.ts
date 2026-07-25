import type { FlightOffer, FlightLeg } from '../../types';
import type { SourceParams, SourceResult } from './types';

interface RyanairFareEntry {
  day?: number;
  arrivalDate?: string;
  soldOut?: boolean;
  unavailable?: boolean;
  price?: {
    value?: number;
    valueMainUnit?: string;
    valueFractionalUnit?: string;
    currencyCode?: string;
    currencySymbol?: string;
  };
}

interface RyanairFaresResponse {
  fares?: RyanairFareEntry[];
  outbound?: { fares?: RyanairFareEntry[] };
}

function extractPrice(entry: RyanairFareEntry | null | undefined): number | null {
  if (!entry || entry.soldOut || entry.unavailable || !entry.price) return null;
  if (typeof entry.price.value === 'number' && entry.price.value > 0) return entry.price.value;
  const main = Number(entry.price.valueMainUnit);
  const frac = Number(entry.price.valueFractionalUnit || '0');
  if (Number.isFinite(main) && main > 0) return main + frac / 100;
  return null;
}

// A resposta da API publica da Ryanair pode vir em "fares" direto ou dentro
// de "outbound.fares", dependendo da rota/versao - checamos os dois formatos
// e escolhemos a tarifa mais barata disponivel (nao soldOut/unavailable).
function findCheapestFare(data: RyanairFaresResponse | null | undefined): { price: number } | null {
  if (!data) return null;
  const list = data.fares || data.outbound?.fares || [];
  let cheapest: number | null = null;
  for (const entry of list) {
    const p = extractPrice(entry);
    if (p !== null && (cheapest === null || p < cheapest)) cheapest = p;
  }
  return cheapest !== null ? { price: cheapest } : null;
}

function buildLeg(depAirport: string, arrAirport: string, date: string): FlightLeg {
  return {
    airline: 'FR',
    airlineName: 'Ryanair',
    flightNumber: 'A confirmar',
    aircraft: 'Boeing 737',
    departure: `${date}T08:00:00`,
    arrival: `${date}T10:00:00`,
    departureAirport: depAirport,
    arrivalAirport: arrAirport,
    durationMinutes: 120,
    stops: 0,
    stopAirports: [],
    stopDurations: [],
  };
}

export async function searchRyanair(params: SourceParams): Promise<SourceResult> {
  const t0 = Date.now();

  try {
    const qs = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      dateFrom: params.dateFrom,
      currency: params.currency,
    });
    if (params.dateTo) qs.set('dateTo', params.dateTo);

    const resp = await fetch(`/api/flights-ryanair?${qs}`);
    if (!resp.ok) return { source: 'ryanair', offers: [], latencyMs: Date.now() - t0, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    if (data.error) return { source: 'ryanair', offers: [], latencyMs: Date.now() - t0, error: String(data.error).slice(0, 120) };

    const outCheapest = findCheapestFare(data.outbound);
    if (!outCheapest) {
      return { source: 'ryanair', offers: [], latencyMs: Date.now() - t0, error: 'sem tarifa disponivel nessa rota/data' };
    }

    const inCheapest = params.dateTo ? findCheapestFare(data.inbound) : null;

    // A Ryanair devolve o preco por adulto (nao aceita quantidade de
    // passageiros na busca) - multiplicamos pelo numero de adultos, igual
    // fazemos com o Travelpayouts.
    const totalPerAdult = outCheapest.price + (inCheapest?.price || 0);
    const totalPrice = Math.round(totalPerAdult * params.adults);

    const outboundLegs = [buildLeg(params.origin, params.destination, params.dateFrom)];
    const returnLegs = params.dateTo && inCheapest
      ? [buildLeg(params.destination, params.origin, params.dateTo)]
      : undefined;

    const bookingUrl = `https://www.ryanair.com/gb/en/trip/flights/select?adults=${params.adults}&teens=0&children=0&infants=0&dateOut=${params.dateFrom}${params.dateTo ? `&dateIn=${params.dateTo}` : ''}&originIata=${params.origin}&destinationIata=${params.destination}&isConnectedFlight=false&isReturn=${params.dateTo ? 'true' : 'false'}`;

    const offer: FlightOffer = {
      id: `ryanair-${params.origin}-${params.destination}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      origin: params.origin,
      destination: params.destination,
      totalDurationMinutes: outboundLegs[0].durationMinutes + (returnLegs?.[0]?.durationMinutes || 0),
      outboundLegs,
      returnLegs,
      totalPrice,
      currency: params.currency,
      fareBreakdown: {
        baseFare: Math.round(totalPrice * 0.7),
        airportTax: Math.round(totalPrice * 0.15),
        localTaxes: Math.round(totalPrice * 0.1),
        serviceFee: Math.round(totalPrice * 0.05),
        totalFees: Math.round(totalPrice * 0.3),
        baggageHand: '1 bagagem pequena incluída - demais opções pagas',
        baggageChecked: 'Não incluída - consultar no site da Ryanair',
      },
      ticketRules: {
        cancellation: 'Verificar no site da Ryanair',
        refund: 'Verificar no site da Ryanair',
        change: 'Verificar no site da Ryanair',
        checkedBaggage: 'Não incluída por padrão',
        handBaggage: '1 bagagem pequena incluída',
        seatSelection: 'Pago à parte',
      },
      bookingLink: bookingUrl,
      deepLink: bookingUrl,
      sources: ['ryanair'],
      crossRef: {
        sourcesChecked: 1,
        prices: { Ryanair: totalPrice },
        avgPrice: totalPrice,
        divergencePct: 0,
        confidence: 'high',
      },
      lastUpdated: new Date().toISOString(),
      priceHistory: [],
    };

    return { source: 'ryanair', offers: [offer], latencyMs: Date.now() - t0 };
  } catch (err) {
    return { source: 'ryanair', offers: [], latencyMs: Date.now() - t0, error: String(err) };
  }
}
