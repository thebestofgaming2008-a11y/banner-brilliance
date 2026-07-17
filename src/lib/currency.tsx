import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Base prices in products.ts are in INR (₹).
export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "AED";

type Rate = { symbol: string; rate: number; label: string };
export const CURRENCIES: Record<CurrencyCode, Rate> = {
  INR: { symbol: "₹", rate: 1, label: "Indian Rupee" },
  USD: { symbol: "$", rate: 0.012, label: "US Dollar" },
  EUR: { symbol: "€", rate: 0.011, label: "Euro" },
  GBP: { symbol: "£", rate: 0.0095, label: "Pound Sterling" },
  AED: { symbol: "د.إ", rate: 0.044, label: "UAE Dirham" },
};

type Ctx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  format: (inr: number) => string;
  symbol: string;
};

const CurrencyCtx = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [rates, setRates] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(CURRENCIES).map(([code, value]) => [code, value.rate])),
  );

  useEffect(() => {
    let saved = false;
    try {
      const raw = localStorage.getItem("fawzaan-currency") as CurrencyCode | null;
      if (raw && CURRENCIES[raw]) {
        saved = true;
        setCurrency(raw);
      }
    } catch {
      // Browser storage can be unavailable in private or restricted contexts.
    }
    fetch("/api/geo")
      .then((response) => response.json())
      .then((geo) => {
        const detected = String(geo?.currency ?? "") as CurrencyCode;
        if (!saved && CURRENCIES[detected]) setCurrency(detected);
      })
      .catch(() => undefined);
    fetch("/api/rates?base=INR")
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.rates && typeof payload.rates === "object") {
          setRates((current) => ({ ...current, ...(payload.rates as Record<string, number>) }));
        }
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("fawzaan-currency", currency);
    } catch {
      // Browser storage can be unavailable in private or restricted contexts.
    }
  }, [currency]);

  const value = useMemo<Ctx>(() => {
    const { symbol } = CURRENCIES[currency];
    const rate = rates[currency] ?? CURRENCIES[currency].rate;
    const format = (inr: number) => {
      const v = inr * rate;
      const digits = currency === "INR" ? 0 : 2;
      return `${symbol}${v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
    };
    return { currency, setCurrency, format, symbol };
  }, [currency, rates]);

  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
