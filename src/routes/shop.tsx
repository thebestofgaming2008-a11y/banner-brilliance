import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StoreProductCard } from "@/components/store/product-card";
import { StorePage } from "@/components/store/store-chrome";
import { toStoreProduct, type StoreCollection, useStoreProducts } from "@/data/store";
import { listActiveProducts } from "@/services/productService";
import { useStoreReveal } from "@/hooks/use-store-reveal";

type ShopSearch = { collection?: StoreCollection };

export const Route = createFileRoute("/shop")({
  loader: async () => (await listActiveProducts()).map(toStoreProduct),
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    collection: ["Shemaghs", "Niqabs", "Kufis", "Honey", "Watches", "Gloves"].includes(
      String(search.collection),
    )
      ? (search.collection as StoreCollection)
      : undefined,
  }),
  component: ShopPage,
});

function ShopPage() {
  useStoreReveal();
  const initialProducts = Route.useLoaderData();
  const liveCatalog = useStoreProducts();
  const storeProducts = liveCatalog.products.length ? liveCatalog.products : initialProducts;
  const loading = liveCatalog.loading && !storeProducts.length;
  const search = Route.useSearch();
  const [collection, setCollection] = useState<"All" | StoreCollection>(search.collection ?? "All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const collections: Array<"All" | StoreCollection> = [
    "All",
    "Shemaghs",
    "Niqabs",
    "Kufis",
    "Honey",
    "Watches",
    "Gloves",
  ];

  useEffect(() => {
    setCollection(search.collection ?? "All");
  }, [search.collection]);

  const products = useMemo(() => {
    const filtered = storeProducts.filter((product) => {
      const matchesCollection = collection === "All" || product.collection === collection;
      const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());
      return matchesCollection && matchesQuery;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;
      return (b.badge === "Bestseller" ? 1 : 0) - (a.badge === "Bestseller" ? 1 : 0);
    });
  }, [collection, query, sort, storeProducts]);

  return (
    <StorePage>
      <section className="bg-[#f4b400] px-[22px] py-12 md:px-8 md:py-18">
        <div className="mx-auto max-w-[1180px]" data-store-reveal>
          <p className="section-kicker text-black/55">The complete collection</p>
          <h1 className="section-heading mt-3 text-[46px] md:text-[72px]">SHOP FAWZAAN</h1>
          <p className="mt-4 max-w-md text-[14px] leading-6 text-black/65">
            Modest essentials, SABR watches, considered accessories, and pure Kashmir honey.
          </p>
        </div>
      </section>

      <section className="px-[22px] py-10 md:px-8 md:py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-5 border-b border-black/10 pb-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div
                className="no-scrollbar -mx-[22px] flex gap-6 overflow-x-auto px-[22px] md:mx-0 md:px-0"
                role="tablist"
                aria-label="Product collections"
              >
                {collections.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={collection === item}
                    onClick={() => setCollection(item)}
                    className={`relative shrink-0 pb-3 text-[11px] font-bold uppercase ${collection === item ? "text-black" : "text-black/40"}`}
                  >
                    {item}
                    {collection === item ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f4b400]" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <label className="flex h-11 flex-1 items-center gap-2 border-b border-black/25 md:w-56">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                />
              </label>
              <label className="flex h-11 items-center gap-2 border-b border-black/25">
                <SlidersHorizontal size={15} />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort products"
                  className="bg-transparent pr-2 text-[11px] font-bold uppercase outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price low</option>
                  <option value="price-high">Price high</option>
                  <option value="rating">Top rated</option>
                </select>
              </label>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between text-[11px] text-black/50">
            <span>{products.length} products</span>
            <span>{collection === "All" ? "All collections" : collection}</span>
          </div>
          {loading ? (
            <div
              className="grid grid-cols-2 gap-3 py-8 md:grid-cols-4"
              aria-label="Loading products"
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="aspect-[3/4] animate-pulse bg-black/5" />
              ))}
            </div>
          ) : products.length ? (
            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-4 md:gap-x-4 md:gap-y-16">
              {products.map((product, index) => (
                <StoreProductCard key={product.slug} product={product} priority={index < 4} />
              ))}
            </div>
          ) : collection === "Gloves" ? (
            <div className="py-24 text-center" data-store-reveal>
              <p className="section-kicker text-black/45">Coming soon</p>
              <h2 className="mt-3 text-[24px] font-bold uppercase">{collection} collection</h2>
              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-5 text-black/55">
                This collection is being prepared for release.
              </p>
            </div>
          ) : (
            <div className="py-24 text-center">
              <h2 className="text-[24px] font-bold uppercase">No products found</h2>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-5 text-[11px] font-bold uppercase underline"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </section>
    </StorePage>
  );
}
