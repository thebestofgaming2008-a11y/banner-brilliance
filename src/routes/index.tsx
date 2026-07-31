import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { StoreFooter, StoreHeader } from "@/components/store/store-chrome";
import { merchandiseProducts, type StoreProduct, useStoreProducts } from "@/data/store";
import { HomepageRenderer } from "@/features/homepage/components";
import { isHomepageEditorData } from "@/features/homepage/default-data";
import { IKHWAAN_HERO_GRADIENT, SALIHAAT_HERO_GRADIENT } from "@/features/homepage/brand";
import type { HeroGradient, HomepageData } from "@/features/homepage/types";
import { MangoMenuIcon } from "@/components/store/mango-menu-icon";
import { useCurrency } from "@/hooks/use-currency";
import { useCatalogPresentation, type CatalogBanner } from "@/services/catalogPresentation";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, seo } from "@/lib/seo";
import { STORE_LOGO_URL } from "@/lib/store-config";
import { PromotionPopover } from "@/components/store/promotion-popover";
import { productCountLabel } from "@/lib/catalog-copy";

import heroNiqabFull from "@/assets/hero-products/hero-niqab-full.webp";
import heroShemaghFull from "@/assets/hero-products/hero-shemagh-full.webp";
import honeyAcacia from "@/assets/product-photos/honey-kashmir-acacia.jpg";
import honeyBlack from "@/assets/product-photos/honey-kashmir-black.jpg";
import honeyMulti from "@/assets/product-photos/honey-kashmir-multiflora.jpg";
import kufiFront from "@/assets/product-photos/kufi-front.jpg";
import kufiSide from "@/assets/product-photos/kufi-side.jpg";
import niqabBlackFront from "@/assets/product-photos/niqab-black-front.jpg";
import niqabKhadijaBack from "@/assets/product-photos/niqab-khadija-back.jpg";
import niqabKhadijaClose from "@/assets/product-photos/niqab-khadija-close.jpg";
import niqabKhadijaFull from "@/assets/product-photos/niqab-khadija-full.jpg";
import niqabKhadijaSide from "@/assets/product-photos/niqab-khadija-side.jpg";
import niqabRedAngle from "@/assets/product-photos/niqab-red-angle.jpg";
import niqabRedFront from "@/assets/product-photos/niqab-red-front.jpg";
import shemaghBackCover from "@/assets/product-photos/shemagh-back-cover.jpg";
import shemaghIvorySideFront from "@/assets/product-photos/shemagh-ivory-side-front.jpg";
import shemaghManBack from "@/assets/product-photos/shemagh-man-back.jpg";
import shemaghProfile from "@/assets/product-photos/shemagh-profile.jpg";
import shemaghRearSide from "@/assets/product-photos/shemagh-rear-side.jpg";
import shemaghRedFront from "@/assets/product-photos/shemagh-red-front.jpg";
import shemaghRedFull from "@/assets/product-photos/shemagh-red-full.jpg";

export const Route = createFileRoute("/")({
  head: () => {
    const metadata = seo({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: "/" });
    return {
      ...metadata,
      links: [
        ...metadata.links,
        { rel: "preload", as: "image", href: heroShemaghFull, fetchPriority: "high" },
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
  tag?: "Bestseller" | "New" | "Limited";
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

const catalog: Product[] = [
  {
    slug: "yemeni-shemagh-red",
    name: "Yemeni Shemagh - Red & White",
    collection: "Shemaghs",
    audience: "Men",
    price: 2200,
    compareAt: 2800,
    rating: 0,
    reviews: 0,
    images: [shemaghRedFull, shemaghRedFront, shemaghManBack],
    short: "The heritage red-and-white keffiyeh, hand-loomed in Yemen.",
    tag: "Bestseller",
    imageClassName: "origin-bottom scale-[1.16] translate-y-[3%]",
  },
  {
    slug: "ivory-embroidered-shemagh",
    name: "Ivory Embroidered Shemagh",
    collection: "Shemaghs",
    audience: "Men",
    price: 2400,
    rating: 0,
    reviews: 0,
    images: [shemaghIvorySideFront, shemaghProfile, shemaghRearSide, shemaghBackCover],
    short: "Ivory shemagh with rose-red embroidered borders.",
    tag: "New",
    imageClassName: "origin-bottom scale-[1.18] translate-y-[4%]",
  },
  {
    slug: "khadija-niqab",
    name: "Khadija Niqab",
    collection: "Niqabs",
    audience: "Women",
    price: 650,
    rating: 0,
    reviews: 0,
    images: [
      niqabKhadijaFull,
      niqabKhadijaClose,
      niqabKhadijaSide,
      niqabKhadijaBack,
      niqabBlackFront,
    ],
    short: "Two-layer chiffon niqab with long draping veil.",
    tag: "Bestseller",
    imageClassName: "origin-bottom scale-[1.18] translate-y-[4%]",
  },
  {
    slug: "rouge-niqab",
    name: "Rouge Niqab",
    collection: "Niqabs",
    audience: "Women",
    price: 720,
    rating: 0,
    reviews: 0,
    images: [niqabRedFront, niqabRedAngle],
    short: "A quiet colour statement in premium chiffon.",
    tag: "New",
    imageClassName: "origin-bottom scale-[1.2] translate-y-[5%]",
  },
  {
    slug: "white-kufi",
    name: "White Woven Kufi",
    collection: "Kufis",
    audience: "Men",
    price: 450,
    rating: 0,
    reviews: 0,
    images: [kufiFront, kufiSide],
    short: "Breathable openwork kufi for daily wear.",
    imageClassName: "origin-bottom scale-[1.22] translate-y-[5%]",
  },
  {
    slug: "kashmir-multiflora-honey",
    name: "Kashmir Multi-Flora Honey 500g",
    collection: "Honey",
    audience: "Unisex",
    price: 850,
    rating: 0,
    reviews: 0,
    images: [honeyMulti],
    short: "Pure Kashmiri highland honey with a full floral finish.",
    tag: "Bestseller",
  },
  {
    slug: "kashmir-acacia-honey",
    name: "Kashmir Acacia Honey 500g",
    collection: "Honey",
    audience: "Unisex",
    price: 900,
    rating: 0,
    reviews: 0,
    images: [honeyAcacia],
    short: "Light, floral Kashmiri acacia. Slow to crystallise.",
    tag: "New",
  },
  {
    slug: "kashmir-black-honey",
    name: "Kashmir Wild Black Honey 500g",
    collection: "Honey",
    audience: "Unisex",
    price: 1200,
    rating: 0,
    reviews: 0,
    images: [honeyBlack],
    short: "Rare dark-forest honey - intense, minerally, wild.",
    tag: "Limited",
  },
];

const productShots: Array<{ label: string; image: string; imageClassName?: string }> = [
  { label: "Yemeni shemagh front", image: shemaghRedFull },
  { label: "Yemeni shemagh bust", image: shemaghRedFront },
  { label: "Ivory shemagh front", image: shemaghIvorySideFront },
  { label: "Ivory shemagh profile", image: shemaghProfile },
  { label: "Ivory shemagh rear", image: shemaghRearSide },
  { label: "Ivory shemagh back", image: shemaghBackCover },
  { label: "Shemagh worn back", image: shemaghManBack },
  { label: "Khadija niqab front", image: niqabKhadijaFull },
  { label: "Khadija niqab close", image: niqabKhadijaClose },
  { label: "Khadija niqab side", image: niqabKhadijaSide },
  { label: "Khadija niqab back", image: niqabKhadijaBack },
  { label: "Black niqab", image: niqabBlackFront },
  { label: "Rouge niqab front", image: niqabRedFront },
  { label: "Rouge niqab angle", image: niqabRedAngle },
  { label: "White kufi front", image: kufiFront },
  { label: "White kufi side", image: kufiSide },
  { label: "Multi-flora honey", image: honeyMulti },
  { label: "Acacia honey", image: honeyAcacia },
  { label: "Wild black honey", image: honeyBlack },
];

const collectionTiles = [
  {
    title: "Shemaghs",
    image: shemaghRedFull,
    count: "2 products",
    href: "/shop?collection=Shemaghs",
    imageClassName: "origin-bottom scale-[1.12] translate-y-[2%]",
  },
  {
    title: "Niqabs",
    image: niqabKhadijaFull,
    count: "2 products",
    href: "/shop?collection=Niqabs",
    imageClassName: "origin-bottom scale-[1.12] translate-y-[3%]",
  },
  {
    title: "Kufis",
    image: kufiFront,
    count: "1 product",
    href: "/shop?collection=Kufis",
    imageClassName: "origin-bottom scale-[1.12] translate-y-[3%]",
  },
  { title: "Honey", image: honeyMulti, count: "3 products", href: "/shop?collection=Honey" },
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

function IconButton({
  label,
  children,
  className = "",
  onClick,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center text-[#C85F22] transition-opacity hover:opacity-75 ${className}`}
    >
      {children}
    </button>
  );
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
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    items.forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${Math.min(index % 3, 2) * 24}ms`);
      observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);
}

function useHashScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sectionHashes = new Set(["#honey", "#watch-collection", "#essentials", "#bestsellers"]);

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

function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<"menu" | "cart" | null>(null);
  const [quantities, setQuantities] = useState([1, 1, 1]);
  const isScrolledRef = useRef(false);
  const cartItems = [catalog[0], catalog[2], catalog[5]];

  useEffect(() => {
    let frame = 0;

    const updateHeader = () => {
      frame = 0;
      const nextIsScrolled = window.scrollY > 12;
      if (nextIsScrolled === isScrolledRef.current) return;

      isScrolledRef.current = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
    };

    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateHeader);
    };

    updateHeader();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!openDrawer) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDrawer(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDrawer]);

  const updateQuantity = (index: number, change: number) => {
    setQuantities((current) =>
      current.map((quantity, itemIndex) =>
        itemIndex === index ? Math.max(1, quantity + change) : quantity,
      ),
    );
  };

  const subtotal = cartItems.reduce((total, product, index) => {
    const numericPrice = Number(product.price);
    return total + numericPrice * quantities[index];
  }, 0);

  const closeDrawer = () => setOpenDrawer(null);

  return (
    <>
      <header
        className={`site-header sticky top-0 z-50 bg-white ${isScrolled ? "is-scrolled" : ""}`}
      >
        <div className="site-header__inner relative mx-auto flex h-[65px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <IconButton label="Open menu" onClick={() => setOpenDrawer("menu")}>
            <MangoMenuIcon />
          </IconButton>

          <a
            href="/"
            className="absolute left-1/2 top-1/2 flex h-[42px] w-[100px] -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:h-[44px] sm:w-[105px]"
            aria-label="Fawzaan home"
          >
            <img
              src={STORE_LOGO_URL}
              alt="Fawzaan"
              className="site-header__logo h-full w-full object-contain"
            />
          </a>

          <IconButton label="Open cart" className="relative" onClick={() => setOpenDrawer("cart")}>
            <ShoppingBag size={24} strokeWidth={2} />
            <span className="brand-mango-bg absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold leading-none text-white">
              {quantities.reduce((total, quantity) => total + quantity, 0)}
            </span>
          </IconButton>
        </div>
      </header>

      <button
        type="button"
        aria-label="Close drawer"
        onClick={closeDrawer}
        className={`fixed inset-0 z-[60] bg-black/45 transition-opacity duration-300 ${openDrawer ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        aria-hidden={openDrawer !== "menu"}
        aria-label="Store menu"
        aria-modal={openDrawer === "menu"}
        inert={openDrawer !== "menu"}
        role="dialog"
        className={`store-drawer fixed inset-y-0 left-0 z-[70] flex w-[min(90vw,420px)] flex-col bg-white ${openDrawer === "menu" ? "is-open" : "-translate-x-full"}`}
      >
        <div className="flex h-[65px] items-center justify-between border-b border-black/10 px-6">
          <img src={STORE_LOGO_URL} alt="Fawzaan" className="h-9 w-auto object-contain" />
          <IconButton label="Close menu" onClick={closeDrawer}>
            <X size={23} />
          </IconButton>
        </div>
        <nav className="flex-1 overflow-y-auto px-6 py-8" aria-label="Main navigation">
          <form action="/shop" method="get" className="mb-7 border-b border-black/25">
            <label className="flex h-12 items-center gap-3">
              <Search size={18} className="shrink-0 text-black/55" />
              <input
                type="search"
                name="q"
                placeholder="Search products"
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
              />
              <button type="submit" className="text-[10px] font-bold uppercase">
                Search
              </button>
            </label>
          </form>
          <p className="section-kicker text-black/45">Shop</p>
          <ul className="mt-5 divide-y divide-black/10">
            {[
              ["Shop all", "#shop-all"],
              ["Shemaghs", "#shop-shemaghs"],
              ["Niqabs", "#shop-niqabs"],
              ["Kufis", "#shop-kufis"],
              ["Kashmir honey", "#honey"],
              ["SABR watches", "#watch-collection"],
            ].map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  onClick={closeDrawer}
                  className="store-index-link flex items-center justify-between py-4 text-[21px] uppercase leading-none"
                >
                  {label} <ChevronRight size={18} strokeWidth={1.7} />
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="brand-mango-bg px-6 py-5 text-[11px] font-bold uppercase text-black">
          Premium modest essentials
        </div>
      </aside>

      <aside
        aria-hidden={openDrawer !== "cart"}
        aria-label="Shopping cart"
        aria-modal={openDrawer === "cart"}
        inert={openDrawer !== "cart"}
        role="dialog"
        className={`store-drawer fixed inset-y-0 right-0 z-[70] flex w-[min(92vw,440px)] flex-col bg-white ${openDrawer === "cart" ? "is-open" : "translate-x-full"}`}
      >
        <div className="flex h-[65px] items-center justify-between border-b border-black/10 px-6">
          <div>
            <p className="text-[17px] font-bold uppercase">Your cart</p>
            <p className="text-[11px] text-black/50">
              {quantities.reduce((total, quantity) => total + quantity, 0)} items
            </p>
          </div>
          <IconButton label="Close cart" onClick={closeDrawer}>
            <X size={23} />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {cartItems.map((product, index) => (
            <div
              key={product.slug}
              className="grid grid-cols-[92px_1fr] gap-4 border-b border-black/10 py-5"
            >
              <div className="aspect-[3/4] overflow-hidden bg-[#f5f5f3]">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className={productImageClassName(product)}
                />
              </div>
              <div className="flex min-w-0 flex-col justify-between py-1">
                <div>
                  <p className="section-kicker text-black/45">{product.collection}</p>
                  <h3 className="product-name mt-1 text-[16px] leading-4">{product.name}</h3>
                  <p className="mt-2 text-[13px] font-semibold">{product.price}</p>
                </div>
                <div className="mt-4 flex w-fit items-center border border-black/15">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center"
                    aria-label={`Decrease ${product.name} quantity`}
                    onClick={() => updateQuantity(index, -1)}
                  >
                    <Minus size={13} />
                  </button>
                  <span className="grid h-8 min-w-8 place-items-center text-[12px]">
                    {quantities[index]}
                  </span>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center"
                    aria-label={`Increase ${product.name} quantity`}
                    onClick={() => updateQuantity(index, 1)}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-black/10 bg-white p-5">
          <div className="flex items-center justify-between text-[14px] font-bold uppercase">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          <p className="mt-2 text-[11px] text-black/50">Shipping calculated at checkout.</p>
          <button
            type="button"
            className="brand-mango-bg mt-5 h-12 w-full text-[11px] font-bold uppercase text-black"
          >
            Checkout
          </button>
          <button
            type="button"
            className="mt-2 h-11 w-full border border-black text-[11px] font-bold uppercase text-black"
          >
            View cart
          </button>
        </div>
      </aside>
    </>
  );
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
                  <h3 className="banner-heading mt-3 text-[42px] md:text-[50px]">{banner.title}</h3>
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
  const discount = product.compareAt ? "21% off" : product.tag;
  const { formatPrice } = useCurrency();
  const price = formatPrice(product.price);
  const compareAt = product.compareAt ? formatPrice(product.compareAt) : undefined;

  return (
    <a
      href={`/products/${product.slug}`}
      className="product-card group block min-w-0"
      aria-label={`${product.name}, ${price}`}
      data-reveal={reveal ? "" : undefined}
    >
      <div className="product-card__media relative aspect-[3/4] overflow-hidden bg-white">
        <img
          src={product.images[0]}
          alt={product.name}
          loading={priority ? "eager" : "lazy"}
          className={`${productImageClassName(product)} transition-opacity duration-300 ${
            product.images[1] ? "group-hover:opacity-0" : ""
          }`}
        />
        {product.images[1] ? (
          <img
            src={product.images[1]}
            alt=""
            aria-hidden
            loading="lazy"
            className={`absolute inset-0 ${productImageClassName(product)} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
          />
        ) : null}
        {discount ? (
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
      <div className="mt-3 text-left">
        <p className="section-kicker text-black/45">{product.collection}</p>
        <h3 className="product-name mt-1 min-h-8 text-[15px] leading-4 text-current md:text-[16px]">
          {product.name}
        </h3>
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
            <p className="text-[12px] leading-tight text-current/40 line-through">{compareAt}</p>
          ) : null}
        </div>
      </div>
    </a>
  );
}

function BestSellers() {
  const { products: catalog } = useStoreProducts();
  const featuredSlugs = [
    "yemeni-shemagh",
    "khadija-niqab",
    "white-kufi",
    "kashmir-multiflora-honey",
  ];
  const featuredProducts = featuredSlugs
    .map((slug) => catalog.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product));

  return (
    <section id="bestsellers" className="bg-white px-[22px] py-18 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <div className="flex items-end justify-between gap-6" data-reveal>
          <div>
            <p className="section-kicker text-black/50">A considered edit</p>
            <h2 className="section-heading mt-2 text-[34px] text-black md:text-[52px]">
              FEATURED PICKS
            </h2>
          </div>
          <a
            href="#shop-all"
            className="text-[11px] font-bold uppercase tracking-normal underline underline-offset-4"
          >
            Shop all
          </a>
        </div>

        <div className="no-scrollbar -mx-[22px] mt-9 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[22px] pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0">
          {featuredProducts.map((product, index) => (
            <div
              key={product.slug}
              className="w-[72vw] max-w-[290px] shrink-0 snap-start md:w-auto md:max-w-none"
            >
              <ProductTile product={product} priority={index < 2} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PostShopClose() {
  const assurances = [
    {
      title: "Considered quality",
      copy: "Every item is reviewed before it joins the Fawzaan collection.",
      icon: BadgeCheck,
    },
    {
      title: "Direct support",
      copy: "Real help with products and orders through WhatsApp.",
      icon: MessageCircle,
    },
    {
      title: "Secure checkout",
      copy: "Protected payments with clear order confirmation.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="our-story" className="border-t border-black/10 bg-white">
      <div className="mx-auto max-w-[1180px] px-[22px] py-14 md:px-8 md:py-24">
        <div className="grid overflow-hidden bg-[#f3f3f1] md:grid-cols-[1.08fr_0.92fr]">
          <div className="relative aspect-[5/4] min-h-0 overflow-hidden md:aspect-auto md:min-h-[600px]">
            <img
              src={shemaghManBack}
              alt="White shemagh with detailed red embroidery"
              loading="lazy"
              className="h-full w-full object-cover object-[center_38%]"
            />
          </div>
          <div className="flex items-center px-6 py-10 sm:px-10 md:px-12 md:py-16 lg:px-16">
            <div className="max-w-[430px]" data-reveal>
              <p className="section-kicker text-[#C85F22]">Fawzaan Store</p>
              <h2 className="section-heading mt-4 text-[36px] leading-[1.02] text-black md:text-[50px]">
                MODEST ESSENTIALS, CHOSEN WITH PURPOSE
              </h2>
              <p className="commerce-copy mt-6 max-w-[390px] text-[15px] leading-7 text-black/62">
                A focused collection of everyday pieces shaped by faith, heritage, and practical
                wear. No endless catalogue, just useful products selected with care.
              </p>
              <a
                href="/about"
                className="mt-8 inline-flex h-12 items-center gap-2 bg-black px-6 text-[11px] font-bold uppercase text-white transition-colors duration-300 hover:bg-[#D9643C]"
              >
                Our story <ChevronRight size={15} />
              </a>
            </div>
          </div>
        </div>

        <div className="grid border-x border-b border-black/10 sm:grid-cols-3">
          {assurances.map((assurance, index) => {
            const Icon = assurance.icon;
            return (
              <div
                key={assurance.title}
                className={`flex gap-4 px-5 py-7 md:px-7 md:py-8 ${
                  index ? "border-t border-black/10 sm:border-l sm:border-t-0" : ""
                }`}
                data-reveal
              >
                <Icon className="mt-0.5 shrink-0 text-[#D9643C]" size={21} strokeWidth={1.7} />
                <div>
                  <h3 className="text-[13px] font-bold uppercase text-black">{assurance.title}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-black/55">{assurance.copy}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Collections() {
  return (
    <section id="collections" className="bg-white py-12 md:py-20">
      <div className="mx-auto max-w-[1180px] px-[22px]">
        <div className="flex items-end justify-between gap-4" data-reveal>
          <SectionTitle title="Shop by collection" eyebrow="Find your edit" align="left" />
          <a
            href="#shop-all"
            className="text-[11px] font-bold uppercase tracking-normal underline underline-offset-4"
          >
            Shop all
          </a>
        </div>
        <div className="no-scrollbar -mx-[22px] mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[22px] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {collectionTiles.map((tile) => (
            <a
              key={tile.title}
              href={tile.href}
              className="product-card group block w-[68vw] max-w-[270px] shrink-0 snap-start md:w-auto md:max-w-none"
              data-reveal
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#f5f5f3]">
                <img
                  src={tile.image}
                  alt={tile.title}
                  loading="lazy"
                  className={`h-full w-full object-cover transition-transform duration-500 ${tile.imageClassName ?? "group-hover:scale-[1.02]"}`}
                />
                <span
                  className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center bg-white text-black"
                  aria-hidden
                >
                  <ChevronRight size={17} />
                </span>
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-normal text-black/50">
                {tile.count}
              </p>
              <h3 className="mt-1 text-[18px] font-extrabold uppercase leading-none md:text-[20px]">
                {tile.title}
              </h3>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function KufiCollection() {
  const { products: catalog } = useStoreProducts();
  const kufi = catalog.find((product) => product.collection === "Kufis");
  if (!kufi) return null;

  return (
    <section
      id="kufi-collection"
      className="brand-mango-bg scroll-mt-[76px] px-[18px] py-12 md:px-8 md:py-20"
    >
      <div className="mx-auto grid max-w-[1120px] gap-4 md:grid-cols-[1.18fr_0.82fr] md:gap-5">
        <a
          href="/shop?collection=Kufis"
          className="collection-banner relative block min-h-[520px] overflow-hidden bg-white md:min-h-[680px]"
          data-reveal
        >
          <img
            src={kufiSide}
            alt="White woven kufi on mannequin"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-[center_28%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-9">
            <p className="section-kicker text-white/70">Daily prayerwear</p>
            <h2 className="banner-heading mt-3 text-[46px] md:text-[68px]">WOVEN KUFIS</h2>
            <p className="commerce-copy mt-3 max-w-xs text-white/78">
              Breathable openwork. Clean white finish.
            </p>
          </div>
        </a>

        <div className="bg-white p-3 md:flex md:items-center md:p-5">
          <div className="w-full">
            <ProductTile product={kufi} />
            <a
              href="/shop?collection=Kufis"
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 bg-black text-[11px] font-bold uppercase text-white"
            >
              Shop kufis <ChevronRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </section>
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
                  className={`shop-collection-tab relative flex h-9 shrink-0 snap-start items-center text-[11px] font-bold uppercase ${activeCollection === item.slug ? "text-black" : "text-black/40"}`}
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
            className="flex items-center gap-1 font-bold text-[#C85F22]"
          >
            {selectedCollection?.name || "All products"}
            <ChevronRight size={15} />
          </a>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-11 md:grid-cols-4 md:gap-x-4 md:gap-y-14">
          {visibleProducts.map((product) => (
            <ProductTile key={product.slug} product={product} reveal={false} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AudienceEdit({
  id,
  eyebrow,
  title,
  copy,
  products,
  dark = false,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  copy: string;
  products: Product[];
  dark?: boolean;
}) {
  return (
    <section id={id} className={dark ? "bg-[#0d0d0d] text-white" : "bg-[#f8f4eb] text-black"}>
      <div className="mx-auto grid max-w-[1180px] gap-10 px-[22px] py-16 md:grid-cols-[0.8fr_1.2fr] md:px-8 md:py-24">
        <div className="self-center" data-reveal>
          <p className={`section-kicker ${dark ? "text-white/60" : "text-black/55"}`}>{eyebrow}</p>
          <h2 className="section-heading mt-4 text-[38px] md:text-[56px]">{title}</h2>
          <p className={`commerce-copy mt-4 max-w-xs ${dark ? "text-white/70" : "text-black/62"}`}>
            {copy}
          </p>
          <a
            href="#catalog"
            className={`mt-7 inline-flex h-11 items-center gap-2 px-5 text-[11px] font-bold uppercase tracking-normal transition-opacity hover:opacity-85 ${dark ? "bg-white text-black" : "bg-black text-white"}`}
          >
            Shop the edit <ChevronRight size={15} strokeWidth={2} />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-9 md:gap-x-4">
          {products.map((product) => (
            <ProductTile key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FullCatalog() {
  const { products: catalog } = useStoreProducts();
  return (
    <section className="bg-white px-[22px] py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1180px]">
        <div data-reveal>
          <SectionTitle title="The full shop" eyebrow="All products from the catalog" />
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-1 gap-y-12 md:grid-cols-4 md:gap-x-4 md:gap-y-16">
          {catalog.map((product) => (
            <ProductTile key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductImageLibrary() {
  return (
    <section className="bg-[#f8f4eb] py-14 md:py-20">
      <div className="mx-auto max-w-[1180px] px-[22px] md:px-8" data-reveal>
        <SectionTitle title="Every angle matters" eyebrow="All product images added" align="left" />
      </div>
      <div className="no-scrollbar mt-8 flex snap-x gap-3 overflow-x-auto px-[22px] md:px-8">
        {productShots.map((shot, index) => (
          <figure
            key={`${shot.label}-${index}`}
            className="product-card w-[46vw] shrink-0 snap-start md:w-[220px]"
            data-reveal
          >
            <div className="aspect-[4/5] overflow-hidden border border-black/[0.06] bg-[#f4f1eb]">
              <img
                src={shot.image}
                alt={shot.label}
                loading="lazy"
                className={`h-full w-full object-cover ${shot.imageClassName ?? ""}`}
              />
            </div>
            <figcaption className="mt-2 text-[11px] font-semibold uppercase leading-tight tracking-normal text-black/65">
              {shot.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-[6px] border-[#F18532] bg-black px-[22px] pb-7 pt-12 text-white md:px-8 md:pt-16">
      <div className="mx-auto grid max-w-[1120px] gap-11 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:gap-16">
        <div>
          <img src={STORE_LOGO_URL} alt="Fawzaan" className="h-14 w-auto object-contain" />
          <p className="mt-5 max-w-sm text-[13px] leading-5 text-white/60">
            Premium modest essentials: shemaghs, niqabs, kufis, and raw Kashmir honey.
          </p>
        </div>
        <div>
          <h3 className="brand-mango-text text-[11px] font-bold uppercase">Shop</h3>
          <ul className="mt-5 space-y-3 text-[13px] text-white/65">
            <li>
              <a className="transition-colors hover:text-white" href="#shop-all">
                Shop all
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" href="#shop-shemaghs">
                Shemaghs
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" href="#shop-niqabs">
                Niqabs
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" href="#shop-kufis">
                Kufis
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" href="#honey">
                Honey
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="brand-mango-text text-[11px] font-bold uppercase">Support</h3>
          <ul className="mt-5 space-y-3 text-[13px] text-white/65">
            <li>
              <a className="transition-colors hover:text-white" href="#">
                Shipping
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" href="#">
                Returns
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" href="#">
                Contact
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" href="#">
                Privacy
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1120px] flex-col gap-2 border-t border-white/15 pt-6 text-[10px] uppercase text-white/40 md:flex-row md:items-center md:justify-between">
        <p>© 2026 Fawzaan Store. All rights reserved.</p>
      </div>
    </footer>
  );
}

function Index() {
  useScrollReveal();
  useHashScroll();
  const { homepage } = useCatalogPresentation();

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
}: {
  homepage?: HomepageData | null;
  editMode?: boolean;
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
      {customSections?.content.length ? (
        <HomepageRenderer data={customSections} editMode={editMode} />
      ) : null}
      <ManagedCollectionSections />
      <ManagedHomepageBanners />
      <ExploreBeyond />
      <PostShopClose />
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
