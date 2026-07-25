import { useState } from 'react';
import type { FlightOffer } from '../types';
import { formatDuration } from '../lib/format';
import { openBookingLink } from '../lib/searchEngine';
import AiAnalysisPanel from './AiAnalysisPanel';

interface Props {
  offer: FlightOffer;
  onClose: () => void;
  onMonitor: () => void;
}

function Tab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${active ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-dark-300 hover:text-dark-100 hover:bg-dark-600/50"}`}>
      {children}
    </button>
  );
}

function fp(p: number, c: string): string { const s: Record<string,string>={EUR:"€",USD:"$",BRL:"R$"}; return `${s[c]||c} ${p}`; }

function ItineraryTab({ legs }: { legs: FlightOffer['outboundLegs'] }) {
  return (
    <div className="space-y-4">
      {legs.map((leg, i) => (
        <div key={i} className="bg-dark-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-dark-50 text-base">{leg.airlineName}</span>
              <span className="text-xs text-dark-400 font-mono bg-dark-700 px-2 py-0.5 rounded">{leg.flightNumber}</span>
            </div>
            <span className="text-xs text-dark-400">{leg.aircraft}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold font-mono text-dark-50">{leg.departure.slice(11, 16)}</div>
              <div className="text-sm text-dark-300 font-semibold mt-1">{leg.departureAirport}</div>
              {leg.departureTerminal && <div className="text-xs text-dark-500">Terminal {leg.departureTerminal}</div>}
            </div>

            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs text-dark-300 font-medium">{formatDuration(leg.durationMinutes)}</div>
              <div className="w-full relative">
                <div className="h-px bg-dark-500 w-full" />
                {leg.stops > 0 && leg.stopAirports?.map((ap, j) => (
                  <div key={j} className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-dark-800" style={{ left: `${((j + 1) / (leg.stops + 1)) * 100}%` }} title={ap} />
                ))}
              </div>
              <div className="text-xs text-dark-400">
                {leg.stops === 0 ? "Voo direto" : `${leg.stops} escala${leg.stops > 1 ? "s" : ""}`}
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold font-mono text-dark-50">{leg.arrival.slice(11, 16)}</div>
              <div className="text-sm text-dark-300 font-semibold mt-1">{leg.arrivalAirport}</div>
              {leg.arrivalTerminal && <div className="text-xs text-dark-500">Terminal {leg.arrivalTerminal}</div>}
            </div>
          </div>

          {leg.operatingCarrier && <div className="mt-3 text-xs text-dark-500">Operado por: {leg.operatingCarrier}</div>}
        </div>
      ))}
    </div>
  );
}

function FareTab({ fare, currency }: { fare: FlightOffer['fareBreakdown']; currency: string }) {
  const items = [["Tarifa base", fare.baseFare], ["Taxas aeroportuárias", fare.airportTax], ["Impostos locais", fare.localTaxes], ["Taxa de serviço", fare.serviceFee]];
  return (
    <div className="space-y-4">
      <div className="bg-dark-800/50 rounded-xl p-5">
        <h4 className="text-sm font-bold text-dark-200 mb-3">Composição do Preço</h4>
        <div className="space-y-2.5">
          {items.map(([l, v]) => (
            <div key={l as string} className="flex justify-between text-sm">
              <span className="text-dark-300">{l}</span>
              <span className="font-mono text-dark-100">{fp(v as number, currency)}</span>
            </div>
          ))}
          <div className="border-t border-dark-600 pt-2.5 flex justify-between font-bold">
            <span className="text-dark-50">Total taxas</span>
            <span className="text-gradient font-mono">{fp(fare.totalFees, currency)}</span>
          </div>
        </div>
      </div>
      <div className="bg-dark-800/50 rounded-xl p-5">
        <h4 className="text-sm font-bold text-dark-200 mb-3">Bagagem</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-dark-300">Mão</span><span className="text-dark-100">{fare.baggageHand}</span></div>
          <div className="flex justify-between text-sm"><span className="text-dark-300">Despacho</span><span className="text-dark-100">{fare.baggageChecked}</span></div>
        </div>
      </div>
    </div>
  );
}

function RulesTab({ rules }: { rules: FlightOffer['ticketRules'] }) {
  const items = [["Cancelamento", rules.cancellation], ["Reembolso", rules.refund], ["Alteração", rules.change], ["Bagagem despacho", rules.checkedBaggage], ["Bagagem mão", rules.handBaggage], ["Assento", rules.seatSelection]];
  return (
    <div className="bg-dark-800/50 rounded-xl p-5">
      <div className="space-y-4">
        {items.map(([l, v]) => (
          <div key={l as string}>
            <div className="text-xs text-dark-400 uppercase tracking-wider mb-1">{l}</div>
            <div className="text-sm text-dark-100">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ offer }: { offer: FlightOffer }) {
  const { priceHistory: history, currency, origin, destination, totalPrice } = offer;
  if (history.length < 3) {
    return (
      <div className="bg-dark-800/50 rounded-xl p-5">
        <p className="text-dark-400 text-sm">
          Histórico ainda curto pra essa rota ({history.length} {history.length === 1 ? 'busca registrada' : 'buscas registradas'}).
          O gráfico aparece a partir de 3 buscas - a análise por IA já funciona desde já.
        </p>
        <AiAnalysisPanel origin={origin} destination={destination} currentPrice={totalPrice} currency={currency} history={history} />
      </div>
    );
  }
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const w = 400, h = 150, pad = 30;
  const pts = prices.map((p, i) => `${pad + (i / (prices.length - 1)) * (w - pad * 2)},${pad + ((max - p) / range) * (h - pad * 2)}`).join(" ");
  return (
    <div className="bg-dark-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-dark-200">Histórico de Preços</h4>
        <div className="flex gap-3 text-xs">
          <span className="text-emerald-400">Min: {fp(min, currency)}</span>
          <span className="text-red-400">Max: {fp(max, currency)}</span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = pad + pct * (h - pad * 2);
          return <g key={pct}><line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#3f3f46" strokeWidth="0.5" /><text x={pad - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#71717a">{fp(Math.round(max - pct * range), currency)}</text></g>;
        })}
        <polygon fill="url(#ag)" points={`${pad},${h - pad} ${pts} ${w - pad},${h - pad}`} />
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={pts} />
        {prices.map((p, i) => i % 5 !== 0 ? null : <circle key={i} cx={pad + (i / (prices.length - 1)) * (w - pad * 2)} cy={pad + ((max - p) / range) * (h - pad * 2)} r="3" fill="#3b82f6" stroke="#0f0f14" strokeWidth="2" />)}
      </svg>
      <AiAnalysisPanel origin={origin} destination={destination} currentPrice={totalPrice} currency={currency} history={history} />
    </div>
  );
}

export default function DetailModal({ offer, onClose, onMonitor }: Props) {
  const [tab, setTab] = useState<"itinerary"|"fare"|"rules"|"history">("itinerary");
  const out = offer.outboundLegs[0];
  const ret = offer.returnLegs?.[0];
  const isLink = offer.totalPrice === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-800 border border-dark-600/50 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-slide-up">

        {/* Header */}
        <div className="sticky top-0 bg-dark-800/95 backdrop-blur-xl border-b border-dark-600/50 p-5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-dark-50">{offer.origin} → {offer.destination}</h2>
            <p className="text-sm text-dark-400 mt-0.5">
              {out.departure.slice(0, 10)}{ret && ` — ${ret.departure.slice(0, 10)}`}
              {!isLink && ` • ${out.airlineName}`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-dark-400 hover:text-dark-100 transition-all text-lg">&times;</button>
        </div>

        {/* Tabs */}
        {!isLink && (
          <div className="px-5 pt-4 flex gap-2 border-b border-dark-600/50 overflow-x-auto scrollbar-none">
            <Tab active={tab==="itinerary"} onClick={()=>setTab("itinerary")}>Itinerário</Tab>
            <Tab active={tab==="fare"} onClick={()=>setTab("fare")}>Tarifas</Tab>
            <Tab active={tab==="rules"} onClick={()=>setTab("rules")}>Regras</Tab>
            {offer.priceHistory.length >= 1 && <Tab active={tab==="history"} onClick={()=>setTab("history")}>Histórico</Tab>}
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {isLink ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-dark-50 mb-2">Pesquisa de voos para esta rota</h3>
              <p className="text-sm text-dark-400 mb-6 max-w-sm mx-auto">
                Clique abaixo para abrir a busca real de voos com preços atualizados nesta plataforma.
              </p>
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <a href={offer.bookingLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-dark-700/50 border border-dark-600/50 hover:border-green-500/30 transition-all">
                  <span className="text-2xl">🟢</span>
                  <div className="text-left flex-1"><div className="text-sm font-bold text-dark-50">Google Flights</div><div className="text-xs text-dark-400">Pesquisa real com preços ao vivo</div></div>
                  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
                {offer.deepLink && (
                  <a href={offer.deepLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-dark-700/50 border border-dark-600/50 hover:border-blue-500/30 transition-all">
                    <span className="text-2xl">🔵</span>
                    <div className="text-left flex-1"><div className="text-sm font-bold text-dark-50">Skyscanner</div><div className="text-xs text-dark-400">Compare preços entre agências</div></div>
                    <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <>
              {tab === "itinerary" && <ItineraryTab legs={offer.outboundLegs} />}
              {tab === "fare" && <FareTab fare={offer.fareBreakdown} currency={offer.currency} />}
              {tab === "rules" && <RulesTab rules={offer.ticketRules} />}
              {tab === "history" && <HistoryTab offer={offer} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-dark-800/95 backdrop-blur-xl border-t border-dark-600/50 p-5 flex items-center justify-between">
          {!isLink ? (
            <>
              <button onClick={onMonitor} className="px-4 py-2.5 text-sm text-dark-300 hover:text-emerald-400 border border-dark-600 hover:border-emerald-500/30 rounded-xl transition-all">
                Monitorar preço
              </button>
              <div className="flex items-center gap-2">
                {offer.deepLink && (
                  <a href={offer.deepLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 text-sm text-dark-300 border border-dark-600 rounded-xl hover:border-blue-500/30 hover:text-blue-400 transition-all">
                    Skyscanner
                  </a>
                )}
                <button onClick={() => openBookingLink(offer)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20">
                  Reservar — {fp(offer.totalPrice, offer.currency)}
                </button>
              </div>
            </>
          ) : (
            <button onClick={onClose} className="w-full py-2.5 text-sm text-dark-300 border border-dark-600 rounded-xl hover:bg-dark-700 transition-all">Fechar</button>
          )}
        </div>
      </div>
    </div>
  );
}
