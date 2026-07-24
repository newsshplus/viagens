import { useState, useEffect } from 'react';
import type { FlightOffer, SearchParams } from './types';
import { useFlightSearch, useMonitors } from './hooks/useFlightSearch';
import { getAntiTrackSummary, clearBrowserContext } from './lib/antiTrack';
import { isNightScanTime, loadSchedulerConfig, getTimeUntilNightScan } from './lib/scheduler';
import SearchForm from './components/SearchForm';
import FlightCard from './components/FlightCard';
import DetailModal from './components/DetailModal';
import MonitorList from './components/MonitorList';
import MonitorDialog from './components/MonitorDialog';
import SkeletonCard from './components/SkeletonCard';

export default function App() {
  const search = useFlightSearch();
  const monitors = useMonitors();
  const [monitorDialogOffer, setMonitorDialogOffer] = useState<FlightOffer | null>(null);
  const [filter, setFilter] = useState<"all" | "direct">("all");
  const [sort, setSort] = useState<"price" | "duration" | "stops">("price");
  const [antiTrack, setAntiTrack] = useState(getAntiTrackSummary());
  const [nightScanActive, setNightScanActive] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState("");

  useEffect(() => {
    const config = loadSchedulerConfig();
    setNightScanActive(isNightScanTime(config));
    setSchedulerStatus(getTimeUntilNightScan(config));

    clearBrowserContext();
    setAntiTrack(getAntiTrackSummary());

    const iv = setInterval(() => {
      const cfg = loadSchedulerConfig();
      setNightScanActive(isNightScanTime(cfg));
      setSchedulerStatus(getTimeUntilNightScan(cfg));
    }, 60000);

    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    search.filterDirect(filter === "direct");
  }, [filter, search.offers.length]);

  useEffect(() => {
    search.sortBy(sort);
  }, [sort]);

  const handleMonitorAdd = (offer: FlightOffer, price: number) => {
    monitors.add(
      {
        origin: offer.origin,
        destination: offer.destination,
        dateFrom: offer.outboundLegs[0].departure.slice(0, 10),
        dateTo: offer.returnLegs?.[0]?.departure.slice(0, 10),
        adults: 1,
        children: 0,
        infants: 0,
        currency: offer.currency,
        tripType: offer.returnLegs ? "roundtrip" : "oneway",
        directOnly: false,
      },
      price
    );
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="border-b border-dark-700/50 bg-dark-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-sm">VS</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-dark-50">Viagens Smart</h1>
              <p className="text-xs text-dark-400">Sistema anti-rastreamento multi-fonte</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700/50 border border-dark-600/50">
              <div className={`w-1.5 h-1.5 rounded-full ${antiTrack.active ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className="text-xs text-dark-300">Anônimo: {antiTrack.region}</span>
            </div>
            {nightScanActive && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <span className="text-xs text-purple-400">🌙 Scan noturno ativo</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <SearchForm onSearch={search.search} loading={search.loading} />

            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">🛡️</span>
                <h3 className="text-xs font-semibold text-dark-200 uppercase tracking-wider">Status do Sistema</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">Anti-rastreamento</span>
                  <span className="text-emerald-400 font-mono">Ativo</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">Região simulada</span>
                  <span className="text-dark-200 font-mono">{antiTrack.region}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">Scan noturno</span>
                  <span className={`${nightScanActive ? "text-purple-400" : "text-dark-400"} font-mono`}>
                    {schedulerStatus}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">Buscas realizadas</span>
                  <span className="text-dark-200 font-mono">{search.searchCount}</span>
                </div>
              </div>
            </div>

            <MonitorList
              monitors={monitors.monitors}
              onRemove={monitors.remove}
              onToggle={monitors.toggle}
            />
          </div>

          <div className="lg:col-span-8">
            {search.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 animate-fade-in">
                <p className="text-sm text-red-400">{search.error}</p>
              </div>
            )}

            {!search.loading && search.offers.length > 0 && (
              <div className="flex items-center justify-between mb-4 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-dark-300">
                    {search.offers.length} voos encontrados
                  </span>
                  {search.lastSearchTime && (
                    <span className="text-xs text-dark-500">
                      • {new Date(search.lastSearchTime).toLocaleTimeString("pt-BR")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as "all" | "direct")}
                    className="bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1.5 text-xs text-dark-200 focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="all">Todos</option>
                    <option value="direct">Diretos</option>
                  </select>

                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as "price" | "duration" | "stops")}
                    className="bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1.5 text-xs text-dark-200 focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="price">Menor preço</option>
                    <option value="duration">Menor duração</option>
                    <option value="stops">Menos escalas</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {search.loading && (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              )}

              {!search.loading && search.offers.length === 0 && !search.error && (
                <div className="glass rounded-2xl p-12 text-center animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✈️</span>
                  </div>
                  <h3 className="text-lg font-bold text-dark-200 mb-2">Busque seu próximo voo</h3>
                  <p className="text-sm text-dark-400 max-w-sm mx-auto">
                    Use o formulário ao lado para buscar voos de forma anônima com dados de 3 fontes diferentes.
                    Preços são cruzados para garantir confiabilidade.
                  </p>
                </div>
              )}

              {!search.loading && search.offers.map((offer) => (
                <FlightCard
                  key={offer.id}
                  offer={offer}
                  onSelect={(o) => search.selectOffer(o)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {search.selectedOffer && (
        <DetailModal
          offer={search.selectedOffer}
          onClose={() => search.selectOffer(null)}
          onMonitor={() => {
            setMonitorDialogOffer(search.selectedOffer);
            search.selectOffer(null);
          }}
        />
      )}

      {monitorDialogOffer && (
        <MonitorDialog
          offer={monitorDialogOffer}
          monitors={monitors.monitors}
          onClose={() => setMonitorDialogOffer(null)}
          onAddMonitor={handleMonitorAdd}
        />
      )}
    </div>
  );
}
