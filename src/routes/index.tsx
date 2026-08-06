import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { StoreFooter, StoreHeader } from "@/components/store/store-chrome";
import {
  isPreOrderProduct,
  merchandiseProducts,
  type StoreProduct,
  useStoreProducts,
} from "@/data/store";
import { HomepageRenderer } from "@/features/homepage/components";
import { isHomepageEditorData } from "@/features/homepage/default-data";
import { IKHWAAN_HERO_GRADIENT, SALIHAAT_HERO_GRADIENT } from "@/features/homepage/brand";
import type { HeroGradient, HomepageData, HomepageMosaicCard } from "@/features/homepage/types";
import { CORE_MOSAIC_CARD_COUNT, homepageMosaicCards } from "@/features/homepage/mosaic-data";
import { useCurrency } from "@/hooks/use-currency";
import {
  listCatalogPresentation,
  useCatalogPresentation,
  type CatalogBanner,
} from "@/services/catalogPresentation";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, seo } from "@/lib/seo";
import { PromotionPopover } from "@/components/store/promotion-popover";
import { ProductQuickAdd } from "@/components/store/product-quick-add";
import { productCountLabel } from "@/lib/catalog-copy";

import heroNiqabFull from "@/assets/hero-products/hero-niqab-full.webp";
import heroShemaghFull from "@/assets/hero-products/hero-shemagh-full.webp";

export const Route = createFileRoute("/")({
  loader: () => listCatalogPresentation(),
  head: ({ loaderData }) => {
    const metadata = seo({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: "/" });
    const publishedHomepage = isHomepageEditorData(loaderData?.homepage)
      ? loaderData.homepage
      : null;
    const publishedHero = publishedHomepage?.content.find((item) => item.type === "Hero");
    const heroPreload =
      publishedHero?.type === "Hero"
        ? publishedHero.props.slides[0]?.foregroundImage || heroShemaghFull
        : heroShemaghFull;
    return {
      ...metadata,
      links: [
        ...metadata.links,
        { rel: "preload", as: "image", href: heroPreload, fetchPriority: "high" },
      ],
    };
  },
  component: Index,
});

type Banner = {
  title: string;
  subtitle: string;
  product: string;
  productAlt: string;
  titleX: number;
  titleY: number;
  titleW: number;
  href: string;
  gradient: HeroGradient;
};

type Product = StoreProduct & {
  audience?: "Men" | "Women" | "Unisex";
  short?: string;
};

type CollectionName = Product["collection"];

const FRAME_W = 390;
const FRAME_H = 649;

const defaultHeroBanners: Banner[] = [
  {
    title: "AL-IKHWAAN SET",
    subtitle: "LIL-MUSLIMEEN",
    product: heroShemaghFull,
    productAlt: "Red and white shemagh set",
    titleX: 37,
    titleY: 121,
    titleW: 316,
    href: "/shop?collection=Shemaghs",
    gradient: IKHWAAN_HERO_GRADIENT,
  },
  {
    title: "AS-SALIHAAT SET",
    subtitle: "LIL MUSLIMAAT",
    product: heroNiqabFull,
    productAlt: "Black niqab set",
    titleX: 41,
    titleY: 100,
    titleW: 319,
    href: "/shop?collection=Niqabs",
    gradient: SALIHAAT_HERO_GRADIENT,
  },
];

const collectionBanners = [
  {
    title: "KASHMIR HONEY",
    eyebrow: "Harvest edit",
    copy: "Raw floral honey from Kashmir.",
    image: "/homepage/honey.jpg",
    imageClassName: "object-center",
    href: "/shop?collection=Honey",
  },
  {
    title: "MAKKAH GLOVES",
    eyebrow: "Coming next",
    copy: "Gold artwork cases in staple colours.",
    image: "/homepage/makkah-gloves.jpg",
    imageClassName: "object-center",
    href: "/shop?collection=Gloves",
  },
];

function productImageClassName(product: Product) {
  return `h-full w-full object-cover ${product.imageClassName ?? ""}`;
}

function useScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px 6% 0px", threshold: 0.02 },
    );

    items.forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${Math.min(index % 3, 2) * 20}ms`);
      observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);
}

function useHashScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sectionHashes = new Set([
      "#collections",
      "#honey",
      "#watch-collection",
      "#essentials",
      "#bestsellers",
    ]);

    const revealVisibleChildren = (target: HTMLElement) => {
      target.querySelectorAll<HTMLElement>("[data-reveal]").forEach((item) => {
        item.classList.add("is-visible");
      });
    };

    const scrollToCurrentHash = () => {
      const hash = window.location.hash;
      if (!sectionHashes.has(hash)) return false;

      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return false;

      revealVisibleChildren(target);
      target.scrollIntoView({ block: "start", behavior: "auto" });
      return true;
    };

    const scrollToHash = () => {
      if (!sectionHashes.has(window.location.hash)) return;

      window.requestAnimationFrame(scrollToCurrentHash);
      const timers = [120, 420, 900].map((delay) => window.setTimeout(scrollToCurrentHash, delay));
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    };

    const clearScheduledScroll = scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      clearScheduledScroll?.();
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, []);
}

function HeroBanner({
  banner,
  isPriority,
  slideCount,
}: {
  banner: Banner;
  isPriority?: boolean;
  slideCount: number;
}) {
  return (
    <article
      className="brand-mango-bg relative shrink-0 overflow-hidden"
      style={{
        width: `${100 / slideCount}%`,
        height: `clamp(560px, ${(FRAME_H / FRAME_W) * 100}vw, 820px)`,
        backgroundImage: `linear-gradient(${banner.gradient.angle}deg, ${banner.gradient.startColor}, ${banner.gradient.endColor})`,
      }}
      data-default-hero={banner.title}
    >
      <a
        href={banner.href}
        aria-label={`Shop ${banner.title}`}
        className="absolute inset-0 z-[15]"
      />

      <div
        className="hero-product-frame pointer-events-none absolute top-0 h-full -translate-x-1/2 overflow-hidden"
        style={{
          aspectRatio: `${FRAME_W} / ${FRAME_H}`,
          containerType: "inline-size",
        }}
      >
        <img
          src={banner.product}
          alt={banner.productAlt}
          loading={isPriority ? "eager" : "lazy"}
          fetchPriority={isPriority ? "high" : "low"}
          decoding="async"
          className="absolute inset-x-0 bottom-0 z-10 mx-auto h-auto w-full"
          style={{ filter: "drop-shadow(18px 12px 20px rgba(50, 14, 20, 0.42))" }}
        />
      </div>
      <span className="hero-mobile-legibility-scrim" aria-hidden="true" />
      <div className="hero-conversion-copy pointer-events-none absolute z-20">
        <h1 className="hero-conversion-title m-0 whitespace-nowrap font-serif-display font-normal">
          {banner.title}
        </h1>
        <p className="hero-conversion-subtitle whitespace-nowrap font-bold uppercase">
          {banner.subtitle}
        </p>
        <span className="hero-conversion-cta inline-flex items-center justify-center bg-white font-bold uppercase text-[#211719] md:bg-[#211719] md:text-white">
          Shop the collection
        </span>
      </div>
    </article>
  );
}

function managedBannerImageClass(position: string | null | undefined) {
  if (position === "top") return "object-top";
  if (position === "bottom") return "object-bottom";
  return "object-center";
}

function managedBannerAlignmentClass(alignment: string | null | undefined) {
  if (alignment === "center") return "justify-center text-center";
  if (alignment === "right") return "justify-end text-right";
  return "justify-start text-left";
}

function managedBannerOverlayStyle(banner: CatalogBanner) {
  const scale = Math.min(90, Math.max(25, Number(banner.overlay_scale ?? 58)));
  const position = banner.overlay_position ?? "right";
  return {
    width: `${scale}%`,
    left: position === "left" ? 0 : position === "center" ? "50%" : "auto",
    right: position === "right" ? 0 : "auto",
    transform: position === "center" ? "translateX(-50%)" : undefined,
  };
}

function ManagedBannerArtwork({
  banner,
  priority = false,
}: {
  banner: CatalogBanner;
  priority?: boolean;
}) {
  return (
    <>
      {banner.image_url ? (
        <img
          src={banner.image_url}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "low"}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${managedBannerImageClass(banner.image_position)}`}
        />
      ) : null}
      {banner.overlay_image_url ? (
        <img
          src={banner.overlay_image_url}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "low"}
          decoding="async"
          className="pointer-events-none absolute bottom-0 z-10 max-h-[96%] object-contain object-bottom"
          style={managedBannerOverlayStyle(banner)}
        />
      ) : null}
    </>
  );
}

function ManagedHeroBanner({
  banner,
  isPriority,
  slideCount,
}: {
  banner: CatalogBanner;
  isPriority?: boolean;
  slideCount: number;
}) {
  const lightBackground = banner.text_theme === "light";
  const alignment = managedBannerAlignmentClass(banner.content_alignment);

  return (
    <article
      className={`relative shrink-0 overflow-hidden ${lightBackground ? "text-black" : "text-white"}`}
      style={{
        width: `${100 / slideCount}%`,
        height: "clamp(560px, 145vw, 820px)",
        backgroundColor: banner.background_color || "#F6AD32",
      }}
    >
      <ManagedBannerArtwork banner={banner} priority={isPriority} />
      <div
        className={`absolute inset-0 ${
          lightBackground
            ? "bg-gradient-to-t from-white/80 via-white/10 to-transparent"
            : "bg-gradient-to-t from-black/75 via-black/10 to-transparent"
        }`}
      />
      <div
        className={`relative z-20 flex h-full items-end px-[22px] pb-16 md:px-12 md:pb-20 ${alignment}`}
      >
        <div className="max-w-2xl">
          {banner.eyebrow ? (
            <p className={`section-kicker ${lightBackground ? "text-black/65" : "text-white/72"}`}>
              {banner.eyebrow}
            </p>
          ) : null}
          <h1 className="banner-heading mt-3 text-[50px] leading-[0.9] md:text-[82px]">
            {banner.title}
          </h1>
          {banner.body ? (
            <p
              className={`mt-4 max-w-lg text-[14px] leading-6 ${lightBackground ? "text-black/70" : "text-white/78"}`}
            >
              {banner.body}
            </p>
          ) : null}
          {banner.button_label && banner.button_url ? (
            <a
              href={banner.button_url}
              className={`mt-7 inline-flex h-11 items-center px-6 text-[11px] font-bold uppercase ${
                lightBackground ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {banner.button_label}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function HeroSlider() {
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    intent: "pending" | "horizontal" | "vertical";
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const { banners: managedBanners } = useCatalogPresentation();
  const managedHeroBanners = managedBanners.filter(
    (banner) => banner.placement === "homepage_hero",
  );
  const slideCount = managedHeroBanners.length || defaultHeroBanners.length;
  const slideLabels = managedHeroBanners.length
    ? managedHeroBanners.map((banner) => banner.title)
    : defaultHeroBanners.map((banner) => banner.title);

  useEffect(() => {
    if (isDragging || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: number | undefined;

    const stopTimer = () => {
      if (timer) window.clearInterval(timer);
      timer = undefined;
    };

    const startTimer = () => {
      stopTimer();
      if (document.hidden) return;

      timer = window.setInterval(() => {
        setActive((current) => (current + 1) % slideCount);
      }, 5200);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stopTimer();
      else startTimer();
    };

    startTimer();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDragging, slideCount]);

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, slideCount - 1)));
  }, [slideCount]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (slideCount < 2 || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('[aria-label="Choose hero slide"]')) return;

    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      intent: "pending",
      moved: false,
    };
    suppressClick.current = false;
    setDragOffset(0);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const currentDrag = drag.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    const offset = event.clientX - currentDrag.startX;
    const verticalOffset = event.clientY - currentDrag.startY;
    if (currentDrag.intent === "pending") {
      const horizontalDistance = Math.abs(offset);
      const verticalDistance = Math.abs(verticalOffset);
      if (horizontalDistance < 8 && verticalDistance < 8) return;
      if (verticalDistance >= horizontalDistance * 1.1) {
        currentDrag.intent = "vertical";
        return;
      }
      if (horizontalDistance < verticalDistance * 1.2) return;

      currentDrag.intent = "horizontal";
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (currentDrag.intent !== "horizontal") return;

    if (Math.abs(offset) > 5) currentDrag.moved = true;
    setDragOffset(offset);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLElement>, cancelled = false) => {
    const currentDrag = drag.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    const offset = event.clientX - currentDrag.startX;
    const threshold = Math.min(96, Math.max(44, event.currentTarget.clientWidth * 0.12));
    if (!cancelled && currentDrag.intent === "horizontal" && Math.abs(offset) >= threshold) {
      const direction = offset < 0 ? 1 : -1;
      setActive((current) => (current + direction + slideCount) % slideCount);
    }

    suppressClick.current = !cancelled && currentDrag.intent === "horizontal" && currentDrag.moved;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    drag.current = null;
    setDragOffset(0);
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section
      className={`brand-mango-bg relative select-none overflow-hidden ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      aria-label="Featured collections"
      data-testid="hero-slider"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishDrag(event)}
      onPointerCancel={(event) => finishDrag(event, true)}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragStart={(event) => event.preventDefault()}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className="hero-track flex"
        data-hero-track
        style={{
          width: `${slideCount * 100}%`,
          transform: `translate3d(calc(-${active * (100 / slideCount)}% + ${dragOffset}px), 0, 0)`,
          transition: isDragging ? "none" : undefined,
        }}
      >
        {managedHeroBanners.length
          ? managedHeroBanners.map((banner, index) => (
              <ManagedHeroBanner
                key={banner.id || `${banner.title}-${index}`}
                banner={banner}
                isPriority={index === 0}
                slideCount={slideCount}
              />
            ))
          : defaultHeroBanners.map((banner, index) => (
              <HeroBanner
                key={banner.title}
                banner={banner}
                isPriority={index === 0}
                slideCount={slideCount}
              />
            ))}
      </div>
      <div className="absolute bottom-4 right-5 z-30 flex gap-2" aria-label="Choose hero slide">
        {slideLabels.map((label, index) => (
          <button
            type="button"
            key={`${label}-${index}`}
            aria-label={`Show ${label}`}
            aria-current={active === index}
            onClick={() => setActive(index)}
            className={`h-1.5 rounded-full bg-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              active === index ? "w-8 opacity-100" : "w-3 opacity-50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function CollectionBanners() {
  return (
    <section id="catalog" className="bg-white px-[18px] py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-[1120px]">
        <div className="mx-auto grid max-w-[920px] gap-4 md:grid-cols-2 md:gap-5">
          {collectionBanners.map((banner, index) => (
            <a
              key={banner.title}
              href={banner.href}
              className="collection-banner group relative block aspect-[9/16] overflow-hidden bg-black text-white"
              data-reveal
            >
              <img
                src={banner.image}
                alt=""
                aria-hidden
                loading={index === 0 ? "eager" : "lazy"}
                className={`absolute inset-0 h-full w-full object-cover ${banner.imageClassName}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-transparent" />
              <div className="relative z-10 flex h-full items-end p-6 md:p-8">
                <div className="max-w-[360px]">
                  <p className="section-kicker text-white/72">{banner.eyebrow}</p>
                  <h2 className="banner-heading mt-3 text-[42px] md:text-[50px]">{banner.title}</h2>
                  <p className="commerce-copy mt-4 max-w-[280px] text-white/76">{banner.copy}</p>
                  <span className="mt-7 inline-flex h-11 items-center bg-white px-5 text-[10px] font-bold uppercase tracking-normal text-black">
                    Shop collection
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <h2 className="section-heading text-[32px] text-black md:text-[46px]">{title}</h2>
      <p className="section-kicker mt-1 text-black">{eyebrow}</p>
    </div>
  );
}

function ProductTile({
  product,
  priority,
  reveal = true,
}: {
  product: Product;
  priority?: boolean;
  reveal?: boolean;
}) {
  const discount = product.compareAt
    ? "21% off"
    : isPreOrderProduct(product)
      ? undefined
      : product.badge;
  const { formatPrice } = useCurrency();
  const price = formatPrice(product.price);
  const compareAt = product.compareAt ? formatPrice(product.compareAt) : undefined;
  const available = product.inStock !== false && Number(product.stockQuantity ?? 1) > 0;
  const lowStock =
    available &&
    typeof product.stockQuantity === "number" &&
    product.stockQuantity > 0 &&
    product.stockQuantity <= 3;

  return (
    <article
      className="product-card group flex min-w-0 flex-col"
      data-reveal={reveal ? "" : undefined}
      data-product-stock={available ? "available" : "sold-out"}
    >
      <a href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
        <div className="product-card__media relative aspect-[3/4] overflow-hidden bg-white">
          <img
            src={product.images[0]}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            className={`${productImageClassName(product)} transition-opacity duration-300 ${
              product.images[1] && available ? "group-hover:opacity-0" : ""
            }`}
          />
          {product.images[1] && available ? (
            <img
              src={product.images[1]}
              alt=""
              aria-hidden
              loading="lazy"
              className={`absolute inset-0 ${productImageClassName(product)} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
            />
          ) : null}
          {!available ? (
            <span className="absolute left-2 top-2 rounded-md bg-black px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-normal text-white shadow-sm">
              Sold out
            </span>
          ) : discount ? (
            <span className="absolute left-2 top-2 bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-normal">
              {discount}
            </span>
          ) : null}
          <div className="absolute inset-x-2 bottom-2 hidden translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:block">
            <span className="flex h-9 items-center justify-center bg-black text-[10px] font-bold uppercase tracking-normal text-white">
              View product
            </span>
          </div>
        </div>
      </a>
      <div className="mt-3 flex flex-1 flex-col text-left">
        <p className="section-kicker text-black/60">{product.collection}</p>
        <a href={`/products/${product.slug}`} className="block">
          <h3 className="product-name mt-1 min-h-8 text-[15px] leading-4 text-current md:text-[16px]">
            {product.name}
          </h3>
        </a>
        {product.reviews > 0 ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-current/55">
            <Star size={11} fill="currentColor" />
            <span>{product.rating.toFixed(1)}</span>
            <span>({product.reviews})</span>
          </div>
        ) : null}
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-[13px] font-semibold leading-tight text-current">{price}</p>
          {compareAt ? (
            <p className="text-[12px] leading-tight text-current/60 line-through">{compareAt}</p>
          ) : null}
        </div>
        {lowStock ? (
          <p className="mt-2 text-[9px] font-bold uppercase text-[#A84624]">
            Only {product.stockQuantity} left
          </p>
        ) : null}
        <div className="mt-auto">
          <ProductQuickAdd product={product} />
        </div>
      </div>
    </article>
  );
}

function ShopAllProducts() {
  const { products: catalog } = useStoreProducts();
  const { taxonomy } = useCatalogPresentation();
  const collectionRows = useMemo(() => {
    const seen = new Set<string>();
    return taxonomy
      .filter((item) => item.type === "collection" && item.is_active !== false)
      .filter((item) => {
        const key = item.slug.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [taxonomy]);
  const filterRows = useMemo(
    () => taxonomy.filter((item) => item.type === "filter" && item.is_active !== false),
    [taxonomy],
  );
  const [activeCollection, setActiveCollection] = useState("all");
  const [activeTag, setActiveTag] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const tabsRef = useRef<HTMLDivElement>(null);
  const selectedCollection = collectionRows.find((item) => item.slug === activeCollection);
  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = catalog.filter((product) => {
      const collectionSlug =
        product.collectionSlug || product.collection.toLowerCase().replace(/\s+/g, "-");
      const matchesCollection =
        activeCollection === "all" ||
        collectionSlug.toLowerCase() === activeCollection.toLowerCase();
      const matchesTag =
        !activeTag ||
        (product.filterTags ?? []).some((tag) => tag.toLowerCase() === activeTag.toLowerCase());
      const matchesQuery =
        !term ||
        [product.name, product.collection, product.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      return matchesCollection && matchesTag && matchesQuery;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      return 0;
    });
    return sort === "featured" ? merchandiseProducts(sorted) : sorted;
  }, [activeCollection, activeTag, catalog, query, sort]);
  const selectedEmptyCollection =
    visibleProducts.length === 0 && activeCollection !== "all" && !activeTag && !query.trim();

  useEffect(() => {
    const hashFilters: Record<string, CollectionName> = {
      "#shop-shemaghs": "Shemaghs",
      "#shop-niqabs": "Niqabs",
      "#shop-kufis": "Kufis",
      "#shop-honey": "Honey",
      "#shop-watches": "Watches",
    };

    const applyHashFilter = () => {
      const nextFilter = hashFilters[window.location.hash];
      if (!nextFilter) return;
      const match = collectionRows.find(
        (filter) => filter.name.toLowerCase() === nextFilter.toLowerCase(),
      );
      if (!match) return;

      setActiveCollection(match.slug);
      window.requestAnimationFrame(() =>
        document.getElementById("shop-all")?.scrollIntoView({ behavior: "smooth" }),
      );
    };

    applyHashFilter();
    window.addEventListener("hashchange", applyHashFilter);
    return () => window.removeEventListener("hashchange", applyHashFilter);
  }, [collectionRows]);

  const scrollTabs = (direction: number) =>
    tabsRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });

  return (
    <section id="shop-all" className="scroll-mt-[76px] bg-white px-[22px] py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1180px]">
        <div data-reveal>
          <div>
            <p className="section-kicker text-black/50">Browse the store</p>
            <h2 className="section-heading mt-2 text-[34px] text-black md:text-[52px]">SHOP ALL</h2>
          </div>
        </div>

        <div className="mt-7 grid gap-4 border-b border-black/10 pb-6">
          <div className="relative grid min-w-0 grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2">
            <button
              type="button"
              aria-label="Previous collections"
              onClick={() => scrollTabs(-1)}
              className="shop-scroll-button brand-mango-bg grid h-9 w-9 place-items-center rounded-full text-white"
            >
              <ChevronLeft size={17} />
            </button>
            <div
              ref={tabsRef}
              className="no-scrollbar flex h-9 snap-x snap-mandatory items-center gap-6 overflow-x-auto scroll-smooth px-1 touch-pan-x"
              role="tablist"
              aria-label="Homepage product collections"
            >
              {[{ slug: "all", name: "All" }, ...collectionRows].map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  role="tab"
                  aria-selected={activeCollection === item.slug}
                  onClick={() => setActiveCollection(item.slug)}
                  className={`shop-collection-tab relative flex h-9 shrink-0 snap-start items-center text-[11px] font-bold uppercase ${activeCollection === item.slug ? "text-black" : "text-black/60"}`}
                >
                  {item.name}
                  {activeCollection === item.slug ? (
                    <span className="brand-mango-bg absolute inset-x-0 bottom-0 h-0.5" />
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="More collections"
              onClick={() => scrollTabs(1)}
              className="shop-scroll-button brand-mango-bg grid h-9 w-9 place-items-center rounded-full text-white"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
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
                aria-label="Sort homepage products"
                className="min-w-0 flex-1 bg-transparent text-[10px] font-bold uppercase outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price low</option>
                <option value="price-high">Price high</option>
              </select>
            </label>
          </div>

          {filterRows.length ? (
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 touch-pan-x">
              <button
                type="button"
                onClick={() => setActiveTag("")}
                className={`store-filter-chip shrink-0 rounded-md border px-3 py-2 text-[10px] font-bold uppercase ${!activeTag ? "border-black bg-black text-white" : "border-black/15"}`}
              >
                Any label
              </button>
              {filterRows.map((filter) => (
                <button
                  key={filter.slug}
                  type="button"
                  onClick={() => setActiveTag(filter.slug === activeTag ? "" : filter.slug)}
                  className={`store-filter-chip shrink-0 rounded-md border px-3 py-2 text-[10px] font-bold uppercase ${activeTag === filter.slug ? "border-black bg-black text-white" : "border-black/15"}`}
                >
                  {filter.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between text-[12px]">
          <label className="relative flex h-9 cursor-pointer items-center gap-2 rounded-md pr-2 font-bold">
            <SlidersHorizontal size={15} className="text-[#D9643C]" />
            <span>{productCountLabel(visibleProducts.length)}</span>
            <ChevronDown size={13} aria-hidden="true" />
            <select
              aria-label="Filter homepage products by collection"
              value={activeCollection}
              onChange={(event) => setActiveCollection(event.target.value)}
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
            className="flex items-center gap-1 font-bold text-[#A84624]"
          >
            {selectedCollection?.name || "All products"}
            <ChevronRight size={15} />
          </a>
        </div>

        {visibleProducts.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-11 md:grid-cols-4 md:gap-x-4 md:gap-y-14">
            {visibleProducts.map((product) => (
              <ProductTile key={product.slug} product={product} reveal={false} />
            ))}
          </div>
        ) : selectedEmptyCollection ? (
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
          <div className="py-24 text-center" aria-live="polite">
            <h2 className="text-[24px] font-bold uppercase">No products found</h2>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveTag("");
                setActiveCollection("all");
              }}
              className="mt-5 text-[11px] font-bold uppercase underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function MosaicCollectionCard({
  collection,
  featured = false,
  index,
  added = false,
}: {
  collection: HomepageMosaicCard;
  featured?: boolean;
  index: number;
  added?: boolean;
}) {
  return (
    <a
      href={collection.href}
      className={`collection-banner homepage-mosaic__card ${added ? "homepage-mosaic__card--added" : `homepage-mosaic__card--${index + 1}`} group relative block overflow-hidden bg-black text-white`}
      data-reveal
      data-mosaic-card={collection.title}
      data-mosaic-card-id={collection.id}
    >
      {collection.image ? (
        <img
          src={collection.image}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
          style={{ objectPosition: collection.imagePosition }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#3a3a38]" aria-hidden />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/8 to-transparent" />
      <div
        className={
          featured
            ? "absolute inset-x-0 bottom-0 p-6 md:p-8"
            : "absolute inset-x-0 bottom-0 p-4 md:p-5"
        }
      >
        <p className="section-kicker text-white/72">{collection.eyebrow}</p>
        <h2
          className={`banner-heading mt-3 ${featured ? "text-[38px] md:text-[46px]" : "text-[21px] md:text-[23px]"}`}
        >
          {collection.title}
        </h2>
        <span
          className={
            featured
              ? "homepage-mosaic__featured-link mt-6 inline-flex h-10 items-center gap-2 bg-white px-4 text-[10px] font-bold uppercase text-black"
              : "homepage-mosaic__link mt-4 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase text-white"
          }
        >
          {featured ? "Shop collection" : "Explore"}
          <ChevronRight size={featured ? 14 : 12} />
        </span>
      </div>
    </a>
  );
}

function HomepageCollectionMosaic({
  homepage,
  onAddMosaicCard,
}: {
  homepage?: HomepageData | null;
  onAddMosaicCard?: () => void;
}) {
  const mosaicCollections = homepageMosaicCards(homepage);
  const coreCollections = mosaicCollections.slice(0, CORE_MOSAIC_CARD_COUNT);
  const addedCollections = mosaicCollections.slice(CORE_MOSAIC_CARD_COUNT);
  const addedLayout = addedCollections.length <= 4 ? String(addedCollections.length) : "many";
  const addedRemainder = addedCollections.length % 3;
  return (
    <section
      id="collections"
      className="homepage-mosaic scroll-mt-[76px] bg-white py-12 md:py-20"
      data-testid="homepage-collection-mosaic"
    >
      <div className="mx-auto max-w-[1180px] px-[18px] md:px-8">
        <div className="homepage-mosaic__marker">
          <p className="section-kicker text-black/56">Collections</p>
        </div>
        <div className="homepage-mosaic__grid">
          {coreCollections.map((collection, index) => (
            <MosaicCollectionCard
              key={collection.id}
              collection={collection}
              featured={index === 0}
              index={index}
            />
          ))}
        </div>
        {addedCollections.length ? (
          <div
            className={`homepage-mosaic__extras homepage-mosaic__extras--${addedLayout} homepage-mosaic__extras--remainder-${addedRemainder}`}
            data-added-collections={addedCollections.length}
          >
            {addedCollections.map((collection, index) => (
              <MosaicCollectionCard
                key={collection.id}
                collection={collection}
                index={index}
                added
              />
            ))}
          </div>
        ) : null}
        {onAddMosaicCard ? (
          <div className="studio-inline-add-section">
            <button type="button" data-studio-add-mosaic onClick={onAddMosaicCard}>
              <Plus size={26} />
              <span>Add collection tile</span>
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Index() {
  useScrollReveal();
  useHashScroll();
  const initialPresentation = Route.useLoaderData();
  const { homepage } = useCatalogPresentation(initialPresentation);

  return (
    <main className="min-h-screen bg-white font-sans-ui text-black antialiased">
      <StoreHeader />
      <LegacyHomepageContent homepage={homepage} />
      <StoreFooter />
      <PromotionPopover />
    </main>
  );
}

function editorSlice(data: HomepageData, mode: "hero" | "after-honey"): HomepageData {
  return {
    ...data,
    content:
      mode === "hero"
        ? data.content.filter((item) => item.type === "Hero").slice(0, 1)
        : data.content.filter(
            (item) => item.type === "CollectionFeature" || item.type === "PromoBanner",
          ),
  };
}

export function LegacyHomepageContent({
  homepage,
  editMode = false,
  onAddMosaicCard,
}: {
  homepage?: HomepageData | null;
  editMode?: boolean;
  onAddMosaicCard?: () => void;
}) {
  const editorHomepage = isHomepageEditorData(homepage) ? homepage : null;
  const customSections = editorHomepage ? editorSlice(editorHomepage, "after-honey") : null;
  return (
    <>
      {editorHomepage ? (
        <HomepageRenderer data={editorSlice(editorHomepage, "hero")} editMode={editMode} />
      ) : (
        <HeroSlider />
      )}
      <CollectionBanners />
      <ShopAllProducts />
      <HomepageCollectionMosaic homepage={editorHomepage} onAddMosaicCard={onAddMosaicCard} />
      {customSections?.content.length ? (
        <HomepageRenderer data={customSections} editMode={editMode} />
      ) : null}
      <ManagedCollectionSections />
      <ManagedHomepageBanners />
      <ExploreBeyond />
    </>
  );
}

function ManagedCollectionSections() {
  const { products } = useStoreProducts();
  const { banners: managedBanners, taxonomy } = useCatalogPresentation();
  const sections = managedBanners.filter(
    (banner) => banner.placement === "homepage_collection" && banner.category_slug,
  );

  if (!sections.length) return null;

  return (
    <div>
      {sections.map((banner) => {
        const categorySlug = String(banner.category_slug).toLowerCase();
        const category = taxonomy.find(
          (item) => item.type === "collection" && item.slug.toLowerCase() === categorySlug,
        );
        const sectionProducts = merchandiseProducts(
          products.filter((product) => {
            const slug = String(product.collectionSlug ?? "").toLowerCase();
            const label = String(product.collection ?? "").toLowerCase();
            return slug === categorySlug || label === category?.name.toLowerCase();
          }),
        ).slice(0, Math.min(8, Math.max(2, banner.product_limit ?? 4)));
        const lightBackground = banner.text_theme === "light";
        const alignment = managedBannerAlignmentClass(banner.content_alignment);
        const collectionUrl =
          banner.button_url || `/shop?collection=${encodeURIComponent(categorySlug)}`;

        return (
          <section
            key={banner.id || `${categorySlug}-${banner.title}`}
            className="border-t border-black/10 bg-white px-[22px] py-16 md:px-8 md:py-24"
          >
            <div className="mx-auto max-w-[1180px]">
              <a
                href={collectionUrl}
                className={`collection-banner relative block min-h-[440px] overflow-hidden md:min-h-[560px] ${
                  lightBackground ? "bg-white text-black" : "bg-black text-white"
                }`}
                style={{ backgroundColor: banner.background_color || undefined }}
                data-reveal
              >
                <ManagedBannerArtwork banner={banner} />
                <div
                  className={`absolute inset-0 ${
                    lightBackground
                      ? "bg-gradient-to-t from-white/85 via-white/10 to-transparent"
                      : "bg-gradient-to-t from-black/80 via-black/12 to-transparent"
                  }`}
                />
                <div
                  className={`relative z-20 flex min-h-[440px] items-end p-6 md:min-h-[560px] md:p-10 ${alignment}`}
                >
                  <div className="max-w-xl">
                    {banner.eyebrow ? (
                      <p
                        className={`section-kicker ${lightBackground ? "text-black/60" : "text-white/70"}`}
                      >
                        {banner.eyebrow}
                      </p>
                    ) : null}
                    <h2 className="banner-heading mt-3 text-[44px] leading-none md:text-[68px]">
                      {banner.title}
                    </h2>
                    {banner.body ? (
                      <p
                        className={`mt-4 max-w-md text-[14px] leading-6 ${lightBackground ? "text-black/70" : "text-white/76"}`}
                      >
                        {banner.body}
                      </p>
                    ) : null}
                    <span
                      className={`mt-7 inline-flex h-11 items-center px-6 text-[11px] font-bold uppercase ${
                        lightBackground ? "bg-black text-white" : "bg-white text-black"
                      }`}
                    >
                      {banner.button_label || "Shop collection"}
                    </span>
                  </div>
                </div>
              </a>

              {sectionProducts.length ? (
                <div className="mt-10 grid grid-cols-2 gap-x-2 gap-y-10 md:grid-cols-4 md:gap-x-4">
                  {sectionProducts.map((product) => (
                    <ProductTile key={product.slug} product={product} />
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-black/55">
                  Add visible products to {category?.name || banner.title} to fill this section.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ExploreBeyond() {
  const { products } = useStoreProducts();
  const { taxonomy } = useCatalogPresentation();
  const knownCollections = useMemo(
    () =>
      new Set(
        taxonomy
          .filter(
            (item) =>
              item.type === "collection" && item.is_active !== false && item.slug !== "other",
          )
          .map((item) => item.slug.toLowerCase()),
      ),
    [taxonomy],
  );
  const otherProducts = merchandiseProducts(
    products.filter((product) => {
      const slug = String(product.collectionSlug ?? "")
        .trim()
        .toLowerCase();
      return slug === "other" || !knownCollections.has(slug);
    }),
  );

  if (!otherProducts.length) return null;

  return (
    <section className="border-t border-black/10 bg-white px-[22px] py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-end justify-between gap-5" data-reveal>
          <div>
            <p className="section-kicker text-black/45">More from Fawzaan</p>
            <h2 className="section-heading mt-2 text-[34px] text-black md:text-[52px]">
              EXPLORE BEYOND
            </h2>
          </div>
          <a
            href="/shop?collection=other"
            className="hidden items-center gap-1 text-[11px] font-bold uppercase text-black md:inline-flex"
          >
            View all <ChevronRight size={14} />
          </a>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-11 md:grid-cols-4 md:gap-x-4 md:gap-y-14">
          {otherProducts.slice(0, 8).map((product) => (
            <ProductTile key={product.slug} product={product} reveal={false} />
          ))}
        </div>
        <a
          href="/shop?collection=other"
          className="mt-10 flex h-12 w-full items-center justify-center gap-2 bg-black text-[11px] font-bold uppercase text-white md:hidden"
        >
          View all <ChevronRight size={15} />
        </a>
      </div>
    </section>
  );
}

function ManagedHomepageBanners() {
  const { banners: managedBanners } = useCatalogPresentation();
  const homepageBanners = managedBanners.filter((banner) => banner.placement === "homepage_promo");

  if (!homepageBanners.length) return null;

  return (
    <section className="space-y-4 px-4 py-12 md:px-8 md:py-20">
      {homepageBanners.map((banner) => (
        <article
          key={banner.id || `${banner.placement}-${banner.title}`}
          className={`relative mx-auto min-h-[440px] max-w-[1180px] overflow-hidden md:min-h-[560px] ${
            banner.text_theme === "light" ? "bg-white text-black" : "bg-black text-white"
          }`}
          style={{ backgroundColor: banner.background_color || undefined }}
          data-store-reveal
        >
          <ManagedBannerArtwork banner={banner} />
          <div
            className={`absolute inset-0 ${
              banner.text_theme === "light" ? "bg-white/45" : "bg-black/45"
            }`}
          />
          <div
            className={`relative z-20 flex min-h-[440px] items-end p-7 md:min-h-[560px] md:p-12 ${managedBannerAlignmentClass(banner.content_alignment)}`}
          >
            <div className="max-w-lg">
              {banner.eyebrow ? (
                <p
                  className={`section-kicker ${
                    banner.text_theme === "light" ? "text-black/65" : "text-white/65"
                  }`}
                >
                  {banner.eyebrow}
                </p>
              ) : null}
              <h2 className="banner-heading mt-3 text-[42px] leading-none md:text-[68px]">
                {banner.title}
              </h2>
              {banner.body ? (
                <p
                  className={`mt-4 max-w-md text-[14px] leading-6 ${
                    banner.text_theme === "light" ? "text-black/75" : "text-white/75"
                  }`}
                >
                  {banner.body}
                </p>
              ) : null}
              {banner.button_label && banner.button_url ? (
                <a
                  href={banner.button_url}
                  className={`mt-6 inline-flex h-11 items-center px-6 text-[11px] font-bold uppercase ${
                    banner.text_theme === "light" ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  {banner.button_label}
                </a>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
