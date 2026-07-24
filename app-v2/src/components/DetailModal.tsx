import { useState } from 'react';
import type { FlightOffer } from '../types';
import { formatDuration } from '../lib/format';

interface Props {
  offer: FlightOffer;
  onClose: () => void;
  onMonitor: () => void;
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active
          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
          : "text-dark-300 hover:text-dark-100 hover:bg-dark-600/50"
      }`}
    >
      {children}
    </button>
  );
}

function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", BRL: "R$" };
  return `${symbols[currency] || currency} ${price}`;
}

function ItineraryTab({ legs, currency }: { legs: FlightOffer['outboundLegs']; currency: string }) {
  return (
    <div className="space-y-4">
      {legs.map((leg, i) => (
        <div key={i} className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-dark-50">{leg.airlineName}</span>
              <span className="text-xs text-dark-400 font-mono">{leg.flightNumber}</span>
            </div>
            <span className="text-xs text-dark-400">{leg.aircraft}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">{leg.departure.slice(11, 16)}</div>
              <div className="text-sm text-dark-300">{leg.departureAirport}</div>
              <div className="text-xs text-dark-500">Terminal {leg.departureTerminal || "—"}</div>
            </div>

            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs text-dark-300">{formatDuration(leg.durationMinutes)}</div>
              <div className="w-full relative">
                <div className="h-px bg-dark-500 w-full" />
                {leg.stops > 0 && leg.stopAirports?.map((ap, j) => (
                  <div
                    key={j}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-400"
                    style={{ left: `${((j + 1) / (leg.stops + 1)) * 100}%` }}
                    title={`${ap} — ${leg.stopDurations?.[j] || 0}min`}
                  />
                ))}
              </div>
              <div className="text-xs text-dark-400">
                {leg.stops === 0 ? "Voo direto" : `${leg.stops} escala${leg.stops > 1 ? "s" : ""} (${leg.stopAirports?.join(", ")})`}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold font-mono">{leg.arrival.slice(11, 16)}</div>
              <div className="text-sm text-dark-300">{leg.arrivalAirport}</div>
              <div className="text-xs text-dark-500">Terminal {leg.arrivalTerminal || "—"}</div>
            </div>
          </div>

          {leg.operatingCarrier && (
            <div className="mt-3 text-xs text-dark-500">
              Operado por: {leg.operatingCarrier}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FareTab({ fare, currency }: { fare: FlightOffer['fareBreakdown']; currency: string }) {
  const items = [
    ["Tarifa base", fare.baseFare],
    ["Taxas aeroportuárias", fare.airportTax],
    ["Impostos locais", fare.localTaxes],
    ["Taxa de serviço", fare.serviceFee],
  ];

  return (
    <div className="space-y-4">
      <div className="bg-dark-800/50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-dark-200 mb-3">Composição do Preço</h4>
        <div className="space-y-2">
          {items.map(([label, val]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-dark-300">{label}</span>
              <span className="font-mono text-dark-100">{formatPrice(val as number, currency)}</span>
            </div>
          ))}
          <div className="border-t border-dark-600 pt-2 flex justify-between font-semibold">
            <span className="text-dark-50">Total</span>
            <span className="text-gradient font-mono">{formatPrice(fare.totalFees, currency)}</span>
          </div>
        </div>
      </div>

      <div className="bg-dark-800/50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-dark-200 mb-3">Bagagem</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-dark-300">Mão</span>
            <span className="text-dark-100">{fare.baggageHand}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-300">Despacho</span>
            <span className="text-dark-100">{fare.baggageChecked}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RulesTab({ rules }: { rules: FlightOffer['ticketRules'] }) {
  const items = [
    ["Cancelamento", rules.cancellation],
    ["Reembolso", rules.refund],
    ["Alteração", rules.change],
    ["Bagagem despacho", rules.checkedBaggage],
    ["Bagagem mão", rules.handBaggage],
    ["Seleção de assento", rules.seatSelection],
  ];

  return (
    <div className="bg-dark-800/50 rounded-xl p-4">
      <div className="space-y-3">
        {items.map(([label, val]) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-xs text-dark-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm text-dark-100">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceHistoryTab({ history, currency }: { history: FlightOffer['priceHistory']; currency: string }) {
  if (!history.length) return <p className="text-dark-400 text-sm">Sem dados de histórico.</p>;

  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 400;
  const h = 150;
  const pad = 30;

  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (w - pad * 2);
    const y = pad + ((max - p) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="bg-dark-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-dark-200">Histórico de Preços (30 dias)</h4>
        <div className="flex gap-3 text-xs">
          <span className="text-emerald-400">Min: {formatPrice(min, currency)}</span>
          <span className="text-red-400">Max: {formatPrice(max, currency)}</span>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = pad + pct * (h - pad * 2);
          const price = Math.round(max - pct * range);
          return (
            <g key={pct}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgb(63,63,70)" strokeWidth="0.5" />
              <text x={pad - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#71717a">
                {formatPrice(price, currency)}
              </text>
            </g>
          );
        })}

        <polygon fill="url(#areaGrad)" points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`} />
        <polyline fill="none" stroke="rgb(59,130,246)" strokeWidth="2" points={points} />

        {prices.map((p, i) => {
          if (i % 5 !== 0) return null;
          const x = pad + (i / (prices.length - 1)) * (w - pad * 2);
          const y = pad + ((max - p) / range) * (h - pad * 2);
          return (
            <circle key={i} cx={x} cy={y} r="3" fill="rgb(59,130,246)" stroke="rgb(15,15,20)" strokeWidth="2" />
          );
        })}
      </svg>
    </div>
  );
}

export default function DetailModal({ offer, onClose, onMonitor }: Props) {
  const [activeTab, setActiveTab] = useState<"itinerary" | "fare" | "rules" | "history">("itinerary");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-dark-800 border border-dark-600/50 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-dark-800/95 backdrop-blur-xl border-b border-dark-600/50 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-dark-50">
              {offer.origin} → {offer.destination}
            </h2>
            <p className="text-sm text-dark-400">
              {offer.outboundLegs[0].departure.slice(0, 10)}
              {offer.returnLegs && ` — ${offer.returnLegs[0].departure.slice(0, 10)}`}
            </p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-100 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 flex gap-2 border-b border-dark-600/50">
          <TabButton active={activeTab === "itinerary"} onClick={() => setActiveTab("itinerary")}>Itinerário</TabButton>
          <TabButton active={activeTab === "fare"} onClick={() => setActiveTab("fare")}>Tarifas</TabButton>
          <TabButton active={activeTab === "rules"} onClick={() => setActiveTab("rules")}>Regras</TabButton>
          <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>Histórico</TabButton>
        </div>

        <div className="p-4">
          {activeTab === "itinerary" && <ItineraryTab legs={offer.outboundLegs} currency={offer.currency} />}
          {activeTab === "fare" && <FareTab fare={offer.fareBreakdown} currency={offer.currency} />}
          {activeTab === "rules" && <RulesTab rules={offer.ticketRules} />}
          {activeTab === "history" && <PriceHistoryTab history={offer.priceHistory} currency={offer.currency} />}
        </div>

        <div className="sticky bottom-0 bg-dark-800/95 backdrop-blur-xl border-t border-dark-600/50 p-4 flex items-center justify-between">
          <button
            onClick={onMonitor}
            className="px-4 py-2 text-sm text-dark-300 hover:text-emerald-400 border border-dark-600 hover:border-emerald-500/30 rounded-lg transition-all"
          >
            Monitorar preço
          </button>
          <a
            href={offer.bookingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all"
          >
            Reservar — {formatPrice(offer.totalPrice, offer.currency)}
          </a>
        </div>
      </div>
    </div>
  );
}
