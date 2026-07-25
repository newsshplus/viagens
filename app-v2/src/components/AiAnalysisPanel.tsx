import { useState } from 'react';
import type { PriceHistoryPoint } from '../types';
import { fetchAiAnalysis } from '../lib/aiAnalysis';

interface Props {
  origin: string;
  destination: string;
  currentPrice: number;
  currency: string;
  history: PriceHistoryPoint[];
}

export default function AiAnalysisPanel({ origin, destination, currentPrice, currency, history }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ available: boolean; analysis?: string; message?: string } | null>(null);

  const run = async () => {
    setLoading(true);
    const r = await fetchAiAnalysis(origin, destination, currentPrice, currency, history);
    setResult(r);
    setLoading(false);
  };

  return (
    <div className="bg-dark-800/50 rounded-xl p-5 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-dark-200 flex items-center gap-2">
          <span>🤖</span> Análise por IA
        </h4>
        {!result && (
          <button
            onClick={run}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Analisando...' : 'Analisar melhor momento pra comprar'}
          </button>
        )}
      </div>

      {result && result.available && (
        <div className="text-sm text-dark-200 leading-relaxed whitespace-pre-line">{result.analysis}</div>
      )}

      {result && !result.available && (
        <p className="text-xs text-dark-400">{result.message}</p>
      )}

      {!result && (
        <p className="text-xs text-dark-500">
          A IA olha só pro histórico real de preços que você já viu nessa rota (sem inventar dados) e sugere se vale comprar agora ou esperar.
        </p>
      )}
    </div>
  );
}
