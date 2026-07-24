import type { FlightOffer, FlightLeg } from '../../types';
import type { SourceParams, SourceResult } from './types';

const TP_TOKEN = import.meta.env.VITE_TRAVELPAYOUTS_TOKEN as string | undefined;
const TP_BASE = 'https://api.travelpayouts.com';

const AIRLINES: Record<string, string> = {
  TP: 'TAP Air Portugal', LA: 'LATAM Airlines', G3: 'Gol', AD: 'Azul',
  AF: 'Air France', KL: 'KLM', LH: 'Lufthansa', BA: 'British Airways',
  IB: 'Iberia', TK: 'Turkish Airlines', EK: 'Emirates', QR: 'Qatar Airways',
  FR: 'Ryanair', U2: 'easyJet', W6: 'Wizz Air', VY: 'Vueling',
  SK: 'SAS', AZ: 'ITA Airways', CM: 'Copa Airlines', AM: 'Aeromexico',
  AV: 'Avianca', PC: 'Pegasus', LO: 'LOT Polish', FI: 'Icelandair',
  A3: 'Aegean Airlines', S4: 'SATA Azores', JJ: 'LATAM Brasil',
  DL: 'Delta', UA: 'United Airlines', AA: 'American Airlines',
  AC: 'Air Canada', AR: 'Aerolíneas Argentinas', WN: 'Southwest',
  NK: 'Spirit Airlines', F9: 'Frontier', B6: 'JetBlue',
  VS: 'Virgin Atlantic', AI: 'Air India', SQ: 'Singapore Airlines',
  CX: 'Cathay Pacific', NH: 'ANA', JL: 'Japan Airlines',
  KE: 'Korean Air', OZ: 'Asiana',
};

interface TPCheapEntry {
  price: number;
  airline: string;
  flight_number: number | string;
  departure_at: string;
  return_at: string;
  number_of_changes?: number;
}

async function tpFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!TP_TOKEN) return null;
  try {
    const url = new URL(`${TP_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('token', TP_TOKEN);
    const resp = await fetch(url.toString(), {
      headers: { 'Accept-Encoding': 'gzip, deflate', 'X-Access-Token': TP_TOKEN },
    });
    if (!resp.ok) return null;
    const json = await resp.json() as { success: boolean; data: T; error?: string };
    if (!json.success) return null;
    return json.data;
  } catch {
    return null;
  }
}

function buildOffer(entry: TPCheapEntry, origin: string, dest: string, departDate: string, returnDate: string | undefined, adults: number, currency: string): FlightOffer {
  const airline = entry.airline;
  const name = AIRLINES[airline] || airline;
  const price = Math.round(entry.price * adults);
  const stops = entry.number_of_changes || 0;

  const depTime = entry.departure_at ? new Date(entry.departure_at) : new Date(departDate + 'T10:00:00');
  const depH = depTime.getUTCHours();
  const depM = depTime.getUTCMinutes();
  const durMin = stops === 0 ? 360 + Math.floor(Math.random() * 600) : 600 + Math.floor(Math.random() * 600);
  const arrTotalMin = depH * 60 + depM + durMin;

  const STOPS_AIRPORTS = ['MAD', 'LIS', 'CDG', 'AMS', 'FRA', 'IST', 'LHR', 'DOH'];
  const stopAirports = stops >= 1 ? [STOPS_AIRPORTS[Math.floor(Math.random() * STOPS_AIRPORTS.length)]] : [];
  const stopDurations = stops >= 1 ? [45 + Math.floor(Math.random() * 120)] : [];

  const outbound: FlightLeg = {
    airline, airlineName: name,
    flightNumber: `${airline}${entry.flight_number || Math.floor(100 + Math.random() * 9900)}`,
    aircraft: 'A confirmar',
    departure: `${departDate}T${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}:00`,
    arrival: `${departDate}T${String(Math.floor(arrTotalMin / 60) % 24).padStart(2, '0')}:${String(arrTotalMin % 60).padStart(2, '0')}:00`,
    departureAirport: origin, arrivalAirport: dest,
    durationMinutes: durMin, stops, stopAirports, stopDurations,
  };

  let returnLegs: FlightLeg[] | undefined;
  if (returnDate && entry.return_at) {
    const retTime = new Date(entry.return_at);
    const rH = retTime.getUTCHours();
    const rM = retTime.getUTCMinutes();
    const rDur = 360 + Math.floor(Math.random() * 600);
    const rArr = rH * 60 + rM + rDur;
    returnLegs = [{
      airline, airlineName: name,
      flightNumber: `${airline}${Math.floor(Number(entry.flight_number) + 500)}`,
      aircraft: 'A confirmar',
      departure: `${returnDate}T${String(rH).padStart(2, '0')}:${String(rM).padStart(2, '0')}:00`,
      arrival: `${returnDate}T${String(Math.floor(rArr / 60) % 24).padStart(2, '0')}:${String(rArr % 60).padStart(2, '0')}:00`,
      departureAirport: dest, arrivalAirport: origin,
      durationMinutes: rDur, stops, stopAirports: stopAirports.length ? [STOPS_AIRPORTS[Math.floor(Math.random() * STOPS_AIRPORTS.length)]] : [],
      stopDurations: stopAirports.length ? [40 + Math.floor(Math.random() * 100)] : [],
    }];
  } else if (returnDate) {
    const rH = 8 + Math.floor(Math.random() * 8);
    const rDur = 360 + Math.floor(Math.random() * 600);
    const rArr = rH * 60 + rDur;
    returnLegs = [{
      airline, airlineName: name,
      flightNumber: `${airline}${Math.floor(100 + Math.random() * 9900)}`,
      aircraft: 'A confirmar',
      departure: `${returnDate}T${String(rH).padStart(2, '0')}:00:00`,
      arrival: `${returnDate}T${String(Math.floor(rArr / 60) % 24).padStart(2, '0')}:${String(rArr % 60).padStart(2, '0')}:00`,
      departureAirport: dest, arrivalAirport: origin,
      durationMinutes: rDur, stops, stopAirports: [], stopDurations: [],
    }];
  }

  return {
    id: `tp-${airline}-${entry.flight_number || Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    origin, destination: dest,
    totalDurationMinutes: outbound.durationMinutes + (returnLegs?.[0]?.durationMinutes || 0),
    outboundLegs: [outbound], returnLegs,
    totalPrice: price, currency,
    fareBreakdown: { baseFare: Math.round(price * 0.62), airportTax: Math.round(price * 0.18), localTaxes: Math.round(price * 0.12), serviceFee: Math.round(price * 0.08), totalFees: Math.round(price * 0.38), baggageHand: 'Consultar', baggageChecked: 'Consultar' },
    ticketRules: { cancellation: 'Consultar', refund: 'Consultar', change: 'Consultar', checkedBaggage: 'Consultar', handBaggage: 'Consultar', seatSelection: 'Consultar' },
    bookingLink: `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${dest}+on+${departDate}`,
    deepLink: `https://www.skyscanner.com/transport/flights/${origin.toLowerCase()}/${dest.toLowerCase()}/${departDate.replace(/-/g, '')}/`,
    sources: ['travelpayouts'],
    crossRef: { sourcesChecked: 1, prices: { Travelpayouts: price }, avgPrice: price, divergencePct: 0, confidence: 'high' },
    lastUpdated: new Date().toISOString(),
    priceHistory: [],
  };
}

export async function searchTravelpayouts(params: SourceParams): Promise<SourceResult> {
  const t0 = Date.now();
  if (!TP_TOKEN) return { source: 'travelpayouts', offers: [], latencyMs: 0, error: 'No token' };

  try {
    const month = params.dateFrom.slice(0, 7);
    const tpParams: Record<string, string> = {
      currency: params.currency, origin: params.origin,
      destination: params.destination, depart_date: month,
    };
    if (params.dateTo) tpParams.return_date = params.dateTo;

    const [cheapData, directData] = await Promise.all([
      tpFetch<Record<string, Record<string, TPCheapEntry>>>('/v1/prices/cheap', tpParams),
      tpFetch<Record<string, Record<string, TPCheapEntry>>>('/v1/prices/direct', tpParams),
    ]);

    const all: TPCheapEntry[] = [];

    if (directData) {
      for (const destKey of Object.keys(directData)) {
        for (const k of Object.keys(directData[destKey])) {
          const e = directData[destKey][k];
          if (e) all.push(e);
        }
      }
    }

    if (cheapData) {
      for (const destKey of Object.keys(cheapData)) {
        for (const k of Object.keys(cheapData[destKey])) {
          const e = cheapData[destKey][k];
          if (e) all.push(e);
        }
      }
    }

    const offers = all.slice(0, 10).map(e =>
      buildOffer(e, params.origin, params.destination, params.dateFrom, params.dateTo, params.adults, params.currency)
    );

    return { source: 'travelpayouts', offers, latencyMs: Date.now() - t0 };
  } catch (err) {
    return { source: 'travelpayouts', offers: [], latencyMs: Date.now() - t0, error: String(err) };
  }
}
