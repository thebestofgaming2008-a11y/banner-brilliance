import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import honeyMulti from "@/assets/product-photos/honey-kashmir-multiflora.jpg";
import niqabKhadijaFull from "@/assets/product-photos/niqab-khadija-full.jpg";
import sabrWatchBlack from "@/assets/collection-banners/sabr-watch-black.jpg";
import shemaghManBack from "@/assets/product-photos/shemagh-man-back.jpg";
import { StoreProductCard } from "@/components/store/product-card";
import { StorePage } from "@/components/store/store-chrome";
import { merchandiseProducts, toStoreProduct } from "@/data/store";
import { useStoreReveal } from "@/hooks/use-store-reveal";
import {
  listCatalogPresentation,
  type CatalogBanner,
  type CatalogTaxonomyItem,
} from "@/services/catalogPresentation";
import { listActiveProducts } from "@/services/productService";
import { seo } from "@/lib/seo";

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

function DefaultShopHero() {
  return (
    <>
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
    </>
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

function ShopHero({ banner }: { banner?: CatalogBanner }) {
  const lightText = !banner || banner.text_theme !== "light";
  return (
    <section
      className={`relative min-h-[470px] overflow-hidden md:min-h-[580px] ${lightText ? "bg-black text-white" : "bg-white text-black"}`}
      style={{ backgroundColor: banner?.background_color || undefined }}
    >
      {banner ? (
        <>
          <ShopBannerArtwork banner={banner} />
          <div className={`absolute inset-0 ${lightText ? "bg-black/45" : "bg-white/45"}`} />
        </>
      ) : (
        <DefaultShopHero />
      )}
      <div
        className={`relative z-20 mx-auto flex min-h-[470px] max-w-[1280px] items-end px-[22px] pb-12 md:min-h-[580px] md:px-8 md:pb-16 ${bannerAlignment(banner?.content_alignment)}`}
        data-store-reveal
      >
        <div className="max-w-xl">
          <p className={`section-kicker ${lightText ? "text-white/68" : "text-black/60"}`}>
            {banner?.eyebrow || "The complete collection"}
          </p>
          <h1 className="banner-heading mt-3 text-[48px] leading-[0.9] md:text-[78px]">
            {banner?.title || "THE FAWZAAN EDIT"}
          </h1>
          <p
            className={`mt-5 max-w-md text-[14px] leading-6 ${lightText ? "text-white/72" : "text-black/70"}`}
          >
            {banner?.body || "Heritage pieces, modest essentials, SABR watches, and Kashmir honey."}
          </p>
          {banner?.button_label && banner.button_url ? (
            <a
              href={banner.button_url}
              className={`mt-7 inline-flex h-11 items-center px-6 text-[11px] font-bold uppercase ${lightText ? "bg-white text-black" : "bg-black text-white"}`}
            >
              {banner.button_label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
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
  useStoreReveal();
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
  const heroBanner = presentation.banners.find((banner) => banner.placement === "shop_hero");
  const promoBanners = presentation.banners.filter((banner) => banner.placement === "shop_promo");
  const scrollTabs = (direction: number) =>
    tabsRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });

  return (
    <StorePage>
      <ShopHero banner={heroBanner} />

      <section className="px-[22px] py-10 md:px-8 md:py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-4 border-b border-black/10 pb-6 md:grid-cols-[1fr_auto] md:items-end md:gap-5">
            <div className="relative min-w-0">
              <div
                ref={tabsRef}
                className="no-scrollbar -mx-[22px] flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-[54px] touch-pan-x md:mx-0 md:px-0"
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
                    className={`relative shrink-0 snap-start pb-3 text-[11px] font-bold uppercase ${collection === item.slug ? "text-black" : "text-black/40"}`}
                  >
                    {item.name}
                    {collection === item.slug ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f4b400]" />
                    ) : null}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Previous collections"
                title="Previous collections"
                onClick={() => scrollTabs(-1)}
                className="absolute -left-[22px] top-0 grid h-8 w-8 place-items-center bg-white shadow-[8px_0_12px_white] md:hidden"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                aria-label="More collections"
                title="More collections"
                onClick={() => scrollTabs(1)}
                className="absolute -right-[22px] top-0 grid h-8 w-8 place-items-center bg-white shadow-[-8px_0_12px_white] md:hidden"
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <label className="flex h-11 min-w-0 items-center gap-2 border-b border-black/25 md:w-56">
                <Search size={16} className="shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                />
              </label>
              <label className="flex h-11 min-w-[118px] items-center gap-2 border-b border-black/25">
                <SlidersHorizontal size={15} className="shrink-0" />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort products"
                  className="min-w-0 flex-1 bg-transparent text-[10px] font-bold uppercase outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price low</option>
                  <option value="price-high">Price high</option>
                </select>
              </label>
            </div>
            {filterRows.length ? (
              <div className="no-scrollbar col-span-full flex gap-2 overflow-x-auto pb-1 touch-pan-x">
                <button
                  type="button"
                  onClick={() => setActiveFilter("")}
                  className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase ${!activeFilter ? "border-black bg-black text-white" : "border-black/15"}`}
                >
                  Any label
                </button>
                {filterRows.map((filter) => (
                  <button
                    key={filter.slug}
                    type="button"
                    onClick={() => setActiveFilter(filter.slug === activeFilter ? "" : filter.slug)}
                    className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase ${activeFilter === filter.slug ? "border-black bg-black text-white" : "border-black/15"}`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mt-6 flex items-center justify-between text-[11px] text-black/50">
            <span>{displayedProducts.length} products</span>
            <span>{selectedCollection?.name || "All collections"}</span>
          </div>
          {displayedProducts.length ? (
            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-4 md:gap-x-4 md:gap-y-16">
              {displayedProducts.map((product, index) => (
                <StoreProductCard key={product.slug} product={product} priority={index < 4} />
              ))}
            </div>
          ) : collection === "gloves" ? (
            <div className="py-24 text-center" data-store-reveal>
              <p className="section-kicker text-black/45">Coming soon</p>
              <h2 className="mt-3 text-[24px] font-bold uppercase">Gloves collection</h2>
              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-5 text-black/55">
                This collection is being prepared for release.
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
