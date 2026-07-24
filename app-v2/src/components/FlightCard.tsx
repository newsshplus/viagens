import type { FlightOffer } from '../types';
import { formatDuration } from '../lib/format';
import { openBookingLink } from '../lib/searchEngine';

interface Props {
  offer: FlightOffer;
  onSelect: (offer: FlightOffer) => void;
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const c: Record<string, string> = {
    high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c[confidence] || c.low}`}>
      {confidence === "high" ? "Preço verificado" : confidence === "medium" ? "Estimativa" : "Ver preços"}
    </span>
  );
}

function PromoTag({ tag }: { tag: import('../types').PromoTag }) {
  const c: Record<string, string> = {
    green: "bg-emerald-500/20 text-emerald-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    red: "bg-red-500/20 text-red-400",
    blue: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c[tag.color]}`}>
      {tag.icon} {tag.text}
    </span>
  );
}

function MiniChart({ history }: { history: { price: number }[] }) {
  if (history.length < 3) return null;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 100, h = 28;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="opacity-50">
      <defs>
        <linearGradient id={`mc-${prices[0]}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#mc-${prices[0]})`} points={`0,${h} ${pts} ${w},${h}`} />
      <polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" points={pts} />
    </svg>
  );
}

function fmt(price: number, cur: string): string {
  const s: Record<string, string> = { EUR: "€", USD: "$", BRL: "R$" };
  return `${s[cur] || cur} ${price}`;
}

export default function FlightCard({ offer, onSelect }: Props) {
  const out = offer.outboundLegs[0];
  const ret = offer.returnLegs?.[0];
  const isLink = offer.totalPrice === 0;
  const hasStops = out.stops > 0;

  return (
    <div
      onClick={() => onSelect(offer)}
      className="glass glass-hover rounded-2xl p-5 cursor-pointer animate-slide-up group relative overflow-hidden"
    >
      {offer.promoTag && (
        <div className="absolute top-3 right-3"><PromoTag tag={offer.promoTag} /></div>
      )}

      {/* Header: airline + flight number + badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-dark-50">{out.airlineName}</span>
          <span className="text-xs text-dark-400 font-mono">{out.flightNumber}</span>
          {offer.sources[0] && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
              offer.sources[0] === 'google_flights' ? 'bg-blue-500/15 text-blue-400' :
              offer.sources[0] === 'skyscanner' ? 'bg-cyan-500/15 text-cyan-400' :
              'bg-purple-500/15 text-purple-400'
            }`}>
              {offer.sources[0] === 'google_flights' ? 'Google' :
               offer.sources[0] === 'skyscanner' ? 'Skyscanner' : 'Travelpayouts'}
            </span>
          )}
        </div>
        <ConfidenceBadge confidence={offer.crossRef.confidence} />
      </div>

      {/* Ida */}
      <div className="flex items-center gap-3 mb-2">
        <div className="text-center min-w-[52px]">
          <div className="text-xl font-bold font-mono text-dark-50">{out.departure.slice(11, 16)}</div>
          <div className="text-xs text-dark-300 font-semibold">{out.departureAirport}</div>
          {out.departureTerminal && <div className="text-[10px] text-dark-500">Terminal {out.departureTerminal}</div>}
        </div>

        <div className="flex-1 flex flex-col items-center gap-1 px-2">
          <div className="text-[11px] text-dark-300 font-medium">{formatDuration(out.durationMinutes)}</div>
          <div className="w-full relative h-px bg-dark-500">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${hasStops ? "bg-yellow-400" : "bg-emerald-400"}`} />
            {hasStops && out.stopAirports?.map((ap, j) => (
              <div key={j} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400/70" style={{ left: `${((j + 1) / (out.stops + 1)) * 100}%` }} />
            ))}
          </div>
          <div className="text-[11px] text-dark-400">
            {hasStops ? `${out.stops} escala${out.stops > 1 ? "s" : ""}` : "Direto"}
          </div>
        </div>

        <div className="text-center min-w-[52px]">
          <div className="text-xl font-bold font-mono text-dark-50">{out.arrival.slice(11, 16)}</div>
          <div className="text-xs text-dark-300 font-semibold">{out.arrivalAirport}</div>
          {out.arrivalTerminal && <div className="text-[10px] text-dark-500">Terminal {out.arrivalTerminal}</div>}
        </div>
      </div>

      {/* Volta */}
      {ret && (
        <div className="flex items-center gap-3 mb-3 pt-2.5 border-t border-dark-600/40">
          <div className="text-center min-w-[52px]">
            <div className="text-sm font-mono text-dark-200">{ret.departure.slice(11, 16)}</div>
            <div className="text-[11px] text-dark-400">{ret.departureAirport}</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1 px-2">
            <div className="text-[10px] text-dark-400">{formatDuration(ret.durationMinutes)}</div>
            <div className="w-full h-px bg-dark-600" />
            <div className="text-[10px] text-dark-500">
              {ret.stops === 0 ? "Direto" : `${ret.stops} escala`}
            </div>
          </div>
          <div className="text-center min-w-[52px]">
            <div className="text-sm font-mono text-dark-200">{ret.arrival.slice(11, 16)}</div>
            <div className="text-[11px] text-dark-400">{ret.arrivalAirport}</div>
          </div>
        </div>
      )}

      {/* Footer: price + chart + sources */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          {offer.priceHistory.length > 0 && (
            <div className="flex items-center gap-2">
              <MiniChart history={offer.priceHistory.slice(-15)} />
              <span className="text-[10px] text-dark-400">30 dias</span>
            </div>
          )}
          {Object.keys(offer.crossRef.prices).length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(offer.crossRef.prices).map(([src, price]) => (
                <span key={src} className="text-[10px] text-dark-400">
                  {src.length > 12 ? src.slice(0, 10) + "…" : src}: {fmt(price, offer.currency)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          {isLink ? (
            <div className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">
              Buscar voos reais
            </div>
          ) : (
            <>
              <div className="text-2xl font-extrabold text-gradient group-hover:scale-105 transition-transform">
                {fmt(offer.totalPrice, offer.currency)}
              </div>
              <div className="text-[10px] text-dark-400">por pessoa</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
