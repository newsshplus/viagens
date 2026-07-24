import type { FlightOffer } from '../types';
import { formatDuration } from '../lib/format';

interface Props {
  offer: FlightOffer;
  onSelect: (offer: FlightOffer) => void;
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  const labels: Record<string, string> = {
    high: "Preço confirmado",
    medium: "Preço estimado",
    low: "Ver preço",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[confidence] || colors.low}`}>
      {labels[confidence] || labels.low}
    </span>
  );
}

function PromoBadge({ tag }: { tag: import('../types').PromoTag }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-500/20 text-emerald-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    red: "bg-red-500/20 text-red-400",
    blue: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colors[tag.color]}`}>
      <span>{tag.icon}</span>
      {tag.text}
    </span>
  );
}

function MiniPriceChart({ history }: { history: { price: number }[] }) {
  if (!history.length) return null;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 120;
  const h = 32;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <defs>
        <linearGradient id={`pg-${prices[0]}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="rgb(59,130,246)" strokeWidth="1.5" points={points} />
      <polygon fill={`url(#pg-${prices[0]})`} points={`0,${h} ${points} ${w},${h}`} />
    </svg>
  );
}

function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", BRL: "R$" };
  return `${symbols[currency] || currency} ${price}`;
}

export default function FlightCard({ offer, onSelect }: Props) {
  const isSearchLink = offer.totalPrice === 0;
  const outbound = offer.outboundLegs[0];
  const returnLeg = offer.returnLegs?.[0];

  if (isSearchLink) {
    return (
      <div
        onClick={() => onSelect(offer)}
        className="glass glass-hover rounded-2xl p-5 cursor-pointer animate-slide-up group relative overflow-hidden border-dashed border-dark-500/50 hover:border-blue-500/30"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🔍</span>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-dark-50 group-hover:text-blue-400 transition-colors">
              {outbound.airlineName}
            </h3>
            <p className="text-sm text-dark-300 mt-0.5">
              Clique para abrir a busca real de voos nesta plataforma
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-dark-400 font-mono">{offer.origin} → {offer.destination}</span>
              <span className="text-xs text-dark-500">•</span>
              <span className="text-xs text-dark-400">{offer.outboundLegs[0].departure.slice(0, 10)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all">
              Buscar preços
            </div>
            <span className="text-[10px] text-dark-500">Pesquisa real e atualizada</span>
          </div>
        </div>
      </div>
    );
  }

  const hasStops = outbound.stops > 0;

  return (
    <div
      onClick={() => onSelect(offer)}
      className="glass glass-hover rounded-2xl p-5 cursor-pointer animate-slide-up group relative overflow-hidden"
    >
      {offer.promoTag && (
        <div className="absolute top-3 right-3">
          <PromoBadge tag={offer.promoTag} />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-dark-200 uppercase tracking-wider">
            {outbound.airlineName}
          </span>
          <span className="text-xs text-dark-400 font-mono">{outbound.flightNumber}</span>
        </div>
        <ConfidenceBadge confidence={offer.crossRef.confidence} />
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <div className="text-xl font-bold font-mono">{outbound.departure.slice(11, 16)}</div>
          <div className="text-xs text-dark-300">{outbound.departureAirport}</div>
          {outbound.departureTerminal && (
            <div className="text-[10px] text-dark-500">T{outbound.departureTerminal}</div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="text-xs text-dark-300">{formatDuration(outbound.durationMinutes)}</div>
          <div className="w-full relative h-px bg-dark-500">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${hasStops ? "bg-yellow-400" : "bg-emerald-400"}`} />
          </div>
          <div className="text-xs text-dark-400">
            {hasStops ? `${outbound.stops} escala${outbound.stops > 1 ? "s" : ""}` : "Direto"}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xl font-bold font-mono">{outbound.arrival.slice(11, 16)}</div>
          <div className="text-xs text-dark-300">{outbound.arrivalAirport}</div>
          {outbound.arrivalTerminal && (
            <div className="text-[10px] text-dark-500">T{outbound.arrivalTerminal}</div>
          )}
        </div>
      </div>

      {returnLeg && (
        <div className="flex items-center gap-4 mb-4 pt-3 border-t border-dark-600/50">
          <div className="text-center">
            <div className="text-sm font-mono text-dark-200">{returnLeg.departure.slice(11, 16)}</div>
            <div className="text-xs text-dark-400">{returnLeg.departureAirport}</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="text-xs text-dark-400">{formatDuration(returnLeg.durationMinutes)}</div>
            <div className="w-full h-px bg-dark-600" />
            <div className="text-xs text-dark-500">
              {returnLeg.stops === 0 ? "Direto" : `${returnLeg.stops} escala${returnLeg.stops > 1 ? "s" : ""}`}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-mono text-dark-200">{returnLeg.arrival.slice(11, 16)}</div>
            <div className="text-xs text-dark-400">{returnLeg.arrivalAirport}</div>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          {offer.priceHistory.length > 0 && (
            <div className="flex items-center gap-2">
              <MiniPriceChart history={offer.priceHistory.slice(-15)} />
              <span className="text-xs text-dark-400">30 dias</span>
            </div>
          )}
          {Object.keys(offer.crossRef.prices).length > 1 && (
            <div className="flex items-center gap-2">
              {Object.entries(offer.crossRef.prices).map(([src, price]) => (
                <span key={src} className="text-xs text-dark-400">
                  {src === "travelpayouts" ? "TP" : src === "google_flights" ? "GF" : "SK"}: {formatPrice(price, offer.currency)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-gradient group-hover:scale-105 transition-transform">
            {formatPrice(offer.totalPrice, offer.currency)}
          </div>
          <div className="text-xs text-dark-400">por pessoa</div>
        </div>
      </div>
    </div>
  );
}
