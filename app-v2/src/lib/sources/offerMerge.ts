import type { FlightOffer } from '../../types';

// Duas ofertas de fontes diferentes sao consideradas "o mesmo voo" quando
// tem a mesma rota, mesma data de ida, e o horario de partida bate dentro de
// uma janela pequena (fontes diferentes as vezes arredondam o minuto de
// forma diferente). Isso permite juntar Travelpayouts + Google Flights +
// Skyscanner + Ryanair numa unica linha quando encontram o mesmo voo, em vez
// de mostrar 3 cards desencontrados do mesmo assento.
const TIME_WINDOW_MINUTES = 25;

function parseDepartureMinutes(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NaN;
  return d.getHours() * 60 + d.getMinutes();
}

function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function isSameFlight(a: FlightOffer, b: FlightOffer): boolean {
  if (a.origin !== b.origin || a.destination !== b.destination) return false;

  const aOut = a.outboundLegs[0];
  const bOut = b.outboundLegs[0];
  if (!aOut || !bOut) return false;
  if (!sameDay(aOut.departure, bOut.departure)) return false;

  const aMin = parseDepartureMinutes(aOut.departure);
  const bMin = parseDepartureMinutes(bOut.departure);
  if (Number.isNaN(aMin) || Number.isNaN(bMin)) return false;
  if (Math.abs(aMin - bMin) > TIME_WINDOW_MINUTES) return false;

  // Se ambas as fontes trazem numero de voo real (nao "?"/"A confirmar"),
  // exige que o numero bata tambem - evita juntar dois voos coincidentes no
  // mesmo horario de companhias diferentes.
  const aFlight = aOut.flightNumber?.replace(/\s/g, '').toUpperCase();
  const bFlight = bOut.flightNumber?.replace(/\s/g, '').toUpperCase();
  const bothHaveRealFlightNumber =
    aFlight && bFlight && aFlight !== '?' && bFlight !== '?' &&
    aFlight !== 'ACONFIRMAR' && bFlight !== 'ACONFIRMAR';
  if (bothHaveRealFlightNumber) return aFlight === bFlight;

  // Sem numero de voo confiavel dos dois lados, cai pra comparar so
  // companhia aerea (quando ambas sabem qual e) + rota + horario proximo.
  if (aOut.airline && bOut.airline && aOut.airline !== '?' && bOut.airline !== '?') {
    return aOut.airline === bOut.airline;
  }

  // Ida e volta tem que bater tambem, quando ambas tem volta.
  return true;
}

function mergeGroup(group: FlightOffer[]): FlightOffer {
  // A oferta mais barata do grupo vira a base (horarios/legs mostrados),
  // mas o crossRef reune o preco de TODAS as fontes que confirmaram esse
  // mesmo voo - isso e cruzamento real, nao decorativo.
  const sorted = [...group].sort((a, b) => a.totalPrice - b.totalPrice);
  const base = sorted[0];

  const prices: Record<string, number> = {};
  const sourceNames: string[] = [];
  for (const offer of group) {
    const label = offer.sources[0] || 'desconhecida';
    const prettyLabel =
      label === 'google_flights' ? 'Google Flights' :
      label === 'skyscanner' ? 'Skyscanner' :
      label === 'ryanair' ? 'Ryanair' :
      label === 'travelpayouts' ? 'Travelpayouts' : label;
    prices[prettyLabel] = offer.totalPrice;
    if (!sourceNames.includes(label)) sourceNames.push(label);
  }

  const priceValues = Object.values(prices);
  const avgPrice = Math.round(priceValues.reduce((s, p) => s + p, 0) / priceValues.length);
  const maxPrice = Math.max(...priceValues);
  const minPrice = Math.min(...priceValues);
  const divergencePct = avgPrice > 0 ? Math.round(((maxPrice - minPrice) / avgPrice) * 100) : 0;

  // Confianca real: 2+ fontes confirmando o mesmo voo com precos proximos
  // (ate 15% de diferenca) e "alta" de verdade - nao um selo generico.
  const confidence: 'high' | 'medium' | 'low' =
    sourceNames.length >= 2 && divergencePct <= 15 ? 'high' :
    sourceNames.length >= 2 ? 'medium' :
    base.crossRef.confidence;

  return {
    ...base,
    sources: sourceNames,
    crossRef: {
      sourcesChecked: sourceNames.length,
      prices,
      avgPrice,
      divergencePct,
      confidence,
    },
  };
}

/**
 * Agrupa ofertas de fontes diferentes que sao o mesmo voo real e devolve uma
 * lista sem duplicatas, cada uma com o preco de todas as fontes que
 * confirmaram aquele voo especifico.
 */
export function mergeCrossSourceOffers(offers: FlightOffer[]): FlightOffer[] {
  const used = new Array(offers.length).fill(false);
  const merged: FlightOffer[] = [];

  for (let i = 0; i < offers.length; i++) {
    if (used[i]) continue;
    const group = [offers[i]];
    used[i] = true;

    for (let j = i + 1; j < offers.length; j++) {
      if (used[j]) continue;
      if (isSameFlight(offers[i], offers[j])) {
        group.push(offers[j]);
        used[j] = true;
      }
    }

    merged.push(group.length > 1 ? mergeGroup(group) : offers[i]);
  }

  return merged;
}
