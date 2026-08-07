import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { StoreProductCard } from "@/components/store/product-card";
import { StorePage } from "@/components/store/store-chrome";
import { merchandiseProducts, toStoreProduct } from "@/data/store";
import {
  listCatalogPresentation,
  type CatalogBanner,
  type CatalogTaxonomyItem,
} from "@/services/catalogPresentation";
import { listActiveProducts } from "@/services/productService";
import { seo } from "@/lib/seo";
import { productCountLabel } from "@/lib/catalog-copy";

type ShopSearch = { collection?: string; filter?: string; q?: string };

export const Route = createFileRoute("/shop")({
  head: () =>
    seo({
      title: "Shop All | Fawzaan Store",
      description:
        "Browse all Fawzaan shemaghs, niqabs, kufis, watches, gloves and Kashmir honey with current prices and live availability.",
      path: "/shop",
    }),
  loader: async () => {
    const [products, presentation] = await Promise.all([
      listActiveProducts(),
      listCatalogPresentation(),
    ]);
    return { products: products.map(toStoreProduct), presentation };
  },
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    collection:
      typeof search.collection === "string" ? search.collection.trim().slice(0, 80) : undefined,
    filter: typeof search.filter === "string" ? search.filter.trim().slice(0, 80) : undefined,
    q: typeof search.q === "string" ? search.q.trim().slice(0, 120) : undefined,
  }),
  component: ShopPage,
});

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function resolveTaxonomySlug(
  requested: string | undefined,
  rows: CatalogTaxonomyItem[],
  type: "collection" | "filter",
) {
  const normalized = normalize(requested);
  if (!normalized) return type === "collection" ? "all" : "";
  return (
    rows.find(
      (row) =>
        row.type === type &&
        (normalize(row.slug) === normalized || normalize(row.name) === normalized),
    )?.slug ?? (type === "collection" ? "all" : "")
  );
}

function bannerImagePosition(position: string | null | undefined) {
  if (position === "top") return "object-top";
  if (position === "bottom") return "object-bottom";
  return "object-center";
}

function bannerAlignment(alignment: string | null | undefined) {
  if (alignment === "center") return "justify-center text-center";
  if (alignment === "right") return "justify-end text-right";
  return "justify-start text-left";
}

function ShopBannerArtwork({ banner }: { banner: CatalogBanner }) {
  const scale = Math.min(90, Math.max(25, Number(banner.overlay_scale ?? 58)));
  const position = banner.overlay_position ?? "right";
  return (
    <>
      {banner.image_url ? (
        <img
          src={banner.image_url}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${bannerImagePosition(banner.image_position)}`}
        />
      ) : null}
      {banner.overlay_image_url ? (
        <img
          src={banner.overlay_image_url}
          alt=""
          className="pointer-events-none absolute bottom-0 z-10 max-h-[96%] object-contain object-bottom"
          style={{
            width: `${scale}%`,
            left: position === "left" ? 0 : position === "center" ? "50%" : "auto",
            right: position === "right" ? 0 : "auto",
            transform: position === "center" ? "translateX(-50%)" : undefined,
          }}
        />
      ) : null}
    </>
  );
}

function PromoBanner({ banner }: { banner: CatalogBanner }) {
  const lightText = banner.text_theme !== "light";
  return (
    <section className="px-[22px] pb-12 md:px-8 md:pb-20" data-store-reveal>
      <div
        className={`relative mx-auto min-h-[380px] max-w-[1180px] overflow-hidden md:min-h-[460px] ${lightText ? "bg-black text-white" : "bg-white text-black"}`}
        style={{ backgroundColor: banner.background_color || undefined }}
      >
        <ShopBannerArtwork banner={banner} />
        <div className={`absolute inset-0 ${lightText ? "bg-black/45" : "bg-white/45"}`} />
        <div
          className={`relative z-20 flex min-h-[380px] items-end p-7 md:min-h-[460px] md:p-12 ${bannerAlignment(banner.content_alignment)}`}
        >
          <div className="max-w-lg">
            {banner.eyebrow ? (
              <p className={`section-kicker ${lightText ? "text-white/65" : "text-black/60"}`}>
                {banner.eyebrow}
              </p>
            ) : null}
            <h2 className="banner-heading mt-3 text-[40px] leading-none md:text-[64px]">
              {banner.title}
            </h2>
            {banner.body ? (
              <p
                className={`mt-4 max-w-md text-[14px] leading-6 ${lightText ? "text-white/75" : "text-black/70"}`}
              >
                {banner.body}
              </p>
            ) : null}
            {banner.button_label && banner.button_url ? (
              <a
                href={banner.button_url}
                className={`mt-6 inline-flex h-11 items-center px-6 text-[11px] font-bold uppercase ${lightText ? "bg-white text-black" : "bg-black text-white"}`}
              >
                {banner.button_label}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ShopPage() {
  const { products: storeProducts, presentation } = Route.useLoaderData();
  const search = Route.useSearch();
  const collectionRows = presentation.taxonomy.filter((row) => row.type === "collection");
  const filterRows = presentation.taxonomy.filter((row) => row.type === "filter");
  const [collection, setCollection] = useState(() =>
    resolveTaxonomySlug(search.collection, presentation.taxonomy, "collection"),
  );
  const [activeFilter, setActiveFilter] = useState(() =>
    resolveTaxonomySlug(search.filter, presentation.taxonomy, "filter"),
  );
  const [query, setQuery] = useState(search.q ?? "");
  const [sort, setSort] = useState("featured");
  const tabsRef = useRef<HTMLDivElement>(null);
  const knownCollectionSlugs = useMemo(
    () =>
      new Set(
        collectionRows.filter((row) => row.slug !== "other").map((row) => normalize(row.slug)),
      ),
    [collectionRows],
  );

  useEffect(() => {
    setCollection(resolveTaxonomySlug(search.collection, presentation.taxonomy, "collection"));
    setActiveFilter(resolveTaxonomySlug(search.filter, presentation.taxonomy, "filter"));
    setQuery(search.q ?? "");
  }, [presentation.taxonomy, search.collection, search.filter, search.q]);

  const products = useMemo(() => {
    const term = normalize(query);
    const filtered = storeProducts.filter((product) => {
      const productCollection = normalize(product.collectionSlug);
      const matchesCollection =
        collection === "all" ||
        (collection === "other"
          ? productCollection === "other" || !knownCollectionSlugs.has(productCollection)
          : productCollection === normalize(collection));
      const searchable = [product.name, product.collection, product.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !term || searchable.includes(term);
      const matchesFilter =
        !activeFilter ||
        (product.filterTags ?? []).map(normalize).includes(normalize(activeFilter));
      return matchesCollection && matchesQuery && matchesFilter;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      return 0;
    });
  }, [activeFilter, collection, knownCollectionSlugs, query, sort, storeProducts]);

  const displayedProducts = sort === "featured" ? merchandiseProducts(products) : products;
  const selectedCollection = collectionRows.find((row) => row.slug === collection);
  const promoBanners = presentation.banners.filter((banner) => banner.placement === "shop_promo");
  const scrollTabs = (direction: number) =>
    tabsRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });

  return (
    <StorePage>
      <section className="px-[22px] py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-4 border-b border-black/10 pb-6">
            <div
              className="relative grid min-w-0 grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2"
              data-store-reveal
            >
              <button
                type="button"
                aria-label="Previous collections"
                title="Previous collections"
                onClick={() => scrollTabs(-1)}
                className="shop-scroll-button brand-mango-bg grid h-9 w-9 place-items-center rounded-full text-white"
              >
                <ChevronLeft size={17} />
              </button>
              <div
                ref={tabsRef}
                className="no-scrollbar flex h-9 snap-x snap-mandatory items-center gap-6 overflow-x-auto scroll-smooth px-1 touch-pan-x"
                role="tablist"
                aria-label="Product collections"
              >
                {[{ slug: "all", name: "All" }, ...collectionRows].map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    role="tab"
                    aria-selected={collection === item.slug}
                    onClick={() => setCollection(item.slug)}
                    className={`shop-collection-tab relative flex h-9 shrink-0 snap-start items-center text-[11px] font-bold uppercase ${collection === item.slug ? "text-black" : "text-black/60"}`}
                  >
                    {item.name}
                    {collection === item.slug ? (
                      <span className="brand-mango-bg absolute inset-x-0 bottom-0 h-0.5" />
                    ) : null}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="More collections"
                title="More collections"
                onClick={() => scrollTabs(1)}
                className="shop-scroll-button brand-mango-bg grid h-9 w-9 place-items-center rounded-full text-white"
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1fr)_180px]"
              data-store-reveal
            >
              <label className="store-toolbar-control flex h-11 min-w-0 items-center gap-2 rounded-md border border-black/15 px-3">
                <Search size={16} className="shrink-0 text-[#D9643C]" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                />
              </label>
              <label className="store-toolbar-control flex h-11 min-w-[118px] items-center gap-2 rounded-md border border-black/15 px-3">
                <SlidersHorizontal size={15} className="shrink-0 text-[#D9643C]" />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort products"
                  className="min-w-0 flex-1 bg-transparent text-[10px] font-bold normal-case outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price low</option>
                  <option value="price-high">Price high</option>
                </select>
              </label>
            </div>
            {filterRows.length ? (
              <div
                className="no-scrollbar flex gap-2 overflow-x-auto pb-1 touch-pan-x"
                data-store-reveal
              >
                <button
                  type="button"
                  onClick={() => setActiveFilter("")}
                  className={`store-filter-chip shrink-0 rounded-md border px-3 py-2 text-[10px] font-bold uppercase ${!activeFilter ? "border-black bg-black text-white" : "border-black/15"}`}
                >
                  Any label
                </button>
                {filterRows.map((filter) => (
                  <button
                    key={filter.slug}
                    type="button"
                    onClick={() => setActiveFilter(filter.slug === activeFilter ? "" : filter.slug)}
                    className={`store-filter-chip shrink-0 rounded-md border px-3 py-2 text-[10px] font-bold uppercase ${activeFilter === filter.slug ? "border-black bg-black text-white" : "border-black/15"}`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mt-6 flex items-center justify-between text-[12px]">
            <label className="relative flex h-9 cursor-pointer items-center gap-2 rounded-md pr-2 font-bold transition-colors hover:text-[#C85F22] focus-within:ring-2 focus-within:ring-[#E2713F]/30">
              <SlidersHorizontal size={15} className="text-[#D9643C]" />
              <span>{productCountLabel(displayedProducts.length)}</span>
              <ChevronDown size={13} aria-hidden="true" />
              <select
                aria-label="Filter products by collection"
                value={collection}
                onChange={(event) => setCollection(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="all">All products</option>
                {collectionRows.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <a
              href={
                selectedCollection
                  ? `/shop?collection=${encodeURIComponent(selectedCollection.slug)}`
                  : "/shop"
              }
              className="flex items-center gap-1 font-bold text-[#A84624] hover:text-[#87351B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D9643C]"
            >
              {selectedCollection?.name || "All products"}
              <ChevronRight size={15} />
            </a>
          </div>
          {displayedProducts.length ? (
            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-4 md:gap-x-4 md:gap-y-16">
              {displayedProducts.map((product, index) => (
                <StoreProductCard key={product.slug} product={product} priority={index < 4} />
              ))}
            </div>
          ) : collection !== "all" && !activeFilter && !query.trim() ? (
            <div className="py-24 text-center" aria-live="polite">
              <p className="section-kicker text-black/45">Collection update</p>
              <h2 className="mt-3 text-[24px] font-bold uppercase">
                {selectedCollection?.name || "Collection"} coming soon
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-5 text-black/55">
                New products are being prepared for this collection.
              </p>
            </div>
          ) : (
            <div className="py-24 text-center">
              <h2 className="text-[24px] font-bold uppercase">No products found</h2>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveFilter("");
                }}
                className="mt-5 text-[11px] font-bold uppercase underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {promoBanners.map((banner) => (
        <PromoBanner key={banner.id || `${banner.placement}-${banner.title}`} banner={banner} />
      ))}
    </StorePage>
  );
}
