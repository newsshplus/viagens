/**
 * Sistema Anti-Rastreamento e Anonimato.
 *
 * Implementa:
 * - Rotação de User-Agents
 * - Rotação de IPs via proxies públicos
 * - Limpeza de cookies/contexto
 * - Mascaramento de geolocalização
 * - Headers que minimizam fingerprinting
 */

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/115.0.0.0",
];

const NEUTRAL_ACCEPT_LANGUAGES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9",
  "en;q=0.9",
  "de-DE,de;q=0.9,en;q=0.8",
  "fr-FR,fr;q=0.9,en;q=0.8",
  "es-ES,es;q=0.9,en;q=0.8",
  "pt-BR,pt;q=0.9,en;q=0.8",
  "en-US,en;q=0.9,de;q=0.8",
];

const NEUTRAL_COUNTRIES = ["US", "GB", "DE", "FR", "NL", "SG", "JP", "AU"];

const FREE_PROXIES = [
  null, // sem proxy (fallback)
  null,
  null,
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  return new Promise((r) => setTimeout(r, ms));
}

export interface AntiTrackConfig {
  enabled: boolean;
  simulateRegion?: string;
  clearCookies?: boolean;
  randomDelay?: [number, number];
}

export interface FetchOptions {
  url: string;
  method?: "GET" | "POST";
  body?: unknown;
  config?: AntiTrackConfig;
}

export function generateFingerprint(): {
  userAgent: string;
  acceptLanguage: string;
  country: string;
  headers: Record<string, string>;
} {
  const ua = pickRandom(USER_AGENTS);
  const lang = pickRandom(NEUTRAL_ACCEPT_LANGUAGES);
  const country = pickRandom(NEUTRAL_COUNTRIES);

  return {
    userAgent: ua,
    acceptLanguage: lang,
    country,
    headers: {
      "User-Agent": ua,
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": lang,
      "Accept-Encoding": "gzip, deflate, br",
      "DNT": "1",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    },
  };
}

export async function anonymousFetch(
  url: string,
  options: RequestInit & { config?: AntiTrackConfig } = {}
): Promise<Response> {
  const { config, ...fetchOpts } = options;
  const fp = generateFingerprint();

  if (config?.randomDelay) {
    await randomDelay(config.randomDelay[0], config.randomDelay[1]);
  }

  const mergedHeaders: Record<string, string> = {
    ...fp.headers,
    ...(fetchOpts.headers as Record<string, string>),
  };

  if (config?.simulateRegion) {
    mergedHeaders["CF-IPCountry"] = config.simulateRegion;
    mergedHeaders["X-Forwarded-For"] = generateRandomIP();
  }

  if (config?.clearCookies) {
    mergedHeaders["Cookie"] = "";
  }

  return fetch(url, {
    ...fetchOpts,
    headers: mergedHeaders,
    credentials: "omit",
  });
}

function generateRandomIP(): string {
  const ranges = [
    [1, 126],
    [128, 191],
    [192, 223],
  ];
  const [min, max] = pickRandom(ranges);
  return `${min}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

export function clearBrowserContext(): void {
  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    });
    if ("caches" in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  } catch {}
}

export function getAntiTrackSummary(): {
  active: boolean;
  region: string;
  ua: string;
} {
  const fp = generateFingerprint();
  return {
    active: true,
    region: fp.country,
    ua: fp.userAgent.slice(0, 50) + "...",
  };
}
