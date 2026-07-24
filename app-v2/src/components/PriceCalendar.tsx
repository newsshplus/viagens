import { useState, useMemo } from 'react';

interface PriceCalendarProps {
  month: Date;
  prices: Record<string, number>;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  label: string;
}

interface DatePrice {
  date: string;
  day: number;
  price?: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPriceColor(price: number, min: number, max: number): string {
  if (max === min) return "text-emerald-400";
  const pct = (price - min) / (max - min);
  if (pct < 0.2) return "text-emerald-400 font-bold";
  if (pct < 0.4) return "text-emerald-300";
  if (pct < 0.6) return "text-yellow-400";
  if (pct < 0.8) return "text-orange-400";
  return "text-red-400";
}

function getPriceBg(price: number, min: number, max: number): string {
  if (max === min) return "bg-emerald-500/10";
  const pct = (price - min) / (max - min);
  if (pct < 0.2) return "bg-emerald-500/15";
  if (pct < 0.4) return "bg-emerald-500/8";
  if (pct < 0.6) return "bg-yellow-500/10";
  if (pct < 0.8) return "bg-orange-500/10";
  return "bg-red-500/10";
}

function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", BRL: "R$" };
  return `${symbols[currency] || ""}${price}`;
}

export default function PriceCalendar({ month, prices, selectedDate, onSelect, label }: PriceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(month);

  const priceValues = Object.values(prices).filter((p) => p > 0);
  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 1;

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: DatePrice[] = [];

    const prevMonth = new Date(year, m, 0);
    const daysInPrev = prevMonth.getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const date = new Date(year, m - 1, d);
      result.push({
        date: formatDateKey(date), day: d,
        price: prices[formatDateKey(date)],
        isCurrentMonth: false, isPast: date < today, isToday: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m, d);
      const key = formatDateKey(date);
      result.push({
        date: key, day: d, price: prices[key],
        isCurrentMonth: true, isPast: date < today,
        isToday: date.getTime() === today.getTime(),
      });
    }

    const remaining = 42 - result.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, m + 1, d);
      result.push({
        date: formatDateKey(date), day: d,
        price: prices[formatDateKey(date)],
        isCurrentMonth: false, isPast: false, isToday: false,
      });
    }

    return result;
  }, [currentMonth, prices]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const cheapestDates = useMemo(() => {
    const entries = Object.entries(prices)
      .filter(([d, p]) => p > 0 && new Date(d) >= new Date())
      .sort((a, b) => a[1] - b[1]);
    return entries.slice(0, 3);
  }, [prices]);

  const currency = "EUR";

  return (
    <div className="bg-dark-800/50 rounded-2xl p-5 border border-dark-600/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-dark-200 uppercase tracking-wider">{label}</span>
      </div>

      {/* Navegação do mês — BARRA DESTACADA */}
      <div className="flex items-center justify-between bg-dark-700/60 rounded-xl px-3 py-2.5 mb-4 border border-dark-600/40">
        <button
          onClick={prevMonth}
          className="w-10 h-10 rounded-lg bg-dark-600/60 hover:bg-blue-500/20 flex items-center justify-center text-dark-200 hover:text-blue-400 transition-all text-base font-bold border border-dark-500/40 hover:border-blue-500/30"
        >
          ‹
        </button>
        <span className="text-base font-bold text-dark-50 select-none">
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          onClick={nextMonth}
          className="w-10 h-10 rounded-lg bg-dark-600/60 hover:bg-blue-500/20 flex items-center justify-center text-dark-200 hover:text-blue-400 transition-all text-base font-bold border border-dark-500/40 hover:border-blue-500/30"
        >
          ›
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-dark-400 py-2 font-semibold">{d}</div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dp, i) => {
          const isSelected = dp.date === selectedDate;
          const isDisabled = dp.isPast || !dp.isCurrentMonth;
          const hasPrice = dp.price !== undefined && dp.price > 0;

          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(dp.date)}
              className={`
                relative flex flex-col items-center justify-center py-2.5 rounded-xl text-sm transition-all min-h-[52px]
                ${isDisabled ? "opacity-15 cursor-not-allowed" : "cursor-pointer hover:bg-dark-500/40 hover:scale-105 active:scale-95"}
                ${isSelected ? "bg-blue-500/25 ring-2 ring-blue-400/60 shadow-lg shadow-blue-500/10" : ""}
                ${dp.isToday && !isSelected ? "ring-2 ring-dark-300/50" : ""}
                ${hasPrice && !isDisabled ? getPriceBg(dp.price!, minPrice, maxPrice) : ""}
              `}
            >
              <span className={`text-sm leading-tight ${dp.isToday ? "font-extrabold text-blue-400" : dp.isCurrentMonth ? "font-semibold text-dark-100" : "text-dark-500"}`}>
                {dp.day}
              </span>
              {hasPrice && dp.isCurrentMonth && (
                <span className={`text-[10px] leading-tight mt-0.5 font-medium ${getPriceColor(dp.price!, minPrice, maxPrice)}`}>
                  {formatPrice(dp.price!, currency)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Datas mais baratas */}
      {cheapestDates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-dark-600/40">
          <p className="text-xs text-dark-400 mb-2 font-medium">Datas mais baratas encontradas:</p>
          <div className="flex gap-2">
            {cheapestDates.map(([date, price]) => (
              <button
                key={date}
                type="button"
                onClick={() => onSelect(date)}
                className={`flex-1 px-3 py-2.5 rounded-xl border text-center transition-all ${
                  date === selectedDate
                    ? "bg-emerald-500/15 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    : "bg-dark-700/40 border-dark-600/50 hover:border-emerald-400/30 hover:bg-dark-700/60"
                }`}
              >
                <div className="text-xs text-dark-300 mb-0.5">
                  {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </div>
                <div className="text-sm font-bold text-emerald-400">{formatPrice(price, currency)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-dark-600/40">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-xs text-dark-400">Barato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-xs text-dark-400">Médio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-xs text-dark-400">Caro</span>
        </div>
      </div>
    </div>
  );
}
