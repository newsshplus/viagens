import { useState } from 'react';
import { createPortal } from 'react-dom';

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

// Intervalo de amostragem entre datas testadas - com periodos maiores,
// espaca mais os dias testados pra nao precisar de centenas de chamadas.
function sampleInterval(rangeDays: number): number {
  if (rangeDays <= 7) return 1;
  if (rangeDays <= 14) return 2;
  if (rangeDays <= 30) return 3;
  if (rangeDays <= 60) return 5;
  return 10; // periodo de 6 meses
}

// Busca o preco real mais barato pra um trecho de ida numa data especifica,
// usando o MESMO endpoint que a busca normal do sistema usa (nao o
// endpoint de "calendario"). Testando ao vivo, descobrimos que o
// calendario (prices_for_dates com uma faixa de datas) e MUITO mais esparso
// que a busca de um dia especifico - pra uma rota como LIS->BCN, o
// calendario as vezes so tinha 1 dia com preco em cache no mes inteiro,
// enquanto a busca de dia especifico encontra voos reais quase sempre.
async function fetchOneWayPrice(origin: string, destination: string, date: string, currency: string): Promise<number | null> {
  try {
    const qs = new URLSearchParams({ origin, destination, departure_at: date, currency, limit: '3' });
    const resp = await fetch(`/api/flights-travelpayouts?${qs}`);
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json.data || json.data.length === 0) return null;
    let min = Infinity;
    for (const entry of json.data) {
      if (entry.price > 0 && entry.price < min) min = entry.price;
    }
    return Number.isFinite(min) ? min : null;
  } catch {
    return null;
  }
}

async function fetchFlexResults(
  origin: string, destination: string,
  stayMin: number, stayMax: number, rangeDays: number, currency: string
): Promise<FlexResult[]> {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const idealStay = Math.round((stayMin + stayMax) / 2);
  const interval = sampleInterval(rangeDays);

  const pairs: { departStr: string; returnStr: string }[] = [];
  for (let d = 0; d < rangeDays; d += interval) {
    const departDate = new Date(start);
    departDate.setDate(departDate.getDate() + d);
    const returnDate = new Date(departDate);
    returnDate.setDate(returnDate.getDate() + idealStay);
    pairs.push({
      departStr: departDate.toISOString().slice(0, 10),
      returnStr: returnDate.toISOString().slice(0, 10),
    });
  }

  const results: FlexResult[] = [];
  const BATCH_SIZE = 8; // busca em lotes pra nao estourar conexoes simultaneas
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async ({ departStr, returnStr }) => {
      const [depPrice, retPrice] = await Promise.all([
        fetchOneWayPrice(origin, destination, departStr, currency),
        fetchOneWayPrice(destination, origin, returnStr, currency),
      ]);
      if (depPrice === null || retPrice === null) return null;
      return {
        departDate: departStr,
        returnDate: returnStr,
        stayNights: idealStay,
        price: Math.round(depPrice + retPrice),
      };
    }));
    for (const r of batchResults) if (r) results.push(r);
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
                {[7, 14, 30, 60, 180].map((d) => (
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
                    {d === 180 ? "6 meses" : `${d}d`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-dark-700/50 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="text-sm text-dark-300">
              Buscando combinações de <span className="text-dark-100 font-semibold">{stayDuration} dias</span> nos próximos{" "}
              <span className="text-dark-100 font-semibold">{rangeDays === 180 ? "6 meses" : `${rangeDays} dias`}</span>
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
              Consultando preços reais dia por dia no período (pode levar alguns segundos)...
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-6 text-sm text-dark-400">
              Sem voos reais encontrados nas datas testadas desse período/rota agora. Tente um período de busca maior ou volte mais tarde.
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
                Preço = soma do preço real de ida + preço real de volta encontrados numa busca de voos de verdade pra cada data testada. Toque numa combinação pra buscar os voos de verdade nela.
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
