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

    // O Google as vezes bloqueia/degrada respostas de forma intermitente pra
    // requisicoes vindas de servidor (IP de datacenter compartilhado da
    // Vercel, sem navegador real) - confirmado ao vivo que o erro mais comum
    // e um HTTP 429 (limite de requisicoes) lancado como excecao pelo
    // search.search(). O retry precisa capturar a excecao DENTRO do loop -
    // antes, uma excecao na tentativa 1 pulava direto pro erro final sem
    // nunca tentar de novo, o que fazia o retry nao servir pro caso mais
    // comum de falha.
    const MAX_ATTEMPTS = 3;
    let rawResults = null;
    let lastAttemptEmpty = false;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const search = new fli.SearchFlights();
        rawResults = await search.search(filters, {
          currency: currency || 'EUR',
          language: 'pt',
          country: 'br',
        });
        lastError = null;

        if (rawResults && (Array.isArray(rawResults) ? rawResults.length > 0 : true)) break;
        lastAttemptEmpty = true;
      } catch (err) {
        lastError = err;
        console.error(`[google-flights] busca ${origin}->${destination} ${dateFrom}: tentativa ${attempt} lancou excecao: ${err.message}`);
      }

      if (attempt < MAX_ATTEMPTS) {
        // Depois de um 429, espera mais (o limite costuma liberar de novo
        // depois de alguns segundos) - depois de resultado vazio sem erro,
        // uma espera curta ja costuma bastar.
        const isRateLimited = lastError && String(lastError.message).includes('429');
        const delayMs = isRateLimited ? 2500 : 1200;
        console.error(`[google-flights] busca ${origin}->${destination} ${dateFrom}: tentativa ${attempt} sem sucesso, tentando de novo em ${delayMs}ms`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    if (lastError && (!rawResults || (Array.isArray(rawResults) && rawResults.length === 0))) {
      console.error(`[google-flights] busca ${origin}->${destination} ${dateFrom}: todas as ${MAX_ATTEMPTS} tentativas falharam, ultimo erro: ${lastError.message}`);
      return res.status(200).json({ offers: [], error: lastError.message });
    }

    if (!rawResults) {
      console.error(`[google-flights] busca ${origin}->${destination} ${dateFrom}: search.search() retornou vazio/nulo apos ${MAX_ATTEMPTS} tentativas`);
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
      console.error(`[google-flights] busca ${origin}->${destination} ${dateFrom}: rawResults=${flatResults.length} itens, ${skippedNoPrice} descartados por preco invalido, 0 ofertas finais${lastAttemptEmpty ? ' (apos retry)' : ''}`);
    }

    return res.status(200).json({ offers });
  } catch (e) {
    console.error(`[google-flights] busca ${origin}->${destination} ${dateFrom}: excecao: ${e.message}`);
    return res.status(200).json({ offers: [], error: e.message });
  }
}
