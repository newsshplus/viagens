export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { origin, destination, dateFrom, dateTo, adults, currency } = req.query;

  try {
    const fli = await import('@punitarani/fli');

    const segs = [new fli.FlightSegment({
      departure_airport: [[[fli.Airport[origin] ?? origin, 0]]],
      arrival_airport: [[[fli.Airport[destination] ?? destination, 0]]],
      travel_date: dateFrom,
    })];

    if (dateTo) {
      segs.push(new fli.FlightSegment({
        departure_airport: [[[fli.Airport[destination] ?? destination, 0]]],
        arrival_airport: [[[fli.Airport[origin] ?? origin, 0]]],
        travel_date: dateTo,
      }));
    }

    const filters = new fli.FlightSearchFilters({
      passenger_info: { adults: Number(adults) || 1, children: 0, infants_in_seat: 0, infants_on_lap: 0 },
      flight_segments: segs,
      seat_type: fli.SeatType.ECONOMY,
      stops: fli.MaxStops.ANY,
      sort_by: fli.SortBy.CHEAPEST,
    });

    const search = new fli.SearchFlights();
    const rawResults = await search.search(filters, {
      currency: currency || 'EUR',
      language: 'pt',
      country: 'br',
    });

    if (!rawResults) {
      console.error(`[google-flights] busca ${origin}->${destination} ${dateFrom}: search.search() retornou vazio/nulo`);
      return res.status(200).json({ offers: [] });
    }

    const flatResults = [];
    for (const item of rawResults) {
      if (Array.isArray(item)) flatResults.push(...item);
      else flatResults.push(item);
    }

    const offers = [];
    let skippedNoPrice = 0;
    for (const r of flatResults) {
      if (!r.price || r.price <= 0) { skippedNoPrice++; continue; }
      offers.push({
        price: r.price,
        currency: r.currency || currency || 'EUR',
        duration: r.duration,
        stops: r.stops,
        primary_airline: r.primary_airline,
        legs: r.legs?.map(leg => ({
          airline: leg.airline,
          flight_number: leg.flight_number,
          departure_airport: leg.departure_airport,
          arrival_airport: leg.arrival_airport,
          departure_datetime: leg.departure_datetime,
          arrival_datetime: leg.arrival_datetime,
          duration: leg.duration,
          layovers: leg.layovers,
          primary_airline_name: leg.primary_airline_name,
          aircraft: leg.aircraft,
        })) || [],
        booking_url: r.booking_options?.[0]?.google_click_url || r.booking_options?.[0]?.booking_url || '',
      });
    }

    if (offers.length === 0) {
      console.error(`[google-flights] busca ${origin}->${destination} ${dateFrom}: rawResults=${flatResults.length} itens, ${skippedNoPrice} descartados por preco invalido, 0 ofertas finais`);
    }

    return res.status(200).json({ offers });
  } catch (e) {
    console.error(`[google-flights] busca ${origin}->${destination} ${dateFrom}: excecao: ${e.message}`);
    return res.status(200).json({ offers: [], error: e.message });
  }
}
