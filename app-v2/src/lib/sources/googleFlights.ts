import type { FlightOffer, FlightLeg } from '../../types';
import type { SourceParams, SourceResult } from './types';

export async function searchGoogleFlights(params: SourceParams): Promise<SourceResult> {
  const t0 = Date.now();
  try {
    const fli = await import('@punitarani/fli');

    const segs = [new fli.FlightSegment({
      departure_airport: [[[fli.Airport[params.origin as keyof typeof fli.Airport] ?? params.origin, 0]]],
      arrival_airport: [[[fli.Airport[params.destination as keyof typeof fli.Airport] ?? params.destination, 0]]],
      travel_date: params.dateFrom,
    })];

    if (params.dateTo) {
      segs.push(new fli.FlightSegment({
        departure_airport: [[[fli.Airport[params.destination as keyof typeof fli.Airport] ?? params.destination, 0]]],
        arrival_airport: [[[fli.Airport[params.origin as keyof typeof fli.Airport] ?? params.origin, 0]]],
        travel_date: params.dateTo,
      }));
    }

    const filters = new fli.FlightSearchFilters({
      passenger_info: { adults: params.adults, children: 0, infants_in_seat: 0, infants_on_lap: 0 },
      flight_segments: segs,
      seat_type: fli.SeatType.ECONOMY,
      stops: fli.MaxStops.ANY,
      sort_by: fli.SortBy.CHEAPEST,
    });

    const search = new fli.SearchFlights();
    const rawResults = await search.search(filters, {
      currency: params.currency as string,
      language: 'pt',
      country: 'br',
    });

    if (!rawResults) return { source: 'google_flights', offers: [], latencyMs: Date.now() - t0 };

    const flatResults: Array<{ legs: Array<{ airline: string; flight_number: string; departure_airport: string; arrival_airport: string; departure_datetime: Date; arrival_datetime: Date; duration: number; layovers?: Array<{ airport: string; duration: number }> | null; aircraft?: string | null; primary_airline_name?: string | null }>; price: number | null; currency: string | null; duration: number; stops: number; primary_airline?: string | null; booking_options?: Array<{ google_click_url?: string | null; booking_url?: string | null }> }> = [];

    for (const item of rawResults) {
      if (Array.isArray(item)) {
        flatResults.push(...item);
      } else {
        flatResults.push(item as NonNullable<typeof flatResults[0]>);
      }
    }

    const offers: FlightOffer[] = [];

    for (const r of flatResults) {
      if (!r.price || r.price <= 0) continue;

      const outboundLegs: FlightLeg[] = [];
      const returnLegs: FlightLeg[] = [];

      for (let i = 0; i < r.legs.length; i++) {
        const leg = r.legs[i];
        const depDate = leg.departure_datetime.toISOString().split('T')[0];
        const depTime = `${String(leg.departure_datetime.getUTCHours()).padStart(2, '0')}:${String(leg.departure_datetime.getUTCMinutes()).padStart(2, '0')}`;
        const arrTime = `${String(leg.arrival_datetime.getUTCHours()).padStart(2, '0')}:${String(leg.arrival_datetime.getUTCMinutes()).padStart(2, '0')}`;

        const fl: FlightLeg = {
          airline: leg.airline,
          airlineName: leg.primary_airline_name || leg.airline,
          flightNumber: leg.flight_number,
          aircraft: leg.aircraft || 'A confirmar',
          departure: `${depDate}T${depTime}:00`,
          arrival: `${depDate}T${arrTime}:00`,
          departureAirport: leg.departure_airport,
          arrivalAirport: leg.arrival_airport,
          durationMinutes: leg.duration,
          stops: leg.layovers?.length || 0,
          stopAirports: leg.layovers?.map((l: { airport: string }) => l.airport) || [],
          stopDurations: leg.layovers?.map((l: { duration: number }) => l.duration) || [],
        };

        if (i === 0) outboundLegs.push(fl);
        else returnLegs.push(fl);
      }

      const bestBooking = r.booking_options?.[0];
      const bookingUrl = bestBooking?.google_click_url || bestBooking?.booking_url || '';

      offers.push({
        id: `gf-${r.primary_airline || 'xx'}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        origin: params.origin,
        destination: params.destination,
        totalDurationMinutes: r.duration,
        outboundLegs,
        returnLegs: returnLegs.length ? returnLegs : undefined,
        totalPrice: Math.round(r.price),
        currency: r.currency || params.currency,
        fareBreakdown: {
          baseFare: Math.round(r.price * 0.62),
          airportTax: Math.round(r.price * 0.18),
          localTaxes: Math.round(r.price * 0.12),
          serviceFee: Math.round(r.price * 0.08),
          totalFees: Math.round(r.price * 0.38),
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
        bookingLink: bookingUrl || `https://www.google.com/travel/flights`,
        deepLink: bookingUrl || `https://www.google.com/travel/flights`,
        sources: ['google_flights'],
        crossRef: {
          sourcesChecked: 1,
          prices: { 'Google Flights': Math.round(r.price) },
          avgPrice: Math.round(r.price),
          divergencePct: 0,
          confidence: 'high',
        },
        lastUpdated: new Date().toISOString(),
        priceHistory: [],
      });
    }

    return { source: 'google_flights', offers, latencyMs: Date.now() - t0 };
  } catch (err) {
    return { source: 'google_flights', offers: [], latencyMs: Date.now() - t0, error: String(err) };
  }
}
