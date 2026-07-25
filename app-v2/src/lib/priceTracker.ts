/**
 * Histórico de preços 100% real: cada vez que uma busca real (Google Flights,
 * Skyscanner ou Travelpayouts) retorna uma oferta, guardamos um ponto
 * {timestamp, price} no localStorage, por rota. Nada aqui é inventado -
 * se você nunca buscou essa rota antes, o histórico vem vazio (e a UI deve
 * deixar isso claro, não preencher com dado falso).
 */
import type { PriceHistoryPoint } from '../types';

const STORAGE_KEY = 'viagens_price_history_v1';
const MAX_POINTS_PER_ROUTE = 200;
const MAX_ROUTES = 60;

interface StoredHistory {
  [routeKey: string]: PriceHistoryPoint[];
}

function routeKey(origin: string, destination: string): string {
  return `${origin.toUpperCase()}-${destination.toUpperCase()}`;
}

function load(): StoredHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data: StoredHistory) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage cheio ou indisponível - falha silenciosa, não é crítico
  }
}

/** Grava um preço real observado para uma rota (chamar só com dados de fontes reais). */
export function recordPrice(origin: string, destination: string, price: number, source: string) {
  if (!price || price <= 0) return;
  const data = load();
  const key = routeKey(origin, destination);
  const points = data[key] || [];
  points.push({ timestamp: new Date().toISOString(), price, source });
  data[key] = points.slice(-MAX_POINTS_PER_ROUTE);

  const keys = Object.keys(data);
  if (keys.length > MAX_ROUTES) {
    keys
      .sort((a, b) => {
        const aLast = data[a][data[a].length - 1]?.timestamp || '';
        const bLast = data[b][data[b].length - 1]?.timestamp || '';
        return aLast.localeCompare(bLast);
      })
      .slice(0, keys.length - MAX_ROUTES)
      .forEach((k) => delete data[k]);
  }

  save(data);
}

/** Recupera o histórico real conhecido para uma rota (pode vir vazio). */
export function getHistory(origin: string, destination: string): PriceHistoryPoint[] {
  const data = load();
  return data[routeKey(origin, destination)] || [];
}

export interface PriceStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  latest: number;
  changeVsAvgPct: number;
  trend: 'down' | 'up' | 'flat';
}

/** Estatísticas simples e honestas sobre o histórico real acumulado - sem IA, só aritmética. */
export function computeStats(history: PriceHistoryPoint[]): PriceStats | null {
  if (history.length === 0) return null;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const latest = prices[prices.length - 1];
  const changeVsAvgPct = avg > 0 ? Math.round(((latest - avg) / avg) * 100) : 0;
  const trend = changeVsAvgPct < -3 ? 'down' : changeVsAvgPct > 3 ? 'up' : 'flat';
  return { count: history.length, min, max, avg: Math.round(avg), latest, changeVsAvgPct, trend };
}
