import type { Monitor } from '../types';
import { formatPrice } from '../lib/format';

interface Props {
  monitors: Monitor[];
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

export default function MonitorList({ monitors, onRemove, onToggle }: Props) {
  if (!monitors.length) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-dark-600/50 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🔔</span>
        </div>
        <h3 className="text-sm font-semibold text-dark-200 mb-1">Nenhum monitor ativo</h3>
        <p className="text-xs text-dark-400">
          Use o botão "Monitorar preço" nos resultados de busca para criar alertas.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔔</span>
        <h3 className="text-sm font-semibold text-dark-200">
          Monitores ({monitors.filter((m) => m.active).length} ativos)
        </h3>
      </div>

      <div className="space-y-2">
        {monitors.map((m) => (
          <div
            key={m.id}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              m.active
                ? "bg-dark-800/50 border-emerald-500/20"
                : "bg-dark-800/30 border-dark-600/30 opacity-60"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-dark-50">
                  {m.params.origin} → {m.params.destination}
                </span>
                {m.active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <div className="text-xs text-dark-400 mt-0.5">
                Meta: {formatPrice(m.targetPrice, m.params.currency)} • {m.params.dateFrom}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onToggle(m.id)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                  m.active
                    ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    : "border-dark-600 text-dark-400 hover:bg-dark-600/50"
                }`}
              >
                {m.active ? "Pausar" : "Ativar"}
              </button>
              <button
                onClick={() => onRemove(m.id)}
                className="px-2.5 py-1 text-xs rounded-lg border border-dark-600 text-dark-400 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
