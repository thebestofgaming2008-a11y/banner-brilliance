import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { storeCurrencies, type StoreCurrency, useCurrency } from "@/hooks/use-currency";
import { CURRENCIES } from "@/lib/currency";

export function CurrencySelector({ dark = false }: { dark?: boolean }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return storeCurrencies;
    return storeCurrencies.filter((code) => {
      const details = CURRENCIES[code];
      return `${code} ${details.label} ${details.symbol}`.toLowerCase().includes(needle);
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(Math.max(0, storeCurrencies.indexOf(currency)));
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [currency, open]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, options.length - 1)));
  }, [options.length]);

  const choose = (code: StoreCurrency) => {
    setCurrency(code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex items-center justify-between gap-4">
      <span
        className={`text-[11px] font-bold uppercase ${dark ? "text-white/70" : "text-black/55"}`}
      >
        Currency
      </span>
      <button
        type="button"
        aria-label={`Currency: ${CURRENCIES[currency].label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-[11px] font-bold transition ${
          dark
            ? "border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10"
            : "border-black/15 bg-white text-black hover:border-black/35"
        }`}
      >
        <span className="text-[14px]" aria-hidden="true">
          {CURRENCIES[currency].symbol}
        </span>
        <span>{currency}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          className="absolute bottom-[calc(100%+10px)] right-0 z-[100] w-[min(340px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
          role="dialog"
          aria-label="Choose currency"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, options.length - 1));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
              return;
            }
            if (event.key === "Enter" && options[activeIndex]) {
              event.preventDefault();
              choose(options[activeIndex]);
            }
          }}
        >
          <div className="border-b border-black/10 p-3">
            <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              Select your currency
            </p>
            <label className="flex h-11 items-center gap-2 rounded-xl bg-black/[0.045] px-3 ring-1 ring-inset ring-black/10 focus-within:ring-black/35">
              <Search size={16} className="shrink-0 text-black/45" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search code, name or symbol"
                aria-label="Search currencies"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-black/35"
              />
            </label>
          </div>
          <div role="listbox" aria-label="Currencies" className="max-h-64 overflow-y-auto p-2">
            {options.length ? (
              options.map((code, index) => {
                const details = CURRENCIES[code];
                const selected = code === currency;
                return (
                  <button
                    key={code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onPointerMove={() => setActiveIndex(index)}
                    onClick={() => choose(code)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      index === activeIndex ? "bg-[#fff6d8]" : "hover:bg-black/[0.035]"
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.055] text-[14px] font-semibold">
                      {details.symbol}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold">{code}</span>
                      <span className="block truncate text-[11px] text-black/50">
                        {details.label}
                      </span>
                    </span>
                    {selected ? <Check size={17} className="shrink-0 text-[#b98500]" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-8 text-center text-[12px] text-black/50">
                No matching currency.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
