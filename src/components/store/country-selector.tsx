import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { COUNTRIES, countryCodeForName } from "@/lib/countries";

function flagForCountry(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}

export function CountrySelector({
  value,
  onChange,
  label = "Country",
  required = false,
}: {
  value: string;
  onChange: (country: string) => void;
  label?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedCode = countryCodeForName(value) ?? "";

  const options = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("en");
    if (!needle) return COUNTRIES;
    return COUNTRIES.filter((country) =>
      `${country.name} ${country.code}`.toLocaleLowerCase("en").includes(needle),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const selectedIndex = COUNTRIES.findIndex((country) => country.name === value);
    setActiveIndex(Math.max(0, selectedIndex));
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open, value]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, options.length - 1)));
  }, [options.length]);

  const choose = (country: (typeof COUNTRIES)[number]) => {
    onChange(country.name);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span className="block text-[11px] font-bold uppercase tracking-normal text-black/55">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${value || "not selected"}`}
        onClick={() => setOpen((current) => !current)}
        className="mt-1 flex h-11 w-full items-center gap-2 border border-black/15 bg-white px-3 text-left text-sm font-normal normal-case text-black outline-none transition focus:border-black"
      >
        {selectedCode ? (
          <span className="text-lg leading-none" aria-hidden="true">
            {flagForCountry(selectedCode)}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{value || "Choose country"}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-black/45 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className="absolute bottom-[calc(100%+8px)] left-0 z-[120] w-[min(360px,calc(100vw-44px))] overflow-hidden border border-black/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:bottom-auto sm:top-[calc(100%+8px)]"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, options.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && options[activeIndex]) {
              event.preventDefault();
              choose(options[activeIndex]);
            }
          }}
        >
          <div className="border-b border-black/10 p-3">
            <label className="flex h-11 items-center gap-2 bg-black/[0.045] px-3 ring-1 ring-inset ring-black/10 focus-within:ring-black/35">
              <Search size={16} className="shrink-0 text-black/45" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Type a country name"
                aria-label="Search countries"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35"
              />
            </label>
          </div>
          <div role="listbox" aria-label="Countries" className="max-h-64 overflow-y-auto p-2">
            {options.length ? (
              options.map((country, index) => {
                const selected = country.name === value;
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onPointerMove={() => setActiveIndex(index)}
                    onClick={() => choose(country)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${
                      index === activeIndex ? "bg-[#fff6d8]" : "hover:bg-black/[0.035]"
                    }`}
                  >
                    <span className="w-6 shrink-0 text-lg leading-none" aria-hidden="true">
                      {flagForCountry(country.code)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{country.name}</span>
                    {selected ? <Check size={16} className="shrink-0 text-[#b98500]" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-8 text-center text-sm text-black/50">No country found.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
