import { useState, useRef, useEffect, useCallback } from 'react';
import { searchAirports, type AirportEntry } from '../lib/airports';

interface Props {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (airport: AirportEntry | null) => void;
}

export default function AirportSearch({ name, label, placeholder, required, value, onChange }: Props) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<AirportEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<AirportEntry | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (value !== undefined && value !== query) {
      setQuery(value);
      setSelected(null);
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const doSearch = useCallback((q: string) => {
    const r = searchAirports(q);
    setResults(r);
    setIsOpen(r.length > 0);
    setHighlightIdx(-1);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    doSearch(val);
    onChange?.(null);
  };

  const selectAirport = (airport: AirportEntry) => {
    setSelected(airport);
    setQuery(`${airport.city} (${airport.iata})`);
    setIsOpen(false);
    setHighlightIdx(-1);
    onChange?.(airport);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < results.length) {
        selectAirport(results[highlightIdx]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIdx(-1);
    }
  };

  const formatDisplay = (a: AirportEntry) => `${a.city} — ${a.name} (${a.iata})`;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        ref={inputRef}
        name={name}
        type="text"
        required={required}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        placeholder={placeholder || "Digite a cidade ou aeroporto..."}
        autoComplete="off"
        className="w-full bg-dark-800/80 border border-dark-600 rounded-lg px-3 py-2.5 text-sm font-mono text-dark-50 placeholder-dark-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
      />
      <input type="hidden" name={`${name}_iata`} value={selected?.iata || ""} />

      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-dark-800 border border-dark-600 rounded-xl shadow-2xl shadow-black/50 overflow-hidden max-h-72 overflow-y-auto animate-slide-up"
        >
          {results.map((airport, i) => (
            <li
              key={airport.iata}
              onClick={() => selectAirport(airport)}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`px-3 py-2.5 cursor-pointer transition-all border-b border-dark-700/50 last:border-0 ${
                i === highlightIdx
                  ? "bg-blue-500/15 border-blue-500/20"
                  : "hover:bg-dark-700/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-dark-50 truncate">
                      {airport.city}
                    </span>
                    <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      {airport.iata}
                    </span>
                  </div>
                  <div className="text-xs text-dark-400 truncate mt-0.5">
                    {airport.name} • {airport.country}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
