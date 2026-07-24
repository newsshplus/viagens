import { useRef, useCallback } from 'react';
import type { SearchParams } from '../types';
import AirportSearch from './AirportSearch';

interface Props {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const POPULAR_ROUTES = [
  { origin: "GRU", dest: "CDG", label: "São Paulo → Paris" },
  { origin: "GRU", dest: "BCN", label: "São Paulo → Barcelona" },
  { origin: "GRU", dest: "LIS", label: "São Paulo → Lisboa" },
  { origin: "GRU", dest: "LHR", label: "São Paulo → Londres" },
  { origin: "GRU", dest: "JFK", label: "São Paulo → Nova York" },
  { origin: "CGH", dest: "MIA", label: "São Paulo → Miami" },
  { origin: "GRU", dest: "FCO", label: "São Paulo → Roma" },
  { origin: "GRU", dest: "AMS", label: "São Paulo → Amsterdã" },
];

export default function SearchForm({ onSearch, loading }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tripType = fd.get("tripType") as string;
    const originIata = fd.get("origin_iata") as string;
    const destIata = fd.get("destination_iata") as string;

    if (!originIata || !destIata) return;

    const params: SearchParams = {
      origin: originIata,
      destination: destIata,
      dateFrom: fd.get("dateFrom") as string,
      dateTo: tripType === "roundtrip" ? (fd.get("dateTo") as string) : undefined,
      adults: Number(fd.get("adults")) || 1,
      children: Number(fd.get("children")) || 0,
      infants: Number(fd.get("infants")) || 0,
      currency: fd.get("currency") as string || "EUR",
      tripType: tripType as "roundtrip" | "oneway",
      directOnly: fd.get("directOnly") === "on",
    };

    onSearch(params);
  };

  const handlePopularRoute = useCallback((origin: string, dest: string) => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);

    // Find the airports by IATA to get city names for display
    const originInput = formRef.current.querySelector('input[name="origin"]') as HTMLInputElement;
    const destInput = formRef.current.querySelector('input[name="destination"]') as HTMLInputElement;
    const originIataInput = formRef.current.querySelector('input[name="origin_iata"]') as HTMLInputElement;
    const destIataInput = formRef.current.querySelector('input[name="destination_iata"]') as HTMLInputElement;

    // Set the IATA values directly
    if (originIataInput) originIataInput.value = origin;
    if (destIataInput) destIataInput.value = dest;

    // Set visible text to IATA codes for popular routes
    if (originInput) originInput.value = origin;
    if (destInput) destInput.value = dest;

    // Submit
    formRef.current.requestSubmit();
  }, []);

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <span className="text-blue-400 text-lg">✈</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-dark-50">Buscar voos</h2>
          <p className="text-xs text-dark-400">Anônimo • Anti-rastreamento • Multi-fonte</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AirportSearch
            name="origin"
            label="Origem"
            placeholder="Digite a cidade de saída..."
            required
            onChange={() => {}}
          />
          <AirportSearch
            name="destination"
            label="Destino"
            placeholder="Digite a cidade de destino..."
            required
            onChange={() => {}}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Tipo</label>
            <select
              name="tripType"
              className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-blue-500/50 transition-all"
            >
              <option value="roundtrip">Ida e volta</option>
              <option value="oneway">Somente ida</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Data ida</label>
            <input
              name="dateFrom"
              type="date"
              required
              className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Data volta</label>
            <input
              name="dateTo"
              type="date"
              className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Adultos</label>
            <input name="adults" type="number" min={1} max={9} defaultValue={1} className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Crianças</label>
            <input name="children" type="number" min={0} max={9} defaultValue={0} className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Bebês</label>
            <input name="infants" type="number" min={0} max={9} defaultValue={0} className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Moeda</label>
            <select name="currency" className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-blue-500/50 transition-all">
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
              <option value="BRL">BRL R$</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="directOnly" className="accent-blue-500" />
            <span className="text-sm text-dark-300">Apenas diretos</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-dark-600 disabled:to-dark-600 disabled:text-dark-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Buscando 3 fontes...
            </span>
          ) : (
            "Buscar voos"
          )}
        </button>
      </form>

      <div className="mt-4">
        <p className="text-xs text-dark-500 mb-2">Rotas populares:</p>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_ROUTES.map((r) => (
            <button
              key={`${r.origin}-${r.dest}`}
              onClick={() => handlePopularRoute(r.origin, r.dest)}
              className="px-2.5 py-1 text-xs bg-dark-700/50 hover:bg-dark-600/50 text-dark-300 hover:text-dark-100 rounded-md border border-dark-600/50 hover:border-dark-500/50 transition-all"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
