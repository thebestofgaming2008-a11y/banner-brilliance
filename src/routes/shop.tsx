import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StoreProductCard } from "@/components/store/product-card";
import { StorePage } from "@/components/store/store-chrome";
import { merchandiseProducts, toStoreProduct, type StoreCollection } from "@/data/store";
import { listActiveProducts } from "@/services/productService";
import { useStoreReveal } from "@/hooks/use-store-reveal";
import honeyMulti from "@/assets/product-photos/honey-kashmir-multiflora.jpg";
import niqabKhadijaFull from "@/assets/product-photos/niqab-khadija-full.jpg";
import sabrWatchBlack from "@/assets/collection-banners/sabr-watch-black.jpg";
import shemaghManBack from "@/assets/product-photos/shemagh-man-back.jpg";

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
  const storeProducts = Route.useLoaderData();
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
      return 0;
    });
  }, [collection, query, sort, storeProducts]);

  const displayedProducts = sort === "featured" ? merchandiseProducts(products) : products;

  return (
    <StorePage>
      <section className="relative min-h-[470px] overflow-hidden bg-black text-white md:min-h-[580px]">
        <div className="absolute inset-0 grid grid-cols-[1.15fr_0.85fr] md:grid-cols-[1.45fr_0.55fr]">
          <div className="relative overflow-hidden">
            <img
              src={shemaghManBack}
              alt="Ivory embroidered shemagh worn from the back"
              className="h-full w-full object-cover object-center"
            />
          </div>
          <div className="grid min-h-0 grid-rows-3">
            <div className="min-h-0 overflow-hidden border-l border-white/10">
              <img
                src={niqabKhadijaFull}
                alt="Khadija niqab"
                className="h-full w-full object-cover object-[center_20%]"
              />
            </div>
            <div className="min-h-0 overflow-hidden border-l border-t border-white/10">
              <img
                src={sabrWatchBlack}
                alt="SABR black dial watch"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-h-0 overflow-hidden border-l border-t border-white/10">
              <img
                src={honeyMulti}
                alt="Kashmir multi-flora honey"
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/28 to-black/5" />
        <div
          className="relative mx-auto flex min-h-[470px] max-w-[1280px] items-end px-[22px] pb-12 md:min-h-[580px] md:px-8 md:pb-16"
          data-store-reveal
        >
          <div className="max-w-xl">
            <p className="section-kicker text-white/68">The complete collection</p>
            <h1 className="banner-heading mt-3 text-[48px] leading-[0.9] md:text-[78px]">
              THE FAWZAAN EDIT
            </h1>
            <p className="mt-5 max-w-md text-[14px] leading-6 text-white/72">
              Heritage pieces, modest essentials, SABR watches, and Kashmir honey.
            </p>
          </div>
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
            <span>{displayedProducts.length} products</span>
            <span>{collection === "All" ? "All collections" : collection}</span>
          </div>
          {displayedProducts.length ? (
            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-4 md:gap-x-4 md:gap-y-16">
              {displayedProducts.map((product, index) => (
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
