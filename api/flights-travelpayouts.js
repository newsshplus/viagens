export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { origin, destination, departure_at, return_at, currency, limit, direct } = req.query;
  const token = process.env.TRAVELPAYOUTS_TOKEN;

  if (!token) return res.status(500).json({ error: 'No Travelpayouts token' });

  try {
    const params = new URLSearchParams({
      token,
      origin: origin || 'LIS',
      destination: destination || 'BCN',
      departure_at: departure_at || '2026-08-28',
      currency: currency || 'EUR',
      sorting: 'price',
      limit: limit || '20',
      direct: direct || 'false',
    });

    const resp = await fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params}`);
    const data = await resp.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
