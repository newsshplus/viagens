/**
 * Analisa o historico real de precos de uma rota (enviado pelo cliente,
 * construido a partir de buscas reais que a pessoa ja fez) e devolve uma
 * recomendacao em linguagem natural via Groq (IA gratuita, OpenAI-compatible).
 *
 * Se GROQ_API_KEY nao estiver configurada, devolve um erro claro em vez de
 * fabricar uma resposta - a analise so acontece com IA de verdade.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  console.log(`[ai-analysis] GROQ_API_KEY presente: ${apiKey ? 'sim (' + apiKey.length + ' caracteres)' : 'NAO'}`);
  if (!apiKey) {
    return res.status(200).json({
      available: false,
      message: 'Analise por IA nao configurada - falta GROQ_API_KEY nas variaveis de ambiente da Vercel (cadastro gratis em console.groq.com).',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { origin, destination, currentPrice, currency, history } = body || {};

  if (!origin || !destination || !currentPrice || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Parametros invalidos: origin, destination, currentPrice e history sao obrigatorios' });
  }

  const historyLines = history
    .slice(-40)
    .map((h) => `${h.timestamp}: ${h.price} ${currency}`)
    .join('\n');

  const prompt = `Voce e um analista de precos de passagens aereas. Rota: ${origin} -> ${destination}.
Preco atual encontrado agora: ${currentPrice} ${currency}.
Historico real de precos ja observados nessa rota (mais antigo primeiro):
${historyLines || '(sem historico anterior - essa e a primeira busca dessa rota)'}

Com base APENAS nesses dados reais (nao invente numeros que nao estao aqui), responda em portugues, em ate 4 frases curtas:
1. Se o preco atual esta bom, normal ou caro comparado ao historico.
2. Se ha algum padrao visivel de dia da semana ou horario nos dados (so se os dados permitirem essa conclusao com confianca).
3. Uma recomendacao pratica: comprar agora ou esperar, e por que.
Se o historico for curto demais (menos de 5 pontos) para conclusoes solidas, diga isso claramente em vez de inventar um padrao.`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.log(`[ai-analysis] Groq respondeu status=${resp.status}: ${errText.slice(0, 300)}`);
      return res.status(200).json({ available: false, message: `Groq retornou erro: ${errText.slice(0, 200)}` });
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return res.status(200).json({ available: false, message: 'Groq nao retornou analise.' });

    return res.status(200).json({ available: true, analysis: text, dataPoints: history.length });
  } catch (err) {
    return res.status(200).json({ available: false, message: String(err) });
  }
}
