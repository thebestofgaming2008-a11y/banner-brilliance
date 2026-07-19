import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Rate = { symbol: string; rate: number; label: string };
// Base prices are in INR. Non-INR values are refreshed from the server-side rate proxy.
export const CURRENCIES = {
  INR: { symbol: "₹", rate: 1, label: "Indian Rupee" },
  USD: { symbol: "$", rate: 0.012, label: "US Dollar" },
  EUR: { symbol: "€", rate: 0.011, label: "Euro" },
  GBP: { symbol: "£", rate: 0.0095, label: "Pound Sterling" },
  AED: { symbol: "د.إ", rate: 0.044, label: "UAE Dirham" },
  CAD: { symbol: "C$", rate: 0.016, label: "Canadian Dollar" },
  AUD: { symbol: "A$", rate: 0.018, label: "Australian Dollar" },
  SAR: { symbol: "ر.س", rate: 0.045, label: "Saudi Riyal" },
  QAR: { symbol: "ر.ق", rate: 0.044, label: "Qatari Riyal" },
  KWD: { symbol: "د.ك", rate: 0.0037, label: "Kuwaiti Dinar" },
  MYR: { symbol: "RM", rate: 0.052, label: "Malaysian Ringgit" },
  SGD: { symbol: "S$", rate: 0.016, label: "Singapore Dollar" },
  ZAR: { symbol: "R", rate: 0.21, label: "South African Rand" },
  JPY: { symbol: "¥", rate: 1.8, label: "Japanese Yen" },
  PKR: { symbol: "₨", rate: 3.34, label: "Pakistani Rupee" },
  BDT: { symbol: "৳", rate: 1.43, label: "Bangladeshi Taka" },
} as const satisfies Record<string, Rate>;

export type CurrencyCode = keyof typeof CURRENCIES;

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
      const digits = currency === "INR" || currency === "JPY" ? 0 : 2;
      const locale = currency === "INR" ? "en-IN" : "en-US";
      return `${symbol}${v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
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
