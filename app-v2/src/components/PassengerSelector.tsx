import { useState, useRef, useEffect } from 'react';

interface PassengerAge {
  type: 'adult' | 'child' | 'infant';
  age?: number;
}

interface Props {
  onChange: (adults: number, children: number, infants: number, childAges: number[]) => void;
}

const AGE_OPTIONS = Array.from({ length: 18 }, (_, i) => i);

export default function PassengerSelector({ onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [passengers, setPassengers] = useState<PassengerAge[]>([
    { type: 'adult' },
  ]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const adults = passengers.filter((p) => p.type === 'adult').length;
  const children = passengers.filter((p) => p.type === 'child').length;
  const infants = passengers.filter((p) => p.type === 'infant').length;
  const childAges = passengers.filter((p) => p.type === 'child').map((p) => p.age || 0);

  const total = passengers.length;

  const updatePassengers = (list: PassengerAge[]) => {
    setPassengers(list);
    const ad = list.filter((p) => p.type === 'adult').length;
    const ch = list.filter((p) => p.type === 'child').length;
    const inf = list.filter((p) => p.type === 'infant').length;
    const ages = list.filter((p) => p.type === 'child').map((p) => p.age || 0);
    onChange(ad, ch, inf, ages);
  };

  const addPassenger = (type: 'adult' | 'child' | 'infant') => {
    if (type === 'adult' && adults >= 9) return;
    if (type === 'child' && children >= 8) return;
    if (type === 'infant' && infants >= adults) return;
    updatePassengers([...passengers, { type, age: type === 'child' ? 7 : undefined }]);
  };

  const removePassenger = (idx: number) => {
    const p = passengers[idx];
    if (p.type === 'adult' && adults <= 1) return;
    updatePassengers(passengers.filter((_, i) => i !== idx));
  };

  const setChildAge = (idx: number, age: number) => {
    const updated = [...passengers];
    updated[idx] = { ...updated[idx], age };
    updatePassengers(updated);
  };

  const formatSummary = () => {
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} adulto${adults > 1 ? "s" : ""}`);
    if (children > 0) parts.push(`${children} criança${children > 1 ? "s" : ""}`);
    if (infants > 0) parts.push(`${infants} bebê${infants > 1 ? "s" : ""}`);
    return parts.join(", ") || "0 passageiros";
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Passageiros</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 text-left focus:outline-none focus:border-blue-500/50 transition-all flex items-center justify-between"
      >
        <span>{formatSummary()}</span>
        <svg className={`w-4 h-4 text-dark-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-dark-800 border border-dark-600 rounded-xl shadow-2xl shadow-black/50 p-4 animate-slide-up">
          {/* Adultos */}
          <div className="flex items-center justify-between py-3 border-b border-dark-700/50">
            <div>
              <div className="text-sm font-medium text-dark-50">Adultos</div>
              <div className="text-xs text-dark-400">12+ anos</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const idx = passengers.findIndex((p) => p.type === 'adult');
                  if (idx >= 0) removePassenger(idx);
                }}
                disabled={adults <= 1}
                className="w-8 h-8 rounded-lg border border-dark-600 flex items-center justify-center text-dark-300 hover:border-dark-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-mono text-dark-50">{adults}</span>
              <button
                type="button"
                onClick={() => addPassenger('adult')}
                disabled={adults >= 9}
                className="w-8 h-8 rounded-lg border border-dark-600 flex items-center justify-center text-dark-300 hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                +
              </button>
            </div>
          </div>

          {/* Crianças */}
          <div className="py-3 border-b border-dark-700/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-dark-50">Crianças</div>
                <div className="text-xs text-dark-400">2–11 anos</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const idx = passengers.findIndex((p) => p.type === 'child');
                    if (idx >= 0) removePassenger(idx);
                  }}
                  disabled={children <= 0}
                  className="w-8 h-8 rounded-lg border border-dark-600 flex items-center justify-center text-dark-300 hover:border-dark-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-mono text-dark-50">{children}</span>
                <button
                  type="button"
                  onClick={() => addPassenger('child')}
                  disabled={children >= 8}
                  className="w-8 h-8 rounded-lg border border-dark-600 flex items-center justify-center text-dark-300 hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {/* Idades das crianças */}
            {children > 0 && (
              <div className="mt-3 space-y-2">
                {passengers.map((p, i) =>
                  p.type === 'child' ? (
                    <div key={i} className="flex items-center gap-2 pl-4">
                      <span className="text-xs text-dark-400">Criança {passengers.slice(0, i + 1).filter((x) => x.type === 'child').length}:</span>
                      <select
                        value={p.age || 7}
                        onChange={(e) => setChildAge(i, Number(e.target.value))}
                        className="bg-dark-700 border border-dark-600 rounded-lg px-2 py-1 text-xs text-dark-100 focus:outline-none focus:border-blue-500/50 transition-all"
                      >
                        {AGE_OPTIONS.filter((a) => a >= 2 && a <= 11).map((a) => (
                          <option key={a} value={a}>{a} anos</option>
                        ))}
                      </select>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Bebês */}
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-dark-50">Bebês</div>
              <div className="text-xs text-dark-400">0–2 anos (no colo)</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const idx = passengers.findIndex((p) => p.type === 'infant');
                  if (idx >= 0) removePassenger(idx);
                }}
                disabled={infants <= 0}
                className="w-8 h-8 rounded-lg border border-dark-600 flex items-center justify-center text-dark-300 hover:border-dark-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-mono text-dark-50">{infants}</span>
              <button
                type="button"
                onClick={() => addPassenger('infant')}
                disabled={infants >= adults}
                className="w-8 h-8 rounded-lg border border-dark-600 flex items-center justify-center text-dark-300 hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full mt-2 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            Confirmar
          </button>
        </div>
      )}
    </div>
  );
}
