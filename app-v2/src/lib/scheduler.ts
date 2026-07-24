/**
 * Sistema de agendamento inteligente de buscas.
 *
 * - Intervalos aleatórios entre buscas
 * - Scan noturno (01:00–05:30) para promoções relâmpago
 * - Detecção de anomalias de preço
 * - Alertas automáticos
 */

import type { SearchConfig, Monitor, MonitorAlert } from '../types';

const DEFAULT_CONFIG: SearchConfig = {
  anonymousMode: true,
  preferredRegions: ["US", "GB", "DE"],
  scanNightMode: true,
  scanNightStart: 1,
  scanNightEnd: 5.5,
  randomIntervalMin: 45,
  randomIntervalMax: 180,
};

const STORAGE_KEY = "viagens_scheduler_v1";

export function loadSchedulerConfig(): SearchConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + "_config");
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSchedulerConfig(config: SearchConfig): void {
  localStorage.setItem(STORAGE_KEY + "_config", JSON.stringify(config));
}

export function loadMonitors(): Monitor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + "_monitors");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMonitors(monitors: Monitor[]): void {
  localStorage.setItem(STORAGE_KEY + "_monitors", JSON.stringify(monitors));
}

export function addMonitor(monitor: Monitor): void {
  const monitors = loadMonitors();
  monitors.unshift(monitor);
  saveMonitors(monitors.slice(0, 20));
}

export function removeMonitor(id: string): void {
  saveMonitors(loadMonitors().filter((m) => m.id !== id));
}

export function toggleMonitor(id: string): void {
  const monitors = loadMonitors().map((m) =>
    m.id === id ? { ...m, active: !m.active } : m
  );
  saveMonitors(monitors);
}

export function isNightScanTime(config: SearchConfig): boolean {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  return hour >= config.scanNightStart && hour <= config.scanNightEnd;
}

export function getNextRandomInterval(config: SearchConfig): number {
  const min = config.randomIntervalMin;
  const max = config.randomIntervalMax;
  return Math.floor(Math.random() * (max - min) + min) * 60 * 1000;
}

export function detectPriceAnomaly(
  currentPrice: number,
  history: { price: number }[],
  thresholdPct: number = 20
): { isAnomaly: boolean; deviationPct: number; avgPrice: number } {
  if (history.length < 3) {
    return { isAnomaly: false, deviationPct: 0, avgPrice: currentPrice };
  }

  const prices = history.map((h) => h.price);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const deviation = ((avg - currentPrice) / avg) * 100;

  return {
    isAnomaly: deviation >= thresholdPct,
    deviationPct: Math.round(deviation),
    avgPrice: Math.round(avg),
  };
}

export function generateMonitorAlert(
  monitor: Monitor,
  currentPrice: number
): MonitorAlert | null {
  if (currentPrice > monitor.targetPrice) return null;

  const pctBelow = Math.round(((monitor.targetPrice - currentPrice) / monitor.targetPrice) * 100);

  return {
    timestamp: new Date().toISOString(),
    price: currentPrice,
    message: `🔥 Preço caiu! ${monitor.params.origin}→${monitor.params.destination} por ${currentPrice} ${monitor.params.currency} (${pctBelow}% abaixo da meta)`,
  };
}

export function formatInterval(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

export function getTimeUntilNightScan(config: SearchConfig): string {
  const now = new Date();
  const currentHour = now.getHours();
  const startHour = config.scanNightStart;

  if (currentHour >= startHour && currentHour <= config.scanNightEnd) {
    return "Ativo agora";
  }

  let hoursUntil = startHour - currentHour;
  if (hoursUntil < 0) hoursUntil += 24;

  return `Em ${hoursUntil}h`;
}
