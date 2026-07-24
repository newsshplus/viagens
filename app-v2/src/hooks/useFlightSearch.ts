import { useState, useCallback, useEffect, useRef } from 'react';
import type { FlightOffer, SearchParams } from '../types';
import { searchFlights } from '../lib/searchEngine';
import { detectPriceAnomaly, generateMonitorAlert } from '../lib/scheduler';
import type { Monitor } from '../types';

interface UseSearchResult {
  offers: FlightOffer[];
  loading: boolean;
  error: string | null;
  searchCount: number;
  lastSearchTime: string | null;
  search: (params: SearchParams) => Promise<void>;
  filterDirect: (direct: boolean) => void;
  sortBy: (key: "price" | "duration" | "stops") => void;
  selectedOffer: FlightOffer | null;
  selectOffer: (offer: FlightOffer | null) => void;
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

  const search = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setCurrentParams(params);

    try {
      const results = await searchFlights({
        origin: params.origin,
        destination: params.destination,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        adults: params.adults,
        currency: params.currency,
        tripType: params.tripType,
      });

      setAllOffers(results);
      setOffers(results);
      setSearchCount((c) => c + 1);
      setLastSearchTime(new Date().toISOString());
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
    offers, loading, error, searchCount, lastSearchTime,
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
