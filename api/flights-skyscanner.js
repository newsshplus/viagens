export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, query, originSkyId, destinationSkyId, originEntityId, destinationEntityId, date, returnDate, adults, currency, sessionId } = req.query;
  const apiKey = process.env.RAPIDAPI_KEY;
  const host = 'sky-scrapper.p.rapidapi.com';

  if (!apiKey) return res.status(500).json({ error: 'No RapidAPI key' });

  const headers = { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': host };

  try {
    if (action === 'searchAirport') {
      const resp = await fetch(`https://${host}/api/v1/flights/searchAirport?query=${query || 'LIS'}&locale=en-US`, { headers });
      const data = await resp.json();
      if (!resp.ok || !data?.data) {
        console.error(`[skyscanner searchAirport] query=${query} status=${resp.status} body=${JSON.stringify(data).slice(0, 500)}`);
      }
      return res.status(200).json(data);
    }

    if (action === 'searchFlights') {
      const params = new URLSearchParams({
        originSkyId, destinationSkyId, originEntityId, destinationEntityId,
        date, adults: adults || '1', currency: currency || 'EUR',
        countryCode: 'PT', market: 'pt-PT',
      });
      if (returnDate) params.set('returnDate', returnDate);
      if (sessionId) params.set('sessionId', sessionId);

      const resp = await fetch(`https://${host}/api/v1/flights/searchFlights?${params}`, { headers });
      const data = await resp.json();
      if (!resp.ok || !data?.data?.itineraries) {
        console.error(`[skyscanner searchFlights] status=${resp.status} body=${JSON.stringify(data).slice(0, 500)}`);
      }
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (e) {
    console.error(`[skyscanner ${action}] exception: ${e.message}`);
    return res.status(500).json({ error: e.message });
  }
}
