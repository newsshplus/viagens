/**
 * Guarda as últimas buscas reais feitas (rota + data + passageiros) no
 * navegador, pra permitir refazer uma busca com um clique. Não é histórico
 * de preço - é só "o que você já buscou", pra conveniência.
 */
import type { SearchParams } from '../types';

const STORAGE_KEY = 'viagens_recent_searches_v1';
const MAX_ITEMS = 6;

export function recordSearch(params: SearchParams) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: SearchParams[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(
      (p) => !(p.origin === params.origin && p.destination === params.destination && p.dateFrom === params.dateFrom)
    );
    filtered.unshift(params);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {
    // localStorage indisponível - não é crítico
  }
}

export function getRecentSearches(): SearchParams[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
