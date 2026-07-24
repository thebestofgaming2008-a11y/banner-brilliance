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
const MAX_CART_LINES = 100;
const MAX_ITEM_QUANTITY = 99;

function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_CART_LINES).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Partial<CartItem>;
    const id = String(item.id ?? "")
      .trim()
      .slice(0, 200);
    const name = String(item.name ?? "")
      .trim()
      .slice(0, 200);
    const price = Number(item.price);
    const qty = Math.floor(Number(item.qty));
    if (!id || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(qty)) return [];
    return [
      {
        id,
        productId:
          typeof item.productId === "string" ? item.productId.trim().slice(0, 200) : undefined,
        slug: typeof item.slug === "string" ? item.slug.trim().slice(0, 160) : undefined,
        name,
        variant: typeof item.variant === "string" ? item.variant.trim().slice(0, 160) : undefined,
        price,
        img: typeof item.img === "string" ? item.img.trim().slice(0, 2_000) : "",
        qty: Math.min(MAX_ITEM_QUANTITY, Math.max(1, qty)),
      },
    ];
  });
}

function persistCart(items: CartItem[]) {
  const safeItems = sanitizeCartItems(items);
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(safeItems));
  } catch {
    // Storage can be unavailable in private browsing modes.
  }
  return safeItems;
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
      if (raw) storedItems = sanitizeCartItems(JSON.parse(raw));
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
              prev.map((p) =>
                p.id === item.id
                  ? {
                      ...p,
                      qty: Math.min(
                        MAX_ITEM_QUANTITY,
                        p.qty + Math.max(1, Math.floor(item.qty ?? 1)),
                      ),
                    }
                  : p,
              ),
            ));
          return (pendingItems.current = persistCart([
            ...prev,
            { ...item, qty: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.floor(item.qty ?? 1))) },
          ]));
        });
        setIsOpen(true);
      },
      remove: (id) =>
        setItems((prev) => (pendingItems.current = persistCart(prev.filter((p) => p.id !== id)))),
      setQty: (id, qty) =>
        setItems(
          (prev) =>
            (pendingItems.current = persistCart(
              prev.map((p) =>
                p.id === id
                  ? {
                      ...p,
                      qty: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.floor(qty))),
                    }
                  : p,
              ),
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
