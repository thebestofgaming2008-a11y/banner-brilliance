import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import { convex } from "@/lib/backend";
import { useCatalogProducts } from "@/services/productService";

type ContextValue = {
  items: string[];
  has: (slug: string) => boolean;
  toggle: (slug: string) => Promise<void>;
  remove: (slug: string) => Promise<void>;
  count: number;
  isAuthenticated: boolean;
};

const WishlistContext = createContext<ContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <WishlistContext.Provider
        value={{
          items: [],
          has: () => false,
          toggle: async () => {
            window.location.href = "/account";
          },
          remove: async () => undefined,
          count: 0,
          isAuthenticated: false,
        }}
      >
        {children}
      </WishlistContext.Provider>
    );
  }
  return <ConvexWishlistProvider>{children}</ConvexWishlistProvider>;
}

function ConvexWishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const productIds = useQuery(api.wishlists.listMine, isAuthenticated ? {} : "skip");
  const toggleSaved = useMutation(api.wishlists.toggle);
  const { products } = useCatalogProducts();
  const idBySlug = useMemo(
    () => new Map(products.map((product) => [product.slug, product.id])),
    [products],
  );
  const slugById = useMemo(
    () => new Map(products.map((product) => [product.id, product.slug])),
    [products],
  );
  const items = useMemo(
    () =>
      (productIds ?? [])
        .map((id) => slugById.get(id))
        .filter((slug): slug is string => Boolean(slug)),
    [productIds, slugById],
  );

  const toggle = useCallback(
    async (slug: string) => {
      if (!isAuthenticated) {
        toast.message("Sign in to save products.");
        window.location.href = "/account";
        return;
      }
      const productId = idBySlug.get(slug);
      if (!productId || productId === slug)
        throw new Error("Product is not connected to the live catalog.");
      await toggleSaved({ productId });
    },
    [idBySlug, isAuthenticated, toggleSaved],
  );

  const remove = useCallback(
    async (slug: string) => {
      if (items.includes(slug)) await toggle(slug);
    },
    [items, toggle],
  );

  const value = useMemo<ContextValue>(
    () => ({
      items,
      count: items.length,
      isAuthenticated,
      has: (slug) => items.includes(slug),
      toggle,
      remove,
    }),
    [isAuthenticated, items, remove, toggle],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
