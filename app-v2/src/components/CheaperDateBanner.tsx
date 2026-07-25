import { useEffect, useState } from 'react';
import type { SearchParams } from '../types';
import { fetchCalendarMonth } from '../lib/searchEngine';

interface Props {
  params: SearchParams;
  currentPrice: number;
  onSelectDate: (dateFrom: string) => void;
}

interface CheaperDay {
  date: string;
  price: number;
}

const WINDOW_DAYS = 3;
// So faz sentido comparar quando o preco atual e de UMA perna (ida simples) -
// comparar o total de ida+volta com o preco de um unico dia do calendario
// (que e sempre preco de ida) seria enganoso.
const MIN_DISCOUNT_PCT = 8;

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtPrice(p: number, currency: string): string {
  const s: Record<string, string> = { EUR: '€', USD: '$', BRL: 'R$' };
  return `${s[currency] || currency} ${p}`;
}

export default function CheaperDateBanner({ params, currentPrice, onSelectDate }: Props) {
  const [cheaper, setCheaper] = useState<CheaperDay | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // So mostra pra buscas de ida simples - ver comentario sobre MIN_DISCOUNT_PCT.
  const applicable = !params.dateTo && currentPrice > 0;

  useEffect(() => {
    if (!applicable) { setCheaper(null); return; }
    setDismissed(false);
    setCheaper(null);
    let cancelled = false;

    (async () => {
      const center = new Date(`${params.dateFrom}T12:00:00`);
      const monthKeys = new Set<string>();
      const addMonth = (d: Date) => monthKeys.add(`${d.getFullYear()}-${d.getMonth()}`);
      addMonth(center);
      addMonth(new Date(addDays(params.dateFrom, -WINDOW_DAYS) + 'T12:00:00'));
      addMonth(new Date(addDays(params.dateFrom, WINDOW_DAYS) + 'T12:00:00'));

      const merged: Record<string, { price: number }> = {};
      for (const key of monthKeys) {
        const [y, mo] = key.split('-').map(Number);
        try {
          const data = await fetchCalendarMonth(params.origin, params.destination, y, mo, params.currency.toLowerCase());
          Object.assign(merged, data);
        } catch { /* segue sem esse mes */ }
      }
      if (cancelled) return;

      let best: CheaperDay | null = null;
      for (let offset = -WINDOW_DAYS; offset <= WINDOW_DAYS; offset++) {
        if (offset === 0) continue;
        const d = addDays(params.dateFrom, offset);
        const entry = merged[d];
        if (!entry || !(entry.price > 0)) continue;
        if (entry.price < currentPrice * (1 - MIN_DISCOUNT_PCT / 100)) {
          if (!best || entry.price < best.price) best = { date: d, price: entry.price };
        }
      }
      if (!cancelled) setCheaper(best);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicable, params.origin, params.destination, params.dateFrom, params.currency, currentPrice]);

  if (!applicable || !cheaper || dismissed) return null;

  const diffPct = Math.round(((currentPrice - cheaper.price) / currentPrice) * 100);
  const dateLabel = new Date(`${cheaper.date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });

  return (
    <div className="glass rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 border border-emerald-500/20 animate-fade-in">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl shrink-0">💰</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-dark-50">Achamos uma data mais barata perto da sua busca</div>
          <div className="text-xs text-dark-400">
            {dateLabel} sai por <span className="text-emerald-400 font-bold">{fmtPrice(cheaper.price, params.currency)}</span>
            {' '}— {diffPct}% mais barato que {fmtPrice(currentPrice, params.currency)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onSelectDate(cheaper.date)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all"
        >
          Ver essa data
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dispensar"
          className="w-7 h-7 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700 flex items-center justify-center transition-all"
        >
          ×
        </button>
      </div>
    </div>
  );
}
