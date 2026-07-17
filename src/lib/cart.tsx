import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  productId?: string;
  slug?: string;
  name: string;
  variant?: string;
  price: number; // INR base
  img: string;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  isReady: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const FREE_SHIP = 2000; // INR
const CART_STORAGE_KEY = "fawzaan-cart-v2";
const LEGACY_CART_STORAGE_KEY = "fawzaan-cart";

function persistCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage can be unavailable in private browsing modes.
  }
  return items;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const pendingItems = useRef<CartItem[] | null>(null);

  useEffect(() => {
    let storedItems: CartItem[] | null = null;
    try {
      localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) storedItems = JSON.parse(raw) as CartItem[];
    } catch {
      // Ignore malformed persisted carts.
    } finally {
      setItems((current) => pendingItems.current ?? storedItems ?? current);
      setIsHydrated(true);
    }
  }, []);
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can be unavailable in private browsing modes.
    }
  }, [isHydrated, items]);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    return {
      items,
      isReady: isHydrated,
      isOpen,
      count,
      subtotal,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add: (item) => {
        setItems((prev) => {
          const existing = prev.find((p) => p.id === item.id);
          if (existing)
            return (pendingItems.current = persistCart(
              prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + (item.qty ?? 1) } : p)),
            ));
          return (pendingItems.current = persistCart([...prev, { ...item, qty: item.qty ?? 1 }]));
        });
        setIsOpen(true);
      },
      remove: (id) =>
        setItems((prev) => (pendingItems.current = persistCart(prev.filter((p) => p.id !== id)))),
      setQty: (id, qty) =>
        setItems(
          (prev) =>
            (pendingItems.current = persistCart(
              prev.map((p) => (p.id === id ? { ...p, qty: Math.max(1, qty) } : p)),
            )),
        ),
      clear: () => setItems((pendingItems.current = persistCart([]))),
    };
  }, [isHydrated, items, isOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export const FREE_SHIP_THRESHOLD = FREE_SHIP;
