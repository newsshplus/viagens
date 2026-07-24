import type { SearchParams } from '../types';

interface Props {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const POPULAR_ROUTES = [
  { origin: "GRU", dest: "CDG", label: "GRU → CDG" },
  { origin: "GRU", dest: "BCN", label: "GRU → BCN" },
  { origin: "GRU", dest: "LIS", label: "GRU → LIS" },
  { origin: "GRU", dest: "LHR", label: "GRU → LHR" },
  { origin: "GRU", dest: "JFK", label: "GRU → JFK" },
  { origin: "CGH", dest: "MIA", label: "CGH → MIA" },
  { origin: "GRU", dest: "FCO", label: "GRU → FCO" },
  { origin: "GRU", dest: "AMS", label: "GRU → AMS" },
];

export default function SearchForm({ onSearch, loading }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tripType = fd.get("tripType") as string;

    const params: SearchParams = {
      origin: (fd.get("origin") as string).toUpperCase(),
      destination: (fd.get("destination") as string).toUpperCase(),
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Origem</label>
            <input
              name="origin"
              required
              placeholder="GRU"
              maxLength={3}
              className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm font-mono text-dark-50 placeholder-dark-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Destino</label>
            <input
              name="destination"
              required
              placeholder="CDG"
              maxLength={3}
              className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm font-mono text-dark-50 placeholder-dark-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
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
              key={r.label}
              onClick={() => {
                const form = document.querySelector("form") as HTMLFormElement;
                if (form) {
                  (form.elements.namedItem("origin") as HTMLInputElement).value = r.origin;
                  (form.elements.namedItem("destination") as HTMLInputElement).value = r.dest;
                  form.requestSubmit();
                }
              }}
              className="px-2.5 py-1 text-xs bg-dark-700/50 hover:bg-dark-600/50 text-dark-300 hover:text-dark-100 rounded-md border border-dark-600/50 hover:border-dark-500/50 transition-all font-mono"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
