import type { FlightOffer, FlightLeg } from '../../types';
import type { SourceParams, SourceResult } from './types';

interface RyanairFareEntry {
  day?: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  soldOut?: boolean;
  unavailable?: boolean;
  price?: {
    value?: number;
    valueMainUnit?: string;
    valueFractionalUnit?: string;
    currencyCode?: string;
    currencySymbol?: string;
  } | null;
}

interface RyanairLegResponse {
  fares?: RyanairFareEntry[];
  maxFare?: RyanairFareEntry | null;
  minFare?: RyanairFareEntry | null;
}

// Estrutura real confirmada em teste ao vivo: a resposta vem aninhada como
// { outbound: { outbound: { fares: [...], minFare: {...} } } } - a API da
// Ryanair ja devolve tudo dentro de um objeto "outbound" (mesmo pra busca de
// volta, ja que cada chamada e sempre um trecho one-way), e nossa function
// no servidor embrulha isso de novo em { outbound, inbound }.
interface RyanairFaresResponse {
  outbound?: RyanairLegResponse;
}

function extractPrice(entry: RyanairFareEntry | null | undefined): number | null {
  if (!entry || entry.soldOut || entry.unavailable || !entry.price) return null;
  if (typeof entry.price.value === 'number' && entry.price.value > 0) return entry.price.value;
  const main = Number(entry.price.valueMainUnit);
  const frac = Number(entry.price.valueFractionalUnit || '0');
  if (Number.isFinite(main) && main > 0) return main + frac / 100;
  return null;
}

function findCheapestFare(data: RyanairFaresResponse | null | undefined): RyanairFareEntry | null {
  const leg = data?.outbound;
  if (!leg) return null;

  if (leg.minFare && extractPrice(leg.minFare) !== null) return leg.minFare;

  const list = leg.fares || [];
  let cheapest: RyanairFareEntry | null = null;
  let cheapestPrice = Infinity;
  for (const entry of list) {
    const p = extractPrice(entry);
    if (p !== null && p < cheapestPrice) {
      cheapestPrice = p;
      cheapest = entry;
    }
  }
  return cheapest;
}

function buildLeg(depAirport: string, arrAirport: string, fallbackDate: string, fare: RyanairFareEntry | null): FlightLeg {
  const departure = fare?.departureDate || `${fallbackDate}T08:00:00`;
  const arrival = fare?.arrivalDate || `${fallbackDate}T10:00:00`;
  const depTime = new Date(departure);
  const arrTime = new Date(arrival);
  const durationMinutes = Number.isFinite(depTime.getTime()) && Number.isFinite(arrTime.getTime())
    ? Math.max(30, Math.round((arrTime.getTime() - depTime.getTime()) / 60000))
    : 120;

  return {
    airline: 'FR',
    airlineName: 'Ryanair',
    flightNumber: 'A confirmar',
    aircraft: 'Boeing 737',
    departure,
    arrival,
    departureAirport: depAirport,
    arrivalAirport: arrAirport,
    durationMinutes,
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
    const outPrice = extractPrice(outCheapest);
    if (outCheapest === null || outPrice === null) {
      return { source: 'ryanair', offers: [], latencyMs: Date.now() - t0, error: 'sem tarifa disponivel nessa rota/data' };
    }

    const inCheapest = params.dateTo ? findCheapestFare(data.inbound) : null;
    const inPrice = inCheapest ? extractPrice(inCheapest) : null;

    if (params.dateTo && inPrice === null) {
      return { source: 'ryanair', offers: [], latencyMs: Date.now() - t0, error: `sem voo Ryanair de volta em ${params.dateTo}` };
    }

    // A Ryanair devolve o preco por adulto (nao aceita quantidade de
    // passageiros na busca) - multiplicamos pelo numero de adultos, igual
    // fazemos com o Travelpayouts.
    const totalPerAdult = outPrice + (inPrice || 0);
    const totalPrice = Math.round(totalPerAdult * params.adults);

    const outboundLegs = [buildLeg(params.origin, params.destination, params.dateFrom, outCheapest)];
    const returnLegs = params.dateTo
      ? [buildLeg(params.destination, params.origin, params.dateTo, inCheapest)]
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
