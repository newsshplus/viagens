export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { origin, destination, month, currency } = req.query;
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return res.status(200).json({});

  try {
    const [year, mon] = (month || '2026-08').split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    const params = new URLSearchParams({
      token, origin: origin || 'LIS', destination: destination || 'BCN',
      departure_at: `${month}-01`,
      departure_to: `${month}-${String(daysInMonth).padStart(2, '0')}`,
      currency: currency || 'EUR', sorting: 'price', limit: '30', direct: 'false',
    });

    const resp = await fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params}`);
    const json = await resp.json();

    const result = {};
    if (json.success && json.data) {
      for (const entry of json.data) {
        const dateStr = entry.departure_at.split('T')[0];
        if (!result[dateStr] || entry.price < result[dateStr].price) {
          result[dateStr] = { price: entry.price, transfers: entry.transfers || 0 };
        }
      }
    }
    return res.status(200).json(result);
  } catch (e) {
    return res.status(200).json({});
  }
}
