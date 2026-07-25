import { useState, useCallback, useEffect, useRef } from 'react';
import type { FlightOffer, SearchParams } from '../types';
import type { SourceResult } from '../lib/sources/types';
import { detectPriceAnomaly, generateMonitorAlert } from '../lib/scheduler';
import { recordPrice, getHistory } from '../lib/priceTracker';
import { recordSearch } from '../lib/recentSearches';
import type { Monitor } from '../types';

interface UseSearchResult {
  offers: FlightOffer[];
  loading: boolean;
  error: string | null;
  searchCount: number;
  lastSearchTime: string | null;
  currentParams: SearchParams | null;
  search: (params: SearchParams) => Promise<void>;
  filterDirect: (direct: boolean) => void;
  sortBy: (key: "price" | "duration" | "stops") => void;
  selectedOffer: FlightOffer | null;
  selectOffer: (offer: FlightOffer | null) => void;
  sourceStats: { name: string; count: number; latencyMs: number; error?: string }[];
}

export function useFlightSearch(): UseSearchResult {
  const [allOffers, setAllOffers] = useState<FlightOffer[]>([]);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchCount, setSearchCount] = useState(0);
  const [lastSearchTime, setLastSearchTime] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<FlightOffer | null>(null);
  const [currentParams, setCurrentParams] = useState<SearchParams | null>(null);
  const [sourceStats, setSourceStats] = useState<{ name: string; count: number; latencyMs: number; error?: string }[]>([]);

  const search = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setCurrentParams(params);
    setSourceStats([]);
    recordSearch(params);

    try {
      const { searchAllSources } = await import('../lib/sources/index');
      const result = await searchAllSources({
        origin: params.origin,
        destination: params.destination,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        adults: params.adults,
        currency: params.currency,
      });

      setSourceStats(result.sources);

      const offers = result.offers;

      // Grava cada preço real encontrado no histórico local (por rota) e
      // anexa o histórico real acumulado a cada oferta, pra alimentar o
      // gráfico de tendência e a análise por IA.
      for (const offer of offers) {
        const src = offer.sources?.[0] || 'desconhecida';
        recordPrice(offer.origin, offer.destination, offer.totalPrice, src);
      }
      const routeHistory = offers.length > 0 ? getHistory(offers[0].origin, offers[0].destination) : [];
      for (const offer of offers) {
        offer.priceHistory = routeHistory;
      }

      setAllOffers(offers);
      setOffers(offers);
      setSearchCount((c) => c + 1);
      setLastSearchTime(new Date().toISOString());

      if (offers.length === 0) {
        const allFailed = result.sources.length > 0 && result.sources.every((s) => s.error);
        setError(
          allFailed
            ? "Nenhuma das fontes (Google Flights, Skyscanner, Travelpayouts) respondeu agora - provavelmente falta configurar as chaves de API na Vercel, ou o serviço está bloqueando temporariamente. Veja o painel \"Status do Sistema\" ao lado para detalhes por fonte."
            : "Nenhum voo real encontrado para essa rota/data. Tente outras datas ou um destino próximo - isto não é um erro, as fontes simplesmente não têm oferta disponível agora."
        );
      }
    } catch (err) {
      setError("Erro ao buscar voos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  const filterDirect = useCallback((direct: boolean) => {
    if (!direct) {
      setOffers(allOffers);
    } else {
      setOffers(allOffers.filter((o) => o.outboundLegs.every((l) => l.stops === 0)));
    }
  }, [allOffers]);

  const sortBy = useCallback((key: "price" | "duration" | "stops") => {
    setOffers((prev) => [...prev].sort((a, b) => {
      if (key === "price") return a.totalPrice - b.totalPrice;
      if (key === "duration") return a.totalDurationMinutes - b.totalDurationMinutes;
      const aStops = a.outboundLegs.reduce((s, l) => s + l.stops, 0);
      const bStops = b.outboundLegs.reduce((s, l) => s + l.stops, 0);
      return aStops - bStops;
    }));
  }, []);

  return {
    offers, loading, error, searchCount, lastSearchTime, sourceStats, currentParams,
    search, filterDirect, sortBy,
    selectedOffer, selectOffer: setSelectedOffer,
  };
}

interface UseMonitorsResult {
  monitors: Monitor[];
  add: (params: SearchParams, targetPrice: number) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
}

export function useMonitors(): UseMonitorsResult {
  const [monitors, setMonitors] = useState<Monitor[]>(() => {
    try {
      const raw = localStorage.getItem("viagens_scheduler_v1_monitors");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const persist = useCallback((m: Monitor[]) => {
    localStorage.setItem("viagens_scheduler_v1_monitors", JSON.stringify(m));
    setMonitors(m);
  }, []);

  const add = useCallback((params: SearchParams, targetPrice: number) => {
    const monitor: Monitor = {
      id: Math.random().toString(36).slice(2, 10),
      params,
      targetPrice,
      active: true,
      created: new Date().toISOString(),
      alerts: [],
    };
    persist([monitor, ...monitors].slice(0, 20));
  }, [monitors, persist]);

  const remove = useCallback((id: string) => {
    persist(monitors.filter((m) => m.id !== id));
  }, [monitors, persist]);

  const toggle = useCallback((id: string) => {
    persist(monitors.map((m) => m.id === id ? { ...m, active: !m.active } : m));
  }, [monitors, persist]);

  return { monitors, add, remove, toggle };
}
