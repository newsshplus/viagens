import { useState } from 'react';
import type { FlightOffer } from '../types';
import type { Monitor } from '../types';

interface Props {
  offer: FlightOffer;
  monitors: Monitor[];
  onClose: () => void;
  onAddMonitor: (offer: FlightOffer, price: number) => void;
}

export default function MonitorDialog({ offer, monitors, onClose, onAddMonitor }: Props) {
  const [targetPrice, setTargetPrice] = useState(
    Math.round(offer.totalPrice * 0.85)
  );

  const existingMonitor = monitors.find(
    (m) =>
      m.params.origin === offer.origin &&
      m.params.destination === offer.destination &&
      m.params.dateFrom === offer.outboundLegs[0].departure.slice(0, 10)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-800 border border-dark-600/50 rounded-2xl w-full max-w-md animate-slide-up p-6">
        <h3 className="text-lg font-bold text-dark-50 mb-1">Monitorar preço</h3>
        <p className="text-sm text-dark-400 mb-4">
          {offer.origin} → {offer.destination} • {offer.outboundLegs[0].departure.slice(0, 10)}
        </p>

        {existingMonitor && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-400">
              Já existe um monitor para esta rota/data com meta de {existingMonitor.targetPrice} {offer.currency}.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1 uppercase tracking-wider">
              Preço atual
            </label>
            <div className="text-2xl font-bold text-gradient">
              {offer.currency === "EUR" ? "€" : offer.currency === "USD" ? "$" : "R$"} {offer.totalPrice}
            </div>
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1 uppercase tracking-wider">
              Meta de preço
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2.5 text-sm font-mono text-dark-50 focus:outline-none focus:border-blue-500/50 transition-all"
              />
              <span className="text-xs text-dark-400">{offer.currency}</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[10, 15, 20, 30].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setTargetPrice(Math.round(offer.totalPrice * (1 - pct / 100)))}
                  className="px-2 py-1 text-xs bg-dark-700/50 hover:bg-dark-600/50 text-dark-300 rounded-md border border-dark-600/50 transition-all"
                >
                  -{pct}%
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-dark-500">
            Você receberá uma notificação quando o preço atingir ou ficar abaixo da meta.
            Buscas são realizadas a cada 45min–3h30 com intervalos aleatórios.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-dark-300 border border-dark-600 rounded-xl hover:bg-dark-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onAddMonitor(offer, targetPrice);
              onClose();
            }}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all"
          >
            Criar monitor
          </button>
        </div>
      </div>
    </div>
  );
}
