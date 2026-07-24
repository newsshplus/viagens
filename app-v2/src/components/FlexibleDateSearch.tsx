import { useState, useMemo } from 'react';

interface FlexResult {
  departDate: string;
  returnDate: string;
  stayNights: number;
  price: number;
  airline: string;
}

interface Props {
  origin: string;
  destination: string;
  currency: string;
  onSelect: (depart: string, ret: string) => void;
  onClose: () => void;
}

const AIRLINES = ["TAP", "LATAM", "GOL", "Azul", "Air France", "KLM", "Lufthansa", "Iberia", "Ryanair", "easyJet"];

function generateFlexResults(origin: string, dest: string, stayMin: number, stayMax: number, rangeDays: number): FlexResult[] {
  const results: FlexResult[] = [];
  const start = new Date();
  start.setDate(start.getDate() + 3);

  for (let d = 0; d < rangeDays; d++) {
    const depart = new Date(start);
    depart.setDate(depart.getDate() + d);

    const stayNights = stayMin + Math.floor(Math.random() * (stayMax - stayMin + 1));
    const ret = new Date(depart);
    ret.setDate(ret.getDate() + stayNights);

    const basePrice = 150 + Math.random() * 600;
    const weekendBonus = (depart.getDay() === 0 || depart.getDay() === 6) ? 80 : 0;
    const price = Math.round(basePrice + weekendBonus + (Math.random() - 0.5) * 100);

    results.push({
      departDate: depart.toISOString().slice(0, 10),
      returnDate: ret.toISOString().slice(0, 10),
      stayNights,
      price: Math.max(50, price),
      airline: AIRLINES[Math.floor(Math.random() * AIRLINES.length)],
    });
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
  const [showResults, setShowResults] = useState(false);

  const results = useMemo(() => {
    if (!showResults) return [];
    return generateFlexResults(origin, destination, stayDuration, stayDuration + 2, rangeDays);
  }, [showResults, origin, destination, stayDuration, rangeDays]);

  const cheapest = results.length > 0 ? results[0] : null;
  const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.price, 0) / results.length) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-dark-800 border border-dark-600/50 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-dark-800/95 backdrop-blur-xl border-b border-dark-600/50 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-dark-50">Explorar datas flexíveis</h2>
            <p className="text-sm text-dark-400">{origin} → {destination} • Encontre as melhores combinações</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-100 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Dias de estadia</label>
              <div className="flex gap-1.5">
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
              <div className="flex gap-1.5">
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

          <div className="bg-dark-700/50 rounded-xl p-3 flex items-center justify-between">
            <div className="text-sm text-dark-300">
              Buscando combinações de <span className="text-dark-100 font-semibold">{stayDuration} dias</span> nos próximos{" "}
              <span className="text-dark-100 font-semibold">{rangeDays} dias</span>
            </div>
            <button
              type="button"
              onClick={() => setShowResults(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-all"
            >
              Buscar
            </button>
          </div>

          {showResults && results.length > 0 && (
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

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {results.slice(0, 15).map((r, i) => {
                  const isBest = i === 0;
                  return (
                    <button
                      key={i}
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
                          {r.stayNights} noites • {r.airline}
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
                        <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-emerald-400" : i === 1 ? "bg-emerald-300" : "bg-emerald-200"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
