import { useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchCalendarMonth } from '../lib/searchEngine';

interface FlexResult {
  departDate: string;
  returnDate: string;
  stayNights: number;
  price: number;
}

interface Props {
  origin: string;
  destination: string;
  currency: string;
  onSelect: (depart: string, ret: string) => void;
  onClose: () => void;
}

function monthKeysBetween(from: Date, to: Date): Set<string> {
  const keys = new Set<string>();
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    keys.add(`${cur.getFullYear()}-${cur.getMonth()}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

// Busca combinacoes reais de ida+volta usando o calendario de precos do
// Travelpayouts (mesma fonte real ja usada no resto do sistema).
//
// IMPORTANTE (descoberto testando ao vivo): o calendario do Travelpayouts e
// bem esparso - pra uma rota como LIS->BCN, um mes inteiro pode ter so 1 ou
// 2 dias com preco realmente em cache, nao um preco por dia. Por isso o
// algoritmo NAO exige uma data de ida especifica bater com uma data de
// volta especifica numa janela pequena (isso quase sempre dava "sem dados"
// mesmo tendo preco real disponivel) - em vez disso, pega TODAS as datas de
// ida com preco real, TODAS as datas de volta com preco real, e pra cada
// ida real casa com a volta real mais proxima da estadia ideal pedida.
async function fetchFlexResults(
  origin: string, destination: string,
  stayMin: number, stayMax: number, rangeDays: number, currency: string
): Promise<FlexResult[]> {
  const start = new Date();
  start.setDate(start.getDate() + 1);

  const lastDepart = new Date(start);
  lastDepart.setDate(lastDepart.getDate() + rangeDays);
  const lastReturn = new Date(lastDepart);
  lastReturn.setDate(lastReturn.getDate() + stayMax);

  const cur = currency.toLowerCase();

  const departPrices: Record<string, number> = {};
  for (const key of monthKeysBetween(start, lastDepart)) {
    const [y, mo] = key.split('-').map(Number);
    const data = await fetchCalendarMonth(origin, destination, y, mo, cur);
    for (const [date, v] of Object.entries(data)) departPrices[date] = v.price;
  }

  const returnPrices: Record<string, number> = {};
  for (const key of monthKeysBetween(start, lastReturn)) {
    const [y, mo] = key.split('-').map(Number);
    const data = await fetchCalendarMonth(destination, origin, y, mo, cur);
    for (const [date, v] of Object.entries(data)) returnPrices[date] = v.price;
  }

  const startStr = start.toISOString().slice(0, 10);
  const lastDepartStr = lastDepart.toISOString().slice(0, 10);
  const departDates = Object.keys(departPrices)
    .filter((d) => departPrices[d] > 0 && d >= startStr && d <= lastDepartStr)
    .sort();
  const returnDates = Object.keys(returnPrices)
    .filter((d) => returnPrices[d] > 0)
    .sort();

  const idealStay = Math.round((stayMin + stayMax) / 2);
  // margem generosa - so descarta combinacoes visivelmente absurdas (tipo
  // volta 3 meses depois quando a pessoa pediu 7 dias), sem ser tao rigido
  // a ponto de rejeitar a unica data real disponivel.
  const maxReasonableStay = stayMax + 21;

  const results: FlexResult[] = [];
  for (const departStr of departDates) {
    const departPrice = departPrices[departStr];
    const departDate = new Date(`${departStr}T00:00:00`);

    let bestReturn: { returnStr: string; price: number; nights: number } | null = null;
    let bestDiff = Infinity;

    for (const returnStr of returnDates) {
      const returnDate = new Date(`${returnStr}T00:00:00`);
      const nights = Math.round((returnDate.getTime() - departDate.getTime()) / (1000 * 60 * 60 * 24));
      if (nights < 1 || nights > maxReasonableStay) continue;

      const diff = Math.abs(nights - idealStay);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestReturn = { returnStr, price: returnPrices[returnStr], nights };
      }
    }

    if (bestReturn) {
      results.push({
        departDate: departStr,
        returnDate: bestReturn.returnStr,
        stayNights: bestReturn.nights,
        price: Math.round(departPrice + bestReturn.price),
      });
    }
  }

  return results.sort((a, b) => a.price - b.price);
}

function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", BRL: "R$" };
  return `${symbols[currency] || ""}${price}`;
}

function formatDateBR(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" });
}

export default function FlexibleDateSearch({ origin, destination, currency, onSelect, onClose }: Props) {
  const [stayDuration, setStayDuration] = useState(7);
  const [rangeDays, setRangeDays] = useState(30);
  const [results, setResults] = useState<FlexResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const cheapest = results.length > 0 ? results[0] : null;
  const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.price, 0) / results.length) : 0;

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await fetchFlexResults(origin, destination, stayDuration, stayDuration + 2, rangeDays, currency);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Renderiza direto em document.body via portal - se ficasse dentro da
  // arvore normal, o card "glass" do formulario (que usa backdrop-blur)
  // quebra o position:fixed dos filhos em praticamente todo navegador
  // (backdrop-filter no ancestral vira containing block do fixed, do
  // mesmo jeito que transform faz). Era por isso que o modal aparecia
  // preso dentro da coluna da esquerda em vez de cobrir a tela toda.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* max-h em dvh (nao vh) - em navegador mobile o vh conta a altura
          maxima da tela mesmo com a barra de endereco visivel, o que fazia
          o modal ficar mais alto que a area realmente visivel e obrigava a
          rolar a pagina inteira pra ver o resto. dvh acompanha a altura
          real disponivel na tela. */}
      <div className="relative bg-dark-800 border border-dark-600/50 rounded-2xl w-full max-w-2xl max-h-[85dvh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-dark-800/95 backdrop-blur-xl border-b border-dark-600/50 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-dark-50">Explorar datas flexíveis</h2>
            <p className="text-sm text-dark-400">{origin} → {destination} • Preços reais por data</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-100 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Dias de estadia</label>
              <div className="flex gap-1.5 flex-wrap">
                {[3, 5, 7, 10, 14, 21].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setStayDuration(d)}
                    className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                      stayDuration === d
                        ? "bg-blue-500/15 border-blue-500/30 text-blue-400 font-semibold"
                        : "border-dark-600 text-dark-300 hover:border-dark-500"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Período de busca</label>
              <div className="flex gap-1.5 flex-wrap">
                {[7, 14, 30, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRangeDays(d)}
                    className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                      rangeDays === d
                        ? "bg-blue-500/15 border-blue-500/30 text-blue-400 font-semibold"
                        : "border-dark-600 text-dark-300 hover:border-dark-500"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-dark-700/50 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="text-sm text-dark-300">
              Buscando combinações de <span className="text-dark-100 font-semibold">{stayDuration} dias</span> nos próximos{" "}
              <span className="text-dark-100 font-semibold">{rangeDays} dias</span>
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-dark-600 text-white text-sm font-semibold rounded-lg transition-all"
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {loading && (
            <div className="text-center py-6 text-sm text-dark-400">
              Consultando preços reais para o período...
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-6 text-sm text-dark-400">
              Sem dados de preço reais disponíveis pra esse período/rota agora. Tente um período de busca maior ou volte mais tarde.
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <div className="text-xs text-emerald-400 mb-1">Mais barato</div>
                  <div className="text-lg font-bold text-emerald-400">{formatPrice(cheapest!.price, currency)}</div>
                  <div className="text-[10px] text-dark-400 mt-0.5">
                    {formatDateBR(cheapest!.departDate)} → {formatDateBR(cheapest!.returnDate)}
                  </div>
                </div>
                <div className="bg-dark-700/50 border border-dark-600/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-dark-400 mb-1">Média</div>
                  <div className="text-lg font-bold text-dark-200">{formatPrice(avg, currency)}</div>
                  <div className="text-[10px] text-dark-400 mt-0.5">{results.length} opções</div>
                </div>
                <div className="bg-dark-700/50 border border-dark-600/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-dark-400 mb-1">Economia</div>
                  <div className="text-lg font-bold text-blue-400">
                    {formatPrice(avg - cheapest!.price, currency)}
                  </div>
                  <div className="text-[10px] text-dark-400 mt-0.5">vs. média</div>
                </div>
              </div>

              <p className="text-[10px] text-dark-500">
                Preço = soma do menor preço real de ida + menor preço real de volta encontrados no calendário para cada data. Toque numa combinação pra buscar os voos de verdade nela.
              </p>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {results.slice(0, 15).map((r, i) => {
                  const isBest = i === 0;
                  return (
                    <button
                      key={`${r.departDate}-${r.returnDate}`}
                      type="button"
                      onClick={() => onSelect(r.departDate, r.returnDate)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        isBest
                          ? "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40"
                          : "bg-dark-700/30 border-dark-600/30 hover:border-dark-500/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-dark-50">{formatDateBR(r.departDate)}</span>
                          <span className="text-dark-500">→</span>
                          <span className="text-sm font-mono text-dark-50">{formatDateBR(r.returnDate)}</span>
                        </div>
                        <div className="text-[10px] text-dark-400 mt-0.5">
                          {r.stayNights} noites
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${isBest ? "text-emerald-400" : "text-dark-100"}`}>
                          {formatPrice(r.price, currency)}
                        </div>
                        {isBest && (
                          <div className="text-[9px] text-emerald-400 font-semibold">MELHOR</div>
                        )}
                      </div>
                      {i < 3 && (
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? "bg-emerald-400" : i === 1 ? "bg-emerald-300" : "bg-emerald-200"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
