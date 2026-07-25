import type { FlightOffer, FlightLeg } from '../../types';
import type { SourceParams, SourceResult } from './types';

interface GFResult {
  price: number;
  currency: string;
  duration: number;
  stops: number;
  primary_airline: string;
  legs: Array<{
    airline: string;
    flight_number: string;
    departure_airport: string;
    arrival_airport: string;
    departure_datetime: string;
    arrival_datetime: string;
    duration: number;
    layovers?: Array<{ airport: string; duration: number }>;
    primary_airline_name?: string;
    aircraft?: string;
  }>;
  booking_url: string;
}

// Quando a API nao devolve um link de compra especifico daquela oferta
// (booking_url vazio), NAO cai pra home do Google Flights em branco - monta
// uma busca real pre-preenchida (origem, destino, datas, passageiros) usando
// o parametro de busca em linguagem natural que o Google Flights processa de
// verdade, pra abrir direto nos resultados da rota buscada.
function buildFallbackLink(origin: string, destination: string, dateFrom: string, dateTo: string | undefined, adults: number): string {
  let q = `Flights from ${origin} to ${destination} on ${dateFrom}`;
  if (dateTo) q += ` through ${dateTo}`;
  const params = new URLSearchParams({ q, hl: 'pt-BR', gl: 'br' });
  if (adults > 1) params.set('adults', String(adults));
  return `https://www.google.com/travel/flights?${params.toString()}`;
}

export async function searchGoogleFlights(params: SourceParams): Promise<SourceResult> {
  const t0 = Date.now();

  try {
    const qs = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      dateFrom: params.dateFrom,
      adults: String(params.adults),
      currency: params.currency,
    });
    if (params.dateTo) qs.set('dateTo', params.dateTo);

    const resp = await fetch(`/api/flights-google?${qs}`);
    if (!resp.ok) return { source: 'google_flights', offers: [], latencyMs: Date.now() - t0, error: `HTTP ${resp.status}` };
    const data = await resp.json();

    if (data.error) return { source: 'google_flights', offers: [], latencyMs: Date.now() - t0, error: data.error };
    if (!data.offers?.length) return { source: 'google_flights', offers: [], latencyMs: Date.now() - t0 };

    const offers: FlightOffer[] = [];

    for (const r of data.offers as GFResult[]) {
      const outboundLegs: FlightLeg[] = [];
      const returnLegs: FlightLeg[] = [];

      for (let i = 0; i < r.legs.length; i++) {
        const leg = r.legs[i];
        const depDate = leg.departure_datetime?.split('T')[0] || params.dateFrom;
        const depTime = leg.departure_datetime?.split('T')[1]?.slice(0, 5) || '08:00';
        const arrTime = leg.arrival_datetime?.split('T')[1]?.slice(0, 5) || '10:00';
        const arrDate = leg.arrival_datetime?.split('T')[0] || depDate;

        const fl: FlightLeg = {
          airline: leg.airline,
          airlineName: leg.primary_airline_name || leg.airline,
          flightNumber: leg.flight_number,
          aircraft: leg.aircraft || 'A confirmar',
          departure: `${depDate}T${depTime}:00`,
          arrival: `${arrDate}T${arrTime}:00`,
          departureAirport: leg.departure_airport,
          arrivalAirport: leg.arrival_airport,
          durationMinutes: leg.duration,
          stops: leg.layovers?.length || 0,
          stopAirports: leg.layovers?.map(l => l.airport) || [],
          stopDurations: leg.layovers?.map(l => l.duration) || [],
        };

        if (i === 0) outboundLegs.push(fl);
        else returnLegs.push(fl);
      }

      const price = Math.round(r.price * params.adults);
      const realDepDate = outboundLegs[0]?.departure.split('T')[0] || params.dateFrom;
      const realRetDate = returnLegs[0]?.departure.split('T')[0];
      const bookingUrl = r.booking_url || buildFallbackLink(params.origin, params.destination, realDepDate, realRetDate, params.adults);

      offers.push({
        id: `gf-${r.primary_airline || 'xx'}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        origin: params.origin,
        destination: params.destination,
        totalDurationMinutes: r.duration,
        outboundLegs,
        returnLegs: returnLegs.length ? returnLegs : undefined,
        totalPrice: price,
        currency: r.currency || params.currency,
        fareBreakdown: {
          baseFare: Math.round(price * 0.62),
          airportTax: Math.round(price * 0.18),
          localTaxes: Math.round(price * 0.12),
          serviceFee: Math.round(price * 0.08),
          totalFees: Math.round(price * 0.38),
          baggageHand: 'Consultar no Google Flights',
          baggageChecked: 'Consultar no Google Flights',
        },
        ticketRules: {
          cancellation: 'Verificar no Google Flights',
          refund: 'Verificar no Google Flights',
          change: 'Verificar no Google Flights',
          checkedBaggage: 'Verificar no Google Flights',
          handBaggage: 'Verificar no Google Flights',
          seatSelection: 'Verificar no Google Flights',
        },
        bookingLink: bookingUrl,
        deepLink: bookingUrl,
        sources: ['google_flights'],
        crossRef: {
          sourcesChecked: 1,
          prices: { 'Google Flights': price },
          avgPrice: price,
          divergencePct: 0,
          confidence: 'high',
        },
        lastUpdated: new Date().toISOString(),
        priceHistory: [],
      });
    }

    return { source: 'google_flights', offers: offers.slice(0, 10), latencyMs: Date.now() - t0 };
  } catch (err) {
    return { source: 'google_flights', offers: [], latencyMs: Date.now() - t0, error: String(err) };
  }
}
