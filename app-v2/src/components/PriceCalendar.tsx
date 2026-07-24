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
        date: formatDateKey(date),
        day: d,
        price: prices[formatDateKey(date)],
        isCurrentMonth: false,
        isPast: date < today,
        isToday: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m, d);
      const key = formatDateKey(date);
      result.push({
        date: key,
        day: d,
        price: prices[key],
        isCurrentMonth: true,
        isPast: date < today,
        isToday: date.getTime() === today.getTime(),
      });
    }

    const remaining = 42 - result.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, m + 1, d);
      result.push({
        date: formatDateKey(date),
        day: d,
        price: prices[formatDateKey(date)],
        isCurrentMonth: false,
        isPast: false,
        isToday: false,
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
    <div className="bg-dark-800/50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-dark-300 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-6 h-6 rounded flex items-center justify-center text-dark-400 hover:text-dark-100 hover:bg-dark-600/50 transition-all text-xs">◀</button>
          <span className="text-xs font-medium text-dark-200 w-28 text-center">
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button onClick={nextMonth} className="w-6 h-6 rounded flex items-center justify-center text-dark-400 hover:text-dark-100 hover:bg-dark-600/50 transition-all text-xs">▶</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] text-dark-500 py-1 font-medium">{d}</div>
        ))}

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
                relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-all
                ${isDisabled ? "opacity-20 cursor-not-allowed" : "cursor-pointer hover:bg-dark-600/50"}
                ${isSelected ? "bg-blue-500/20 ring-1 ring-blue-500/50" : ""}
                ${dp.isToday && !isSelected ? "ring-1 ring-dark-400" : ""}
                ${hasPrice && !isDisabled ? getPriceBg(dp.price!, minPrice, maxPrice) : ""}
              `}
            >
              <span className={`text-xs ${dp.isToday ? "font-bold text-dark-50" : dp.isCurrentMonth ? "text-dark-200" : "text-dark-500"}`}>
                {dp.day}
              </span>
              {hasPrice && dp.isCurrentMonth && (
                <span className={`text-[9px] leading-none mt-0.5 ${getPriceColor(dp.price!, minPrice, maxPrice)}`}>
                  {formatPrice(dp.price!, currency)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {cheapestDates.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dark-700/50">
          <p className="text-[10px] text-dark-500 mb-1.5">Datas mais baratas encontradas:</p>
          <div className="flex gap-1.5">
            {cheapestDates.map(([date, price]) => (
              <button
                key={date}
                type="button"
                onClick={() => onSelect(date)}
                className={`flex-1 px-2 py-1.5 rounded-lg border text-center transition-all ${
                  date === selectedDate
                    ? "bg-emerald-500/15 border-emerald-500/30"
                    : "bg-dark-700/30 border-dark-600/50 hover:border-emerald-500/20"
                }`}
              >
                <div className="text-[10px] text-dark-400">{new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
                <div className="text-xs font-bold text-emerald-400">{formatPrice(price, currency)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-dark-700/50">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[9px] text-dark-500">Barato</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-[9px] text-dark-500">Médio</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[9px] text-dark-500">Caro</span>
        </div>
      </div>
    </div>
  );
}
