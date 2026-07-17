import { useEffect, useState } from "react";

export type CartLine = { slug: string; quantity: number; option?: string };

const STORAGE_KEY = "fawzaan-cart";
const EVENT_NAME = "fawzaan-cart-change";

function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as CartLine[];
  } catch {
    return [];
  }
}

function writeCart(lines: CartLine[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    const sync = () => setLines(readCart());
    sync();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addItem = (slug: string, quantity = 1, option?: string) => {
    const current = readCart();
    const existing = current.find((line) => line.slug === slug && line.option === option);
    if (existing) existing.quantity += quantity;
    else current.push({ slug, quantity, option });
    writeCart(current);
  };

  const updateItem = (slug: string, quantity: number, option?: string) => {
    const next = readCart()
      .map((line) => (line.slug === slug && line.option === option ? { ...line, quantity } : line))
      .filter((line) => line.quantity > 0);
    writeCart(next);
  };

  const removeItem = (slug: string, option?: string) => {
    writeCart(readCart().filter((line) => !(line.slug === slug && line.option === option)));
  };

  const clearCart = () => writeCart([]);
  const count = lines.reduce((total, line) => total + line.quantity, 0);

  return { lines, count, addItem, updateItem, removeItem, clearCart };
}
