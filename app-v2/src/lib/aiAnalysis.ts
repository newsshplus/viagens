import type { PriceHistoryPoint } from '../types';

export interface AiAnalysisResult {
  available: boolean;
  analysis?: string;
  message?: string;
  dataPoints?: number;
}

export async function fetchAiAnalysis(
  origin: string,
  destination: string,
  currentPrice: number,
  currency: string,
  history: PriceHistoryPoint[]
): Promise<AiAnalysisResult> {
  try {
    const resp = await fetch('/api/ai-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, currentPrice, currency, history }),
    });
    if (!resp.ok) return { available: false, message: `Erro HTTP ${resp.status}` };
    return await resp.json();
  } catch (err) {
    return { available: false, message: String(err) };
  }
}
