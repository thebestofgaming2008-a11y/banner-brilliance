import { CURRENCIES, type CurrencyCode, useCurrency as useStoreCurrency } from "@/lib/currency";

export type StoreCurrency = CurrencyCode;
export const storeCurrencies = Object.keys(CURRENCIES) as StoreCurrency[];

export function useCurrency() {
  const currency = useStoreCurrency();
  return {
    ...currency,
    formatPrice: currency.format,
  };
}
