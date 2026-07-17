import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { convexHttp } from "@/lib/backend";
import {
  backendProductToProduct,
  localBackendProducts,
  type BackendProduct,
} from "@/lib/catalogBackend";
import { catalog, type Product } from "@/lib/products";

export type { BackendProduct as Product };

let cachedProducts: Product[] | null = null;
let cachedProductsAt = 0;
let cachedCatalogVersion = "";
let productsRequest: Promise<Product[]> | null = null;
const CATALOG_MEMORY_TTL_MS = 5 * 60 * 1000;

function catalogVersion() {
  return typeof window === "undefined"
    ? "server"
    : (window.localStorage.getItem("fawzaan.catalogVersion") ?? "default");
}

async function fetchCatalogProducts(): Promise<Product[]> {
  if (typeof window !== "undefined") {
    const response = await fetch(
      `/api/catalog/products?version=${encodeURIComponent(catalogVersion())}`,
      {
        headers: { accept: "application/json" },
      },
    );
    if (!response.ok) throw new Error(`Catalog request failed with ${response.status}`);
    const rows = (await response.json()) as BackendProduct[];
    return rows.map(backendProductToProduct).filter((product) => product.slug);
  }

  if (convexHttp) {
    const rows = (await convexHttp.query(api.products.listActiveProducts, {})) as BackendProduct[];
    return rows.map(backendProductToProduct).filter((product) => product.slug);
  }

  return localBackendProducts.map(backendProductToProduct);
}

export async function listActiveProducts(options: { force?: boolean } = {}): Promise<Product[]> {
  const version = catalogVersion();
  const fresh =
    cachedProducts &&
    cachedCatalogVersion === version &&
    Date.now() - cachedProductsAt < CATALOG_MEMORY_TTL_MS;
  if (!options.force && fresh) return cachedProducts;
  if (!options.force && productsRequest) return productsRequest;

  productsRequest = fetchCatalogProducts()
    .then((products) => {
      cachedProducts = products;
      cachedProductsAt = Date.now();
      cachedCatalogVersion = version;
      return products;
    })
    .catch((error) => {
      console.warn("Using local catalog fallback", error);
      return cachedProducts ?? catalog;
    })
    .finally(() => {
      productsRequest = null;
    });
  return productsRequest;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const cached = cachedProducts?.find((product) => product.slug === slug);
  if (
    cached &&
    cachedCatalogVersion === catalogVersion() &&
    Date.now() - cachedProductsAt < CATALOG_MEMORY_TTL_MS
  )
    return cached;
  try {
    if (typeof window !== "undefined") {
      const response = await fetch(
        `/api/catalog/product?slug=${encodeURIComponent(slug)}&version=${encodeURIComponent(catalogVersion())}`,
        {
          headers: { accept: "application/json" },
        },
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Product request failed with ${response.status}`);
      return backendProductToProduct((await response.json()) as BackendProduct);
    }

    if (convexHttp) {
      const row = (await convexHttp.query(api.products.getProductBySlug, {
        slug,
      })) as BackendProduct | null;
      return row ? backendProductToProduct(row) : null;
    }
  } catch (error) {
    console.warn("Using local product fallback", error);
  }

  return catalog.find((product) => product.slug === slug) ?? null;
}

export function useCatalogProducts() {
  // SSR workers are reused across requests. Always start from the same snapshot
  // in the browser and on the server, then replace it with the live catalog.
  const [products, setProducts] = useState<Product[]>(catalog);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listActiveProducts()
      .then((next) => {
        if (alive) setProducts(next.length ? next : catalog);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => ({ products, loading }), [products, loading]);
}

export function useCatalogProduct(slug: string, initial?: Product) {
  const [product, setProduct] = useState<Product | null>(initial ?? null);

  useEffect(() => {
    let alive = true;
    getProductBySlug(slug).then((next) => {
      if (alive && next) setProduct(next);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  return product;
}
