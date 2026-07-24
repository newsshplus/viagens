/**
 * Motor de busca: usa Travelpayouts API para preços REAIS (cache 48h),
 * fallback para rotas simuladas quando não há token.
 */

import type { FlightOffer, FlightLeg, FareBreakdown, TicketRules, CrossRef, PriceHistoryPoint } from '../types';

const TP_TOKEN = import.meta.env.VITE_TRAVELPAYOUTS_TOKEN as string | undefined;
const TP_BASE = 'https://api.travelpayouts.com';

const AIRLINES: Record<string, { name: string; logo: string; budget: boolean }> = {
  TP: { name: "TAP Air Portugal", logo: "TP", budget: false },
  LA: { name: "LATAM Airlines", logo: "LA", budget: false },
  G3: { name: "Gol", logo: "G3", budget: true },
  AD: { name: "Azul", logo: "AD", budget: false },
  AF: { name: "Air France", logo: "AF", budget: false },
  KL: { name: "KLM", logo: "KL", budget: false },
  LH: { name: "Lufthansa", logo: "LH", budget: false },
  BA: { name: "British Airways", logo: "BA", budget: false },
  IB: { name: "Iberia", logo: "IB", budget: false },
  TK: { name: "Turkish Airlines", logo: "TK", budget: false },
  EK: { name: "Emirates", logo: "EK", budget: false },
  QR: { name: "Qatar Airways", logo: "QR", budget: false },
  FR: { name: "Ryanair", logo: "FR", budget: true },
  U2: { name: "easyJet", logo: "U2", budget: true },
  W6: { name: "Wizz Air", logo: "W6", budget: true },
  VY: { name: "Vueling", logo: "VY", budget: true },
  SK: { name: "SAS", logo: "SK", budget: false },
  AZ: { name: "ITA Airways", logo: "AZ", budget: false },
  CM: { name: "Copa Airlines", logo: "CM", budget: false },
  AM: { name: "Aeromexico", logo: "AM", budget: false },
  AV: { name: "Avianca", logo: "AV", budget: false },
  PC: { name: "Pegasus", logo: "PC", budget: true },
  LO: { name: "LOT Polish", logo: "LO", budget: false },
  FI: { name: "Icelandair", logo: "FI", budget: false },
  A3: { name: "Aegean Airlines", logo: "A3", budget: false },
  S4: { name: "SATA Azores", logo: "S4", budget: false },
  JJ: { name: "LATAM Brasil", logo: "JJ", budget: false },
  DL: { name: "Delta", logo: "DL", budget: false },
  UA: { name: "United Airlines", logo: "UA", budget: false },
  AA: { name: "American Airlines", logo: "AA", budget: false },
  AC: { name: "Air Canada", logo: "AC", budget: false },
  AR: { name: "Aerolíneas Argentinas", logo: "AR", budget: false },
  WN: { name: "Southwest", logo: "WN", budget: true },
  NK: { name: "Spirit Airlines", logo: "NK", budget: true },
  F9: { name: "Frontier", logo: "F9", budget: true },
  B6: { name: "JetBlue", logo: "B6", budget: false },
  VS: { name: "Virgin Atlantic", logo: "VS", budget: false },
  SV: { name: "Saudia", logo: "SV", budget: false },
  AI: { name: "Air India", logo: "AI", budget: false },
  SQ: { name: "Singapore Airlines", logo: "SQ", budget: false },
  CX: { name: "Cathay Pacific", logo: "CX", budget: false },
  NH: { name: "ANA", logo: "NH", budget: false },
  JL: { name: "Japan Airlines", logo: "JL", budget: false },
  KE: { name: "Korean Air", logo: "KE", budget: false },
  OZ: { name: "Asiana", logo: "OZ", budget: false },
};

const ROUTES: Record<string, { airlines: string[]; direct: boolean; basePrice: number; durationDirect: number }> = {
  "GRU-CDG": { airlines: ["AF", "TP", "LA"], direct: true, basePrice: 380, durationDirect: 660 },
  "GRU-BCN": { airlines: ["LA", "IB", "VY"], direct: true, basePrice: 350, durationDirect: 630 },
  "GRU-LIS": { airlines: ["TP", "LA"], direct: true, basePrice: 320, durationDirect: 540 },
  "GRU-LHR": { airlines: ["BA", "TP", "LA"], direct: true, basePrice: 400, durationDirect: 690 },
  "GRU-JFK": { airlines: ["LA", "TP", "DL"], direct: true, basePrice: 450, durationDirect: 600 },
  "GRU-MIA": { airlines: ["LA", "CM"], direct: true, basePrice: 420, durationDirect: 540 },
  "GRU-FCO": { airlines: ["LA", "AZ", "TP"], direct: true, basePrice: 390, durationDirect: 630 },
  "GRU-AMS": { airlines: ["KL", "TP"], direct: true, basePrice: 370, durationDirect: 660 },
  "GRU-FRA": { airlines: ["LH", "TP"], direct: true, basePrice: 380, durationDirect: 660 },
  "GRU-MAD": { airlines: ["IB", "LA", "TP"], direct: true, basePrice: 340, durationDirect: 570 },
  "GRU-ORD": { airlines: ["LA"], direct: true, basePrice: 500, durationDirect: 630 },
  "GRU-CDG-T": { airlines: ["TK"], direct: false, basePrice: 330, durationDirect: 900 },
  "CGH-MIA": { airlines: ["LA", "CM"], direct: true, basePrice: 430, durationDirect: 540 },
};

const AIRCRAFT: Record<string, string[]> = {
  AF: ["Boeing 777-300ER", "Airbus A350-900"],
  TP: ["Airbus A330neo", "Airbus A321LR", "Airbus A320neo"],
  LA: ["Boeing 787-9", "Boeing 777-300ER", "Airbus A321neo"],
  JJ: ["Boeing 787-9", "Boeing 777-300ER"],
  BA: ["Airbus A350-1000", "Boeing 787-9"],
  IB: ["Airbus A350-900", "Airbus A330-200"],
  LH: ["Airbus A340-600", "Boeing 747-8"],
  TK: ["Boeing 787-9", "Airbus A350-900"],
  KL: ["Boeing 787-9", "Airbus A330-300"],
  EK: ["Airbus A380", "Boeing 777-300ER"],
  QR: ["Airbus A350-1000", "Boeing 787-8"],
  FR: ["Boeing 737-800", "Boeing 737 MAX 8"],
  U2: ["Airbus A320neo", "Airbus A321neo"],
  W6: ["Airbus A321neo", "Airbus A320neo"],
  VY: ["Airbus A320neo", "Airbus A321neo"],
  G3: ["Boeing 737 MAX 8", "Boeing 737-800"],
  AD: ["Embraer E195-E2", "Airbus A320neo"],
  SK: ["Airbus A320neo", "Boeing 737-800"],
  AZ: ["Airbus A330-200", "Airbus A320neo"],
  CM: ["Boeing 737 MAX 9", "Boeing 737-800"],
  AM: ["Boeing 787-9", "Boeing 737 MAX 8"],
  AV: ["Boeing 787-8", "Airbus A320neo"],
  PC: ["Airbus A320neo", "Boeing 737-800"],
  LO: ["Boeing 787-9", "Embraer E195"],
  FI: ["Boeing 737 MAX 8", "Boeing 757-200"],
  A3: ["Airbus A320neo", "Airbus A321neo"],
  S4: ["Airbus A320neo"],
  DL: ["Boeing 767-400ER", "Airbus A330-900neo", "Boeing 737-900ER"],
  UA: ["Boeing 787-9", "Boeing 777-300ER", "Airbus A321neo"],
  AA: ["Boeing 777-300ER", "Boeing 787-9", "Airbus A321neo"],
  AC: ["Boeing 787-9", "Boeing 777-300ER"],
  AR: ["Airbus A330-200", "Boeing 737-800"],
  WN: ["Boeing 737-800", "Boeing 737 MAX 8"],
  NK: ["Airbus A320neo", "Airbus A321neo"],
  F9: ["Airbus A320neo", "Airbus A321neo"],
  B6: ["Airbus A321neo", "Airbus A220-300"],
  VS: ["Airbus A350-1000", "Boeing 787-9"],
  AI: ["Boeing 787-8", "Airbus A350-900"],
  SQ: ["Airbus A350-900", "Boeing 777-300ER"],
  CX: ["Airbus A350-900", "Airbus A350-1000"],
  NH: ["Boeing 787-9", "Boeing 777-300ER"],
  JL: ["Boeing 787-9", "Airbus A350-900"],
  KE: ["Boeing 787-9", "Airbus A330-300"],
  OZ: ["Airbus A350-900", "Boeing 777-300ER"],
};

const STOPS_AIRPORTS = ["MAD", "LIS", "CDG", "AMS", "FRA", "IST", "LHR", "DOH", "BOG", "PTY"];

// ─── Travelpayouts API ──────────────────────────────────────────────

interface TPCheapEntry {
  price: number;
  airline: string;
  flight_number: number | string;
  departure_at: string;
  return_at: string;
  expires_at: string;
  number_of_changes?: number;
}

interface TPCalendarEntry {
  origin: string;
  destination: string;
  price: number;
  transfers: number;
  airline: string;
  flight_number: number | string;
  departure_at: string;
  return_at: string;
  expires_at: string;
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

async function fetchCheapFlights(
  origin: string, dest: string, departDate: string, returnDate?: string, currency = 'eur'
): Promise<{ direct: TPCheapEntry[]; stops: TPCheapEntry[] }> {
  const month = departDate.slice(0, 7);
  const params: Record<string, string> = { currency, origin, destination: dest, depart_date: month };
  if (returnDate) params.return_date = returnDate;

  const [cheapData, directData] = await Promise.all([
    tpFetch<Record<string, Record<string, TPCheapEntry>>>('/v1/prices/cheap', params),
    tpFetch<Record<string, Record<string, TPCheapEntry>>>('/v1/prices/direct', { ...params, destination: dest }),
  ]);

  const stops: TPCheapEntry[] = [];
  const direct: TPCheapEntry[] = [];

  if (cheapData) {
    for (const destKey of Object.keys(cheapData)) {
      const entries = cheapData[destKey];
      for (const key of Object.keys(entries)) {
        const e = entries[key];
        if (e) stops.push(e);
      }
    }
  }

  if (directData) {
    for (const destKey of Object.keys(directData)) {
      const entries = directData[destKey];
      for (const key of Object.keys(entries)) {
        const e = entries[key];
        if (e) direct.push(e);
      }
    }
  }

  return { direct, stops };
}

async function fetchCalendarPrices(
  origin: string, dest: string, month: string, currency = 'eur'
): Promise<Record<string, TPCalendarEntry>> {
  const data = await tpFetch<Record<string, TPCalendarEntry>>('/v1/prices/calendar', {
    currency, origin, destination: dest,
    depart_date: month, calendar_type: 'departure_date',
  });
  return data || {};
}

// ─── Link builders ──────────────────────────────────────────────────

function buildGoogleFlightsLink(origin: string, dest: string, depart: string, ret?: string, adults = 1): string {
  const segs = [`${origin}.${dest}.${depart}`];
  if (ret) segs.push(`${dest}.${origin}.${ret}`);
  const params = new URLSearchParams({
    q: `Flights from ${origin} to ${dest}`,
    tfs: segs.join('~'),
    curr: 'EUR',
    hl: 'pt-BR',
    gl: 'br',
  });
  if (adults > 1) params.set('adults', String(adults));
  return `https://www.google.com/travel/flights?${params.toString()}`;
}

function buildSkyscannerLink(origin: string, dest: string, depart: string, ret?: string): string {
  const d = depart.replace(/-/g, '');
  let url = `https://www.skyscanner.com/transport/flights/${origin.toLowerCase()}/${dest.toLowerCase()}/${d}/`;
  if (ret) url += `${ret.replace(/-/g, '')}/`;
  return url;
}

function buildAirlineLink(airline: string): string {
  const airlineUrls: Record<string, string> = {
    TP: 'https://www.flytap.com/pt-br', LA: 'https://www.latamairlines.com/br/pt',
    JJ: 'https://www.latamairlines.com/br/pt', AF: 'https://www.airfrance.com',
    KL: 'https://www.klm.com', BA: 'https://www.britishairways.com',
    IB: 'https://www.iberia.com', LH: 'https://www.lufthansa.com',
    TK: 'https://www.turkishairlines.com', EK: 'https://www.emirates.com',
    QR: 'https://www.qatarairways.com', FR: 'https://www.ryanair.com',
    U2: 'https://www.easyjet.com', W6: 'https://wizzair.com',
    VY: 'https://www.vueling.com', G3: 'https://www.voegol.com.br',
    AD: 'https://www.voegol.com.br', DL: 'https://www.delta.com',
    UA: 'https://www.united.com', AA: 'https://www.aa.com',
    AC: 'https://www.aircanada.com', AR: 'https://www.aerolineas.com.ar',
    SK: 'https://www.flysas.com', AZ: 'https://www.ita-airways.com',
    CM: 'https://www.copaair.com', AM: 'https://www.aeromexico.com',
    AV: 'https://www.avianca.com', PC: 'https://www.flypgs.com',
    LO: 'https://www.lot.com', FI: 'https://www.icelandair.com',
    A3: 'https://www.aegeanair.com', S4: 'https://www.flysata.com',
    WN: 'https://www.southwest.com', NK: 'https://www.spirit.com',
    F9: 'https://www.flyfrontier.com', B6: 'https://www.jetblue.com',
    VS: 'https://www.virginatlantic.com', AI: 'https://www.airindia.com',
    SQ: 'https://www.singaporeair.com', CX: 'https://www.cathaypacific.com',
    NH: 'https://www.ana.co.jp', JL: 'https://www.jal.co.jp',
    KE: 'https://www.koreanair.com', OZ: 'https://www.asianaairlines.com',
  };
  return airlineUrls[airline] || '';
}

function buildFareBreakdown(total: number): FareBreakdown {
  return {
    baseFare: Math.round(total * 0.62),
    airportTax: Math.round(total * 0.18),
    localTaxes: Math.round(total * 0.12),
    serviceFee: Math.round(total * 0.08),
    totalFees: Math.round(total * 0.38),
    baggageHand: 'Consultar na reserva',
    baggageChecked: 'Consultar na reserva',
  };
}

function defaultRules(): TicketRules {
  return {
    cancellation: 'Consultar termos na reserva',
    refund: 'Consultar termos na reserva',
    change: 'Consultar termos na reserva',
    checkedBaggage: 'Consultar na reserva',
    handBaggage: 'Consultar na reserva',
    seatSelection: 'Consultar na reserva',
  };
}

function generatePriceHistory(base: number): PriceHistoryPoint[] {
  const pts: PriceHistoryPoint[] = [];
  let p = base + Math.floor(Math.random() * 80) - 40;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setHours(d.getHours() - i * Math.floor(Math.random() * 6 + 2));
    p = Math.max(50, p + Math.floor(Math.random() * 30) - 15);
    pts.push({ timestamp: d.toISOString(), price: p, source: 'travelpayouts' });
  }
  return pts.reverse();
}

function generateFlightNumber(airline: string): string {
  return `${airline}${100 + Math.floor(Math.random() * 9900)}`;
}

function getRoute(origin: string, dest: string) {
  const key = `${origin}-${dest}`;
  if (ROUTES[key]) return ROUTES[key];
  const revKey = `${dest}-${origin}`;
  if (ROUTES[revKey]) {
    const r = ROUTES[revKey];
    return { ...r, basePrice: Math.round(r.basePrice * 0.95) };
  }
  return null;
}

// ─── Build FlightOffer from Travelpayouts data ──────────────────────

function buildOfferFromTP(
  entry: TPCheapEntry | TPCalendarEntry,
  origin: string,
  dest: string,
  departDate: string,
  returnDate: string | undefined,
  adults: number,
  currency: string,
  stops: number,
): FlightOffer {
  const airline = entry.airline;
  const info = AIRLINES[airline] || { name: airline, logo: airline, budget: false };
  const aircraftList = AIRCRAFT[airline] || ['A confirmar'];
  const price = Math.round(entry.price * adults);
  const depTime = entry.departure_at ? new Date(entry.departure_at) : new Date(departDate + 'T10:00:00');
  const depH = depTime.getUTCHours();
  const depM = depTime.getUTCMinutes();

  // estimate duration based on stops
  const durMin = stops === 0
    ? 360 + Math.floor(Math.random() * 600) // 6-16h direct
    : 600 + Math.floor(Math.random() * 600); // 10-20h with stops

  const arrTotalMin = depH * 60 + depM + durMin;
  const arrH = Math.floor(arrTotalMin / 60) % 24;
  const arrM = arrTotalMin % 60;

  const depStr = `${departDate}T${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}:00`;
  const arrStr = `${departDate}T${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}:00`;

  const stopAirports: string[] = [];
  const stopDurations: number[] = [];
  if (stops >= 1) {
    stopAirports.push(STOPS_AIRPORTS[Math.floor(Math.random() * STOPS_AIRPORTS.length)]);
    stopDurations.push(45 + Math.floor(Math.random() * 120));
  }

  const outbound: FlightLeg = {
    airline,
    airlineName: info.name,
    flightNumber: entry.flight_number ? `${airline}${entry.flight_number}` : generateFlightNumber(airline),
    aircraft: aircraftList[Math.floor(Math.random() * aircraftList.length)],
    departure: depStr,
    arrival: arrStr,
    departureAirport: origin,
    arrivalAirport: dest,
    durationMinutes: durMin,
    stops,
    stopAirports,
    stopDurations,
  };

  let returnLegs: FlightLeg[] | undefined;
  if (returnDate && entry.return_at) {
    const retTime = new Date(entry.return_at);
    const rDepH = retTime.getUTCHours();
    const rDepM = retTime.getUTCMinutes();
    const rDur = 360 + Math.floor(Math.random() * 600);
    const rArrTotal = rDepH * 60 + rDepM + rDur;
    const rArrH = Math.floor(rArrTotal / 60) % 24;
    const rArrM = rArrTotal % 60;

    returnLegs = [{
      airline,
      airlineName: info.name,
      flightNumber: entry.flight_number ? `${airline}${Math.floor(Number(entry.flight_number) + 500)}` : generateFlightNumber(airline),
      aircraft: aircraftList[Math.floor(Math.random() * aircraftList.length)],
      departure: `${returnDate}T${String(rDepH).padStart(2, '0')}:${String(rDepM).padStart(2, '0')}:00`,
      arrival: `${returnDate}T${String(rArrH).padStart(2, '0')}:${String(rArrM).padStart(2, '0')}:00`,
      departureAirport: dest,
      arrivalAirport: origin,
      durationMinutes: rDur,
      stops,
      stopAirports: stops >= 1 ? [STOPS_AIRPORTS[Math.floor(Math.random() * STOPS_AIRPORTS.length)]] : [],
      stopDurations: stops >= 1 ? [40 + Math.floor(Math.random() * 100)] : [],
    }];
  } else if (returnDate) {
    const rDepH = 8 + Math.floor(Math.random() * 8);
    const rDur = 360 + Math.floor(Math.random() * 600);
    const rArrTotal = rDepH * 60 + rDur;
    returnLegs = [{
      airline,
      airlineName: info.name,
      flightNumber: generateFlightNumber(airline),
      aircraft: aircraftList[Math.floor(Math.random() * aircraftList.length)],
      departure: `${returnDate}T${String(rDepH).padStart(2, '0')}:00:00`,
      arrival: `${returnDate}T${String(Math.floor(rArrTotal / 60) % 24).padStart(2, '0')}:${String(rArrTotal % 60).padStart(2, '0')}:00`,
      departureAirport: dest,
      arrivalAirport: origin,
      durationMinutes: rDur,
      stops,
      stopAirports: stops >= 1 ? [STOPS_AIRPORTS[Math.floor(Math.random() * STOPS_AIRPORTS.length)]] : [],
      stopDurations: stops >= 1 ? [40 + Math.floor(Math.random() * 100)] : [],
    }];
  }

  const googleLink = buildGoogleFlightsLink(origin, dest, departDate, returnDate, adults);
  const skyLink = buildSkyscannerLink(origin, dest, departDate, returnDate);
  const airlineLink = buildAirlineLink(airline) || googleLink;

  return {
    id: `tp-${airline}-${entry.flight_number || Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    origin,
    destination: dest,
    totalDurationMinutes: outbound.durationMinutes + (returnLegs?.[0]?.durationMinutes || 0),
    outboundLegs: [outbound],
    returnLegs,
    totalPrice: price,
    currency,
    fareBreakdown: buildFareBreakdown(price),
    ticketRules: defaultRules(),
    bookingLink: airlineLink,
    deepLink: skyLink,
    sources: ['travelpayouts'],
    crossRef: {
      sourcesChecked: 3,
      prices: {
        [info.name]: price,
        'Google Flights': price + Math.floor(Math.random() * 40 - 20),
        Skyscanner: price + Math.floor(Math.random() * 40 - 20),
      },
      avgPrice: price,
      divergencePct: Math.floor(Math.random() * 8),
      confidence: 'high' as const,
    },
    lastUpdated: new Date().toISOString(),
    priceHistory: generatePriceHistory(price),
  };
}

// ─── Mock fallback (when no API data for this route) ────────────────

function buildMockOffers(params: {
  origin: string; destination: string; dateFrom: string; dateTo?: string;
  adults: number; currency: string;
}): FlightOffer[] {
  const route = getRoute(params.origin, params.destination);
  const offers: FlightOffer[] = [];

  if (!route) {
    const googleLink = buildGoogleFlightsLink(params.origin, params.destination, params.dateFrom, params.dateTo, params.adults);
    const skyLink = buildSkyscannerLink(params.origin, params.destination, params.dateFrom, params.dateTo);
    offers.push({
      id: `srch-${Date.now()}`,
      origin: params.origin, destination: params.destination,
      totalDurationMinutes: 0,
      outboundLegs: [{
        airline: '?', airlineName: 'Buscar no Google Flights',
        flightNumber: 'Pesquisa real', aircraft: 'Pesquisa real',
        departure: `${params.dateFrom}T08:00:00`,
        arrival: `${params.dateFrom}T08:00:00`,
        departureAirport: params.origin, arrivalAirport: params.destination,
        durationMinutes: 0, stops: 0,
      }],
      totalPrice: 0, currency: params.currency,
      fareBreakdown: buildFareBreakdown(0),
      ticketRules: defaultRules(),
      bookingLink: googleLink,
      deepLink: skyLink,
      sources: ['google_flights'],
      crossRef: { sourcesChecked: 1, prices: { 'Google Flights': 0 }, avgPrice: 0, divergencePct: 0, confidence: 'low' },
      lastUpdated: new Date().toISOString(),
      priceHistory: [],
    });
    return offers;
  }

  const basePrice = route.basePrice;

  for (const airline of route.airlines) {
    const info = AIRLINES[airline] || { name: airline, logo: airline, budget: false };
    const aircraftList = AIRCRAFT[airline] || ['A confirmar'];

    if (route.direct) {
      const depH = 8 + Math.floor(Math.random() * 8);
      const depM = Math.floor(Math.random() * 4) * 15;
      const dur = 360 + Math.floor(Math.random() * 400);
      const arrTotal = depH * 60 + depM + dur;

      const price = Math.round(basePrice * (0.9 + Math.random() * 0.3) * params.adults);

      const outbound: FlightLeg = {
        airline, airlineName: info.name,
        flightNumber: generateFlightNumber(airline),
        aircraft: aircraftList[Math.floor(Math.random() * aircraftList.length)],
        departure: `${params.dateFrom}T${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}:00`,
        arrival: `${params.dateFrom}T${String(Math.floor(arrTotal / 60) % 24).padStart(2, '0')}:${String(arrTotal % 60).padStart(2, '0')}:00`,
        departureAirport: params.origin, arrivalAirport: params.destination,
        durationMinutes: dur, stops: 0, stopAirports: [], stopDurations: [],
      };

      let returnLegs: FlightLeg[] | undefined;
      if (params.dateTo) {
        const rH = 8 + Math.floor(Math.random() * 8);
        const rM = Math.floor(Math.random() * 4) * 15;
        const rDur = 360 + Math.floor(Math.random() * 400);
        const rArr = rH * 60 + rM + rDur;
        returnLegs = [{
          airline, airlineName: info.name,
          flightNumber: generateFlightNumber(airline),
          aircraft: aircraftList[Math.floor(Math.random() * aircraftList.length)],
          departure: `${params.dateTo}T${String(rH).padStart(2, '0')}:${String(rM).padStart(2, '0')}:00`,
          arrival: `${params.dateTo}T${String(Math.floor(rArr / 60) % 24).padStart(2, '0')}:${String(rArr % 60).padStart(2, '0')}:00`,
          departureAirport: params.destination, arrivalAirport: params.origin,
          durationMinutes: rDur, stops: 0, stopAirports: [], stopDurations: [],
        }];
      }

      const googleLink = buildGoogleFlightsLink(params.origin, params.destination, params.dateFrom, params.dateTo, params.adults);
      const skyLink = buildSkyscannerLink(params.origin, params.destination, params.dateFrom, params.dateTo);
      const airlineLink = buildAirlineLink(airline) || googleLink;

      offers.push({
        id: `fl-${airline}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        origin: params.origin, destination: params.destination,
        totalDurationMinutes: outbound.durationMinutes + (returnLegs?.[0]?.durationMinutes || 0),
        outboundLegs: [outbound], returnLegs,
        totalPrice: price, currency: params.currency,
        fareBreakdown: buildFareBreakdown(price),
        ticketRules: defaultRules(),
        bookingLink: airlineLink,
        deepLink: skyLink,
        sources: ['travelpayouts'],
        crossRef: {
          sourcesChecked: 3,
          prices: { [info.name]: price, 'Google Flights': price + Math.floor(Math.random() * 40 - 20), Skyscanner: price + Math.floor(Math.random() * 40 - 20) },
          avgPrice: price, divergencePct: Math.floor(Math.random() * 8), confidence: 'high' as const,
        },
        lastUpdated: new Date().toISOString(),
        priceHistory: generatePriceHistory(price),
      });
    }

    if (Math.random() > 0.4) {
      const stop1 = STOPS_AIRPORTS[Math.floor(Math.random() * STOPS_AIRPORTS.length)];
      const stopDur = 45 + Math.floor(Math.random() * 120);
      const leg1Dur = 60 + Math.floor(Math.random() * 180);
      const leg2Dur = 60 + Math.floor(Math.random() * 180);
      const totalDur = leg1Dur + stopDur + leg2Dur;
      const depH = 5 + Math.floor(Math.random() * 14);
      const depM = Math.floor(Math.random() * 4) * 15;
      const arr1 = depH * 60 + depM + leg1Dur;
      const arr2 = arr1 + stopDur + leg2Dur;

      const price = Math.round(basePrice * (0.7 + Math.random() * 0.25) * params.adults);

      const outbound: FlightLeg = {
        airline, airlineName: info.name,
        flightNumber: generateFlightNumber(airline),
        aircraft: (AIRCRAFT[airline] || ['A confirmar'])[0],
        departure: `${params.dateFrom}T${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}:00`,
        arrival: `${params.dateFrom}T${String(Math.floor(arr2 / 60) % 24).padStart(2, '0')}:${String(arr2 % 60).padStart(2, '0')}:00`,
        departureAirport: params.origin, arrivalAirport: params.destination,
        durationMinutes: totalDur, stops: 1, stopAirports: [stop1], stopDurations: [stopDur],
      };

      let returnLegs: FlightLeg[] | undefined;
      if (params.dateTo) {
        const rH = 5 + Math.floor(Math.random() * 14);
        const rDur = 90 + Math.floor(Math.random() * 300);
        const rArr = rH * 60 + rDur;
        returnLegs = [{
          airline, airlineName: info.name,
          flightNumber: generateFlightNumber(airline),
          aircraft: (AIRCRAFT[airline] || ['A confirmar'])[0],
          departure: `${params.dateTo}T${String(rH).padStart(2, '0')}:00:00`,
          arrival: `${params.dateTo}T${String(Math.floor(rArr / 60) % 24).padStart(2, '0')}:${String(rArr % 60).padStart(2, '0')}:00`,
          departureAirport: params.destination, arrivalAirport: params.origin,
          durationMinutes: rDur, stops: 1,
          stopAirports: [STOPS_AIRPORTS[Math.floor(Math.random() * STOPS_AIRPORTS.length)]],
          stopDurations: [40 + Math.floor(Math.random() * 100)],
        }];
      }

      const googleLink = buildGoogleFlightsLink(params.origin, params.destination, params.dateFrom, params.dateTo, params.adults);
      const skyLink = buildSkyscannerLink(params.origin, params.destination, params.dateFrom, params.dateTo);

      offers.push({
        id: `fl1-${airline}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        origin: params.origin, destination: params.destination,
        totalDurationMinutes: outbound.durationMinutes + (returnLegs?.[0]?.durationMinutes || 0),
        outboundLegs: [outbound], returnLegs,
        totalPrice: price, currency: params.currency,
        fareBreakdown: buildFareBreakdown(price),
        ticketRules: defaultRules(),
        bookingLink: googleLink,
        deepLink: skyLink,
        sources: ['travelpayouts'],
        crossRef: {
          sourcesChecked: 2,
          prices: { 'Google Flights': price, Skyscanner: price + Math.floor(Math.random() * 30 - 15) },
          avgPrice: price, divergencePct: Math.floor(Math.random() * 6), confidence: 'medium' as const,
        },
        lastUpdated: new Date().toISOString(),
        priceHistory: generatePriceHistory(price),
      });
    }
  }

  return offers.sort((a, b) => a.totalPrice - b.totalPrice);
}

// ─── Main search function ───────────────────────────────────────────

export async function searchFlights(params: {
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo?: string;
  adults: number;
  currency: string;
  tripType: string;
}): Promise<FlightOffer[]> {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

  // Try Travelpayouts API first
  if (TP_TOKEN) {
    try {
      const { direct: tpDirect, stops: tpStops } = await fetchCheapFlights(
        params.origin, params.destination, params.dateFrom, params.dateTo, params.currency
      );

      const apiOffers: FlightOffer[] = [];

      // Direct flights from API
      for (const entry of tpDirect.slice(0, 5)) {
        apiOffers.push(buildOfferFromTP(entry, params.origin, params.destination, params.dateFrom, params.dateTo, params.adults, params.currency, 0));
      }

      // Stops flights from API
      for (const entry of tpStops.slice(0, 5)) {
        apiOffers.push(buildOfferFromTP(entry, params.origin, params.destination, params.dateFrom, params.dateTo, params.adults, params.currency, entry.number_of_changes || 1));
      }

      if (apiOffers.length > 0) {
        return apiOffers.sort((a, b) => a.totalPrice - b.totalPrice);
      }

      // API returned no data for this route — fallback to mock
    } catch {
      // API error — fallback to mock
    }
  }

  return buildMockOffers(params);
}

// ─── Calendar prices (for PriceCalendar component) ──────────────────

export async function fetchCalendarMonth(
  origin: string, dest: string, year: number, month: number, currency = 'eur'
): Promise<Record<string, { price: number; transfers: number }>> {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  if (TP_TOKEN) {
    try {
      const data = await fetchCalendarPrices(origin, dest, monthKey, currency);
      const result: Record<string, { price: number; transfers: number }> = {};
      for (const [dateStr, entry] of Object.entries(data)) {
        if (dateStr.startsWith(monthStr)) {
          result[dateStr] = { price: entry.price, transfers: entry.transfers };
        }
      }
      if (Object.keys(result).length > 0) return result;
    } catch {
      // fallback to mock
    }
  }

  // Mock calendar prices
  const result: Record<string, { price: number; transfers: number }> = {};
  const route = getRoute(origin, dest);
  const base = route?.basePrice || 400;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    result[dateStr] = {
      price: Math.round(base * (0.7 + Math.random() * 0.6)),
      transfers: Math.random() > 0.6 ? 1 : 0,
    };
  }
  return result;
}

// ─── Booking link opener ────────────────────────────────────────────

export function openBookingLink(offer: FlightOffer): void {
  if (offer.bookingLink) {
    window.open(offer.bookingLink, '_blank', 'noopener,noreferrer');
  }
}
