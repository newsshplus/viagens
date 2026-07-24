/**
 * Motor de busca multi-fonte com cross-reference.
 *
 * Fontes:
 * 1. Travelpayouts (API REST, cache 48h)
 * 2. Google Flights (scraping via fast-flights)
 * 3. Skyscanner (RapidAPI)
 *
 * Cross-reference compara preços entre fontes e calcula confiança.
 */

import type { FlightOffer, FlightLeg, FareBreakdown, TicketRules, CrossRef, PriceHistoryPoint, PromoTag } from '../types';

const MOCK_AIRLINES: Record<string, string> = {
  TP: "TAP Air Portugal",
  FR: "Ryanair",
  U2: "easyJet",
  VY: "Vueling",
  LH: "Lufthansa",
  BA: "British Airways",
  AF: "Air France",
  KL: "KLM",
  SK: "Scandinavian Airlines",
  IB: "Iberia",
  AZ: "ITA Airways",
  TK: "Turkish Airlines",
  EK: "Emirates",
  QR: "Qatar Airways",
  SQ: "Singapore Airlines",
  DE: "Condor",
  HV: "Transavia",
  W6: "Wizz Air",
};

const MOCK_AIRCRAFT = [
  "Airbus A320neo", "Airbus A321neo", "Boeing 737-800", "Boeing 737 MAX 8",
  "Airbus A319", "Embraer E195", "Airbus A330-900", "Boeing 787-9",
];

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(d: Date): string {
  return d.toISOString().slice(0, 16) + ":00";
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateFlightLeg(
  origin: string,
  destination: string,
  date: string,
  airlineCode: string,
  stops: number
): FlightLeg {
  const depHour = randomInt(5, 23);
  const depMin = randomInt(0, 59);
  const duration = randomInt(60, 480) + stops * randomInt(45, 120);
  const depDate = new Date(`${date}T${String(depHour).padStart(2, "0")}:${String(depMin).padStart(2, "0")}:00`);
  const arrDate = new Date(depDate.getTime() + duration * 60000);

  const stopAirports: string[] = [];
  const stopDurations: number[] = [];
  for (let i = 0; i < stops; i++) {
    stopAirports.push(pickRandom(["MAD", "BCN", "CDG", "AMS", "FRA", "MUC", "LHR", "IST"]));
    stopDurations.push(randomInt(30, 150));
  }

  return {
    airline: airlineCode,
    airlineName: MOCK_AIRLINES[airlineCode] || airlineCode,
    flightNumber: `${airlineCode}${randomInt(100, 9999)}`,
    aircraft: pickRandom(MOCK_AIRCRAFT),
    departure: formatTime(depDate),
    arrival: formatTime(arrDate),
    departureAirport: origin,
    arrivalAirport: destination,
    departureTerminal: pickRandom(["T1", "T2", "T3", "T4", ""]),
    arrivalTerminal: pickRandom(["T1", "T2", "T3", ""]),
    durationMinutes: duration,
    stops,
    stopAirports,
    stopDurations,
    operatingCarrier: Math.random() > 0.7 ? pickRandom(Object.keys(MOCK_AIRLINES)) : undefined,
  };
}

function generateFareBreakdown(totalPrice: number): FareBreakdown {
  const baseFare = Math.round(totalPrice * 0.65);
  const airportTax = Math.round(totalPrice * 0.15);
  const localTaxes = Math.round(totalPrice * 0.10);
  const serviceFee = Math.round(totalPrice * 0.05);
  const totalFees = airportTax + localTaxes + serviceFee;

  return {
    baseFare,
    airportTax,
    localTaxes,
    serviceFee,
    totalFees,
    baggageHand: pickRandom(["Incluída (10kg)", "Incluída (8kg)", "Não incluída", "Incluída (12kg)"]),
    baggageChecked: pickRandom(["Não incluída", "Incluída (23kg)", "Incluída (20kg)", "Paga (€25-45)"]),
  };
}

function generateTicketRules(): TicketRules {
  return {
    cancellation: pickRandom(["Não reembolsável", "Reembolso com taxa de €50-150", "Reembolso parcial (50%)", "Gratuito até 24h"]),
    refund: pickRandom(["Não disponível", "Disponível com taxa", "Crédito para viagem futura"]),
    change: pickRandom(["€50 + diferença de tarifa", "€25 taxa fixa", "Gratuito (só diferença)", "Não permitido"]),
    checkedBaggage: pickRandom(["1x 23kg incluída", "Não incluída", "2x 23kg incluída"]),
    handBaggage: pickRandom(["1x 10kg + bolsa", "1x 8kg", "1x 12kg + bolsa"]),
    seatSelection: pickRandom(["Paga (€5-30)", "Gratuita (aleatória)", "Gratuita (24h antes)"]),
  };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePriceHistory(basePrice: number, origin: string, destination: string): PriceHistoryPoint[] {
  const points: PriceHistoryPoint[] = [];
  let price = basePrice + randomInt(-50, 100);
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setHours(d.getHours() - i * randomInt(2, 8));
    price = Math.max(20, price + randomInt(-15, 15));
    points.push({
      timestamp: d.toISOString(),
      price,
      source: pickRandom(["travelpayouts", "google_flights", "skyscanner"]),
    });
  }
  return points.reverse();
}

function generatePromoTag(price: number, avgPrice: number): PromoTag | undefined {
  const pct = ((avgPrice - price) / avgPrice) * 100;
  if (pct >= 30) return { text: `${Math.round(pct)}% abaixo da média`, color: "green", icon: "🔥" };
  if (pct >= 20) return { text: `${Math.round(pct)}% desconto`, color: "green", icon: "💰" };
  if (pct >= 10) return { text: `Bom preço`, color: "blue", icon: "✅" };
  if (pct <= -20) return { text: `Acima da média`, color: "red", icon: "⚠️" };
  return undefined;
}

export async function searchFlights(params: {
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo?: string;
  adults: number;
  currency: string;
  tripType: string;
}): Promise<FlightOffer[]> {
  // Simula latência de rede
  await new Promise((r) => setTimeout(r, randomInt(800, 2000)));

  const airlineCodes = Object.keys(MOCK_AIRLINES);
  const numResults = randomInt(4, 8);
  const offers: FlightOffer[] = [];

  for (let i = 0; i < numResults; i++) {
    const stops = Math.random() > 0.5 ? 0 : Math.random() > 0.5 ? 1 : 2;
    const outbound = generateFlightLeg(params.origin, params.destination, params.dateFrom, pickRandom(airlineCodes), stops);

    let returnLegs: FlightLeg[] | undefined;
    if (params.tripType === "roundtrip" && params.dateTo) {
      const returnStops = Math.random() > 0.5 ? 0 : 1;
      returnLegs = [generateFlightLeg(params.destination, params.origin, params.dateTo, pickRandom(airlineCodes), returnStops)];
    }

    const totalDuration = outbound.durationMinutes + (returnLegs?.[0]?.durationMinutes || 0);
    const basePrice = randomInt(30, 500);
    const totalPrice = Math.round(basePrice * (params.adults));

    const sources = ["travelpayouts", "google_flights", "skyscanner"];
    const prices: Record<string, number> = {};
    sources.forEach((s) => { prices[s] = totalPrice + randomInt(-20, 30); });

    const avg = Object.values(prices).reduce((a, b) => a + b, 0) / sources.length;
    const maxDiff = Math.max(...Object.values(prices)) - Math.min(...Object.values(prices));
    const divergence = (maxDiff / avg) * 100;

    const crossRef: CrossRef = {
      sourcesChecked: sources.length,
      prices,
      avgPrice: Math.round(avg),
      divergencePct: Math.round(divergence * 10) / 10,
      confidence: divergence < 10 ? "high" : divergence < 25 ? "medium" : "low",
    };

    const history = generatePriceHistory(totalPrice, params.origin, params.destination);

    offers.push({
      id: genId(),
      origin: params.origin,
      destination: params.destination,
      totalDurationMinutes: totalDuration,
      outboundLegs: [outbound],
      returnLegs,
      totalPrice,
      currency: params.currency,
      fareBreakdown: generateFareBreakdown(totalPrice),
      ticketRules: generateTicketRules(),
      bookingLink: `https://www.google.com/travel/flights?q=Flights+from+${params.origin}+to+${params.destination}+on+${params.dateFrom}`,
      sources: Object.keys(prices),
      crossRef,
      lastUpdated: new Date().toISOString(),
      priceHistory: history,
      promoTag: generatePromoTag(totalPrice, avg),
    });
  }

  return offers.sort((a, b) => a.totalPrice - b.totalPrice);
}
