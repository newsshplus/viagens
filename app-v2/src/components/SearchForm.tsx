import { useRef, useState, useMemo, useCallback } from 'react';
import type { SearchParams } from '../types';
import AirportSearch from './AirportSearch';
import PassengerSelector from './PassengerSelector';
import PriceCalendar from './PriceCalendar';
import FlexibleDateSearch from './FlexibleDateSearch';

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

function generateMockCalendarPrices(basePrice: number): Record<string, number> {
  const prices: Record<string, number> = {};
  const today = new Date();
  for (let d = 0; d < 90; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dayOfWeek = date.getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1;
    const seasonalFactor = 1 + Math.sin(d / 7) * 0.15;
    const noise = (Math.random() - 0.5) * 0.3;
    prices[key] = Math.round(basePrice * weekendFactor * seasonalFactor * (1 + noise));
  }
  return prices;
}

export default function SearchForm({ onSearch, loading }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [adults, setAdults] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [infants, setInfants] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [originIata, setOriginIata] = useState("");
  const [destIata, setDestIata] = useState("");
  const [showCalendars, setShowCalendars] = useState(false);
  const [departureDate, setDepartureDate] = useState<string | null>(null);
  const [returnDate, setReturnDate] = useState<string | null>(null);
  const [showFlexSearch, setShowFlexSearch] = useState(false);

  const departurePrices = useMemo(() => {
    if (!originIata || !destIata) return {};
    return generateMockCalendarPrices(300 + Math.random() * 400);
  }, [originIata, destIata]);

  const returnPrices = useMemo(() => {
    if (!originIata || !destIata) return {};
    return generateMockCalendarPrices(300 + Math.random() * 400);
  }, [originIata, destIata]);

  const totalPassengers = adults + childrenCount + infants;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!originIata || !destIata || !departureDate) return;

    const fd = new FormData(e.currentTarget);
    const tripType = fd.get("tripType") as string;

    const params: SearchParams = {
      origin: originIata,
      destination: destIata,
      dateFrom: departureDate,
      dateTo: tripType === "roundtrip" ? (returnDate || undefined) : undefined,
      adults,
      children: childrenCount,
      infants,
      currency: fd.get("currency") as string || "EUR",
      tripType: tripType as "roundtrip" | "oneway",
      directOnly: fd.get("directOnly") === "on",
    };

    onSearch(params);
  };

  const handlePopularRoute = useCallback((origin: string, dest: string) => {
    setOriginIata(origin);
    setDestIata(dest);
    const form = formRef.current;
    if (!form) return;
    const originInput = form.querySelector('input[name="origin"]') as HTMLInputElement;
    const destInput = form.querySelector('input[name="destination"]') as HTMLInputElement;
    const originIataH = form.querySelector('input[name="origin_iata"]') as HTMLInputElement;
    const destIataH = form.querySelector('input[name="destination_iata"]') as HTMLInputElement;
    if (originInput) originInput.value = origin;
    if (destInput) destInput.value = dest;
    if (originIataH) originIataH.value = origin;
    if (destIataH) destIataH.value = dest;
  }, []);

  const handleSelectFlexDate = (depart: string, ret: string) => {
    setDepartureDate(depart);
    setReturnDate(ret);
    setShowFlexSearch(false);
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-400 text-lg">✈</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-dark-50">Buscar voos</h2>
            <p className="text-xs text-dark-400">Anônimo • Anti-rastreamento • Multi-fonte</p>
          </div>
        </div>
        {originIata && destIata && (
          <button
            type="button"
            onClick={() => setShowFlexSearch(true)}
            className="px-3 py-1.5 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/15 transition-all"
          >
            Explorar datas
          </button>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {/* Origem / Destino */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AirportSearch
            name="origin"
            label="Origem"
            placeholder="Digite a cidade de saída..."
            required
            onChange={(a) => setOriginIata(a?.iata || "")}
          />
          <AirportSearch
            name="destination"
            label="Destino"
            placeholder="Digite a cidade de destino..."
            required
            onChange={(a) => setDestIata(a?.iata || "")}
          />
        </div>

        {/* Tipo de viagem */}
        <div>
          <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Tipo de viagem</label>
          <div className="flex gap-2">
            <label className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dark-600 cursor-pointer hover:border-dark-500 transition-all has-[:checked]:bg-blue-500/10 has-[:checked]:border-blue-500/30">
              <input type="radio" name="tripType" value="roundtrip" defaultChecked className="accent-blue-500" />
              <span className="text-sm text-dark-200">Ida e volta</span>
            </label>
            <label className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dark-600 cursor-pointer hover:border-dark-500 transition-all has-[:checked]:bg-blue-500/10 has-[:checked]:border-blue-500/30">
              <input type="radio" name="tripType" value="oneway" className="accent-blue-500" />
              <span className="text-sm text-dark-200">Somente ida</span>
            </label>
          </div>
        </div>

        {/* Calendários inline */}
        {showCalendars && originIata && destIata && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-up">
            <PriceCalendar
              month={new Date()}
              prices={departurePrices}
              selectedDate={departureDate}
              onSelect={(d) => { setDepartureDate(d); }}
              label="Data de ida"
            />
            <PriceCalendar
              month={new Date()}
              prices={returnPrices}
              selectedDate={returnDate}
              onSelect={(d) => { setReturnDate(d); }}
              label="Data de volta"
            />
          </div>
        )}

        {/* Datas selecionadas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Data ida</label>
            <button
              type="button"
              onClick={() => setShowCalendars(!showCalendars)}
              className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-left focus:outline-none focus:border-blue-500/50 transition-all"
            >
              {departureDate ? (
                <span className="text-dark-50">{new Date(departureDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
              ) : (
                <span className="text-dark-500">Selecionar data...</span>
              )}
            </button>
            <input type="hidden" name="dateFrom" value={departureDate || ""} />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Data volta</label>
            <button
              type="button"
              onClick={() => setShowCalendars(!showCalendars)}
              className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-left focus:outline-none focus:border-blue-500/50 transition-all"
            >
              {returnDate ? (
                <span className="text-dark-50">{new Date(returnDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
              ) : (
                <span className="text-dark-500">Selecionar data...</span>
              )}
            </button>
            <input type="hidden" name="dateTo" value={returnDate || ""} />
          </div>
        </div>

        {/* Passageiros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PassengerSelector
            onChange={(ad, ch, inf, ages) => {
              setAdults(ad);
              setChildrenCount(ch);
              setInfants(inf);
              setChildAges(ages);
            }}
          />
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">Moeda</label>
            <select name="currency" className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-blue-500/50 transition-all">
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
              <option value="BRL">BRL R$</option>
            </select>
          </div>
        </div>

        {/* Resumo */}
        {departureDate && (
          <div className="bg-dark-700/50 rounded-xl p-3 flex items-center justify-between">
            <div className="text-sm text-dark-300">
              <span className="text-dark-100 font-semibold">{originIata}</span>
              <span className="mx-1.5 text-dark-500">→</span>
              <span className="text-dark-100 font-semibold">{destIata}</span>
              {returnDate && (
                <>
                  <span className="mx-1.5 text-dark-500">→</span>
                  <span className="text-dark-100 font-semibold">{originIata}</span>
                </>
              )}
            </div>
            <div className="text-sm text-dark-400">
              {totalPassengers} passageiro{totalPassengers > 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* Diretos */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="directOnly" className="accent-blue-500" />
          <span className="text-sm text-dark-300">Apenas voos diretos</span>
        </label>

        {/* Botão */}
        <button
          type="submit"
          disabled={loading || !originIata || !destIata || !departureDate}
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

      {/* Rotas populares */}
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

      {showFlexSearch && originIata && destIata && (
        <FlexibleDateSearch
          origin={originIata}
          destination={destIata}
          currency="EUR"
          onSelect={handleSelectFlexDate}
          onClose={() => setShowFlexSearch(false)}
        />
      )}
    </div>
  );
}
