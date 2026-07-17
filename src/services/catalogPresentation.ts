import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { convexHttp } from "@/lib/backend";

export type CatalogTaxonomyItem = {
  id?: string;
  slug: string;
  name: string;
  type: "collection" | "filter" | string;
  description?: string | null;
  parent_slug?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export type CatalogBanner = {
  id?: string;
  placement: string;
  eyebrow?: string | null;
  title: string;
  body?: string | null;
  button_label?: string | null;
  button_url?: string | null;
  image_url: string;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export type CatalogPresentation = {
  taxonomy: CatalogTaxonomyItem[];
  banners: CatalogBanner[];
};

export const fallbackTaxonomy: CatalogTaxonomyItem[] = [
  { slug: "shemaghs", name: "Shemaghs", type: "collection", sort_order: 10 },
  { slug: "niqabs", name: "Niqabs", type: "collection", sort_order: 20 },
  { slug: "kufis", name: "Kufis", type: "collection", sort_order: 30 },
  { slug: "honey", name: "Honey", type: "collection", sort_order: 40 },
  { slug: "watches", name: "Watches", type: "collection", sort_order: 50 },
  { slug: "gloves", name: "Gloves", type: "collection", sort_order: 60 },
];

let cachedPresentation: CatalogPresentation | null = null;

export async function listCatalogPresentation(): Promise<CatalogPresentation> {
  try {
    if (typeof window !== "undefined") {
      const response = await fetch("/api/catalog/presentation", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Catalog presentation failed with ${response.status}`);
      cachedPresentation = (await response.json()) as CatalogPresentation;
      return cachedPresentation;
    }
    if (convexHttp) {
      const [taxonomy, banners] = await Promise.all([
        convexHttp.query(api.catalog.listActiveTaxonomy, {}),
        convexHttp.query(api.catalog.listActiveBanners, {}),
      ]);
      return { taxonomy, banners } as CatalogPresentation;
    }
  } catch (error) {
    console.warn("Using fallback catalog presentation", error);
  }
  return cachedPresentation ?? { taxonomy: fallbackTaxonomy, banners: [] };
}

export function useCatalogPresentation() {
  const [presentation, setPresentation] = useState<CatalogPresentation>(
    cachedPresentation ?? { taxonomy: fallbackTaxonomy, banners: [] },
  );
  useEffect(() => {
    let alive = true;
    listCatalogPresentation().then((next) => {
      if (alive) setPresentation(next);
    });
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => presentation, [presentation]);
}
