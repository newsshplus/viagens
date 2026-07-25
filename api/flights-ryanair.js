// Ryanair tem uma API publica de tarifas (farefinder) sem necessidade de
// chave/cadastro - e a maior companhia low-cost da Europa, entao isso e uma
// fonte real e gratuita a mais pro sistema. Chamamos aqui no servidor pra
// evitar bloqueio de CORS no navegador.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { origin, destination, dateFrom, dateTo, currency } = req.query;
  if (!origin || !destination || !dateFrom) {
    return res.status(400).json({ error: 'origin, destination e dateFrom sao obrigatorios' });
  }

  const cur = currency || 'EUR';
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; ViagensSmart/1.0)' };

  try {
    const outUrl = `https://www.ryanair.com/api/farfnd/3/oneWayFares/${origin}/${destination}/cheapestPerDay?outboundDateFrom=${dateFrom}&outboundDateTo=${dateFrom}&currency=${cur}`;
    const outResp = await fetch(outUrl, { headers });

    if (!outResp.ok) {
      console.error(`[ryanair] busca ${origin}->${destination} ${dateFrom}: outbound status=${outResp.status}`);
      return res.status(200).json({ outbound: null, inbound: null, error: `HTTP ${outResp.status}` });
    }
    const outboundData = await outResp.json();

    let inboundData = null;
    if (dateTo) {
      // Em vez de so o dia exato, busca uma janela de +-10 dias em torno da
      // data de volta pedida - se a Ryanair nao voar exatamente nesse dia,
      // o cliente pode escolher o dia mais barato disponivel dentro da
      // janela em vez de simplesmente falhar.
      const dateToObj = new Date(`${dateTo}T00:00:00`);
      const minAllowed = new Date(`${dateFrom}T00:00:00`);
      minAllowed.setDate(minAllowed.getDate() + 1);
      const windowStart = new Date(dateToObj);
      windowStart.setDate(windowStart.getDate() - 10);
      const rangeStart = windowStart < minAllowed ? minAllowed : windowStart;
      const rangeEnd = new Date(dateToObj);
      rangeEnd.setDate(rangeEnd.getDate() + 10);
      const fmt = (d) => d.toISOString().slice(0, 10);

      const inUrl = `https://www.ryanair.com/api/farfnd/3/oneWayFares/${destination}/${origin}/cheapestPerDay?outboundDateFrom=${fmt(rangeStart)}&outboundDateTo=${fmt(rangeEnd)}&currency=${cur}`;
      const inResp = await fetch(inUrl, { headers });
      if (inResp.ok) inboundData = await inResp.json();
      else console.error(`[ryanair] busca volta ${destination}->${origin} janela em torno de ${dateTo}: status=${inResp.status}`);
    }

    return res.status(200).json({ outbound: outboundData, inbound: inboundData });
  } catch (e) {
    console.error(`[ryanair] busca ${origin}->${destination} ${dateFrom}: excecao: ${e.message}`);
    return res.status(500).json({ error: e.message });
  }
}
