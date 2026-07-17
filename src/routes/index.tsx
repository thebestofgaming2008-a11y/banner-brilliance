import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Menu, Minus, Plus, Search, ShoppingBag, Star, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { StoreFooter, StoreHeader } from "@/components/store/store-chrome";
import { merchandiseProducts, type StoreProduct, useStoreProducts } from "@/data/store";
import { useCurrency } from "@/hooks/use-currency";
import { useCatalogPresentation } from "@/services/catalogPresentation";

import logoGold from "@/assets/fawzaan-logo-gold.png";
import makkahGloves from "@/assets/collection-banners/makkah-gloves.jpg";
import sabrWatchBlack from "@/assets/collection-banners/sabr-watch-black.jpg";
import heroBg from "@/assets/figma-hero-bg.png";
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
  component: Index,
});

type Banner = {
  title: string;
  product: string;
  productAlt: string;
  titleX: number;
  titleY: number;
  titleW: number;
  href: string;
};

type Product = StoreProduct & {
  audience?: "Men" | "Women" | "Unisex";
  short?: string;
};

type CollectionName = Product["collection"];

const FRAME_W = 390;
const FRAME_H = 649;

const banners: Banner[] = [
  {
    title: "AL-IKHWAAN SET",
    product: heroShemaghFull,
    productAlt: "Red and white shemagh set",
    titleX: 37,
    titleY: 121,
    titleW: 316,
    href: "/shop?collection=Shemaghs",
  },
  {
    title: "AS-SALIHAAT SET",
    product: heroNiqabFull,
    productAlt: "Black niqab set",
    titleX: 41,
    titleY: 100,
    titleW: 319,
    href: "/shop?collection=Niqabs",
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
    rating: 4.9,
    reviews: 1240,
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
    rating: 4.8,
    reviews: 312,
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
    rating: 4.9,
    reviews: 986,
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
    rating: 4.8,
    reviews: 214,
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
    rating: 4.7,
    reviews: 148,
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
    rating: 4.9,
    reviews: 621,
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
    rating: 4.8,
    reviews: 187,
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
    rating: 4.9,
    reviews: 92,
    images: [honeyBlack],
    short: "Rare dark-forest honey - intense, minerally, wild.",
    tag: "Limited",
  },
];

const productShots = [
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
    title: "MAKKAH GLOVES",
    eyebrow: "Coming next",
    copy: "Gold artwork cases in staple colours.",
    image: makkahGloves,
    href: "/shop?collection=Gloves",
  },
  {
    title: "KASHMIR HONEY",
    eyebrow: "Harvest edit",
    copy: "Raw floral honey from Kashmir.",
    image: honeyMulti,
    href: "/shop?collection=Honey",
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
      className={`grid h-6 w-6 place-items-center text-[#f4b400] transition-opacity hover:opacity-70 ${className}`}
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
    const numericPrice = Number(product.price.replace(/[^0-9]/g, ""));
    return total + numericPrice * quantities[index];
  }, 0);

  const closeDrawer = () => setOpenDrawer(null);

  return (
    <>
      <header
        className={`site-header sticky top-0 z-50 bg-white ${isScrolled ? "is-scrolled" : ""}`}
      >
        <div className="site-header__inner relative mx-auto flex h-[65px] w-full max-w-[1440px] items-center justify-between px-8">
          <IconButton label="Open menu" onClick={() => setOpenDrawer("menu")}>
            <Menu size={24} strokeWidth={2.2} />
          </IconButton>

          <a
            href="/"
            className="absolute left-1/2 top-1/2 flex h-[37px] w-[83px] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            aria-label="Fawzaan home"
          >
            <img
              src={logoGold}
              alt="Fawzaan"
              className="site-header__logo h-full w-full object-contain"
            />
          </a>

          <IconButton label="Open cart" className="relative" onClick={() => setOpenDrawer("cart")}>
            <ShoppingBag size={24} strokeWidth={2} />
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#f4b400] text-[10px] font-bold leading-none text-white">
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
          <img src={logoGold} alt="Fawzaan" className="h-9 w-auto object-contain" />
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
                  className="flex items-center justify-between py-4 text-[21px] font-bold uppercase leading-none"
                >
                  {label} <ChevronRight size={18} strokeWidth={1.7} />
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="bg-[#f4b400] px-6 py-5 text-[11px] font-bold uppercase text-black">
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
                  <h3 className="mt-1 text-[14px] font-semibold leading-4">{product.name}</h3>
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
            className="mt-5 h-12 w-full bg-[#f4b400] text-[11px] font-bold uppercase text-black"
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

function HeroBanner({ banner, isPriority }: { banner: Banner; isPriority?: boolean }) {
  return (
    <article
      className="relative shrink-0 overflow-hidden bg-[#f5b90a]"
      style={{
        width: `${100 / banners.length}%`,
        height: `clamp(560px, ${(FRAME_H / FRAME_W) * 100}vw, 820px)`,
      }}
    >
      <img
        src={heroBg}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <a
        href={banner.href}
        aria-label={`Shop ${banner.title}`}
        className="absolute inset-0 z-[15]"
      />

      <div
        className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 overflow-hidden"
        style={{
          aspectRatio: `${FRAME_W} / ${FRAME_H}`,
          containerType: "inline-size",
        }}
      >
        <img
          src={banner.product}
          alt={banner.productAlt}
          loading="eager"
          fetchPriority={isPriority ? "high" : "auto"}
          decoding="async"
          className="absolute inset-x-0 bottom-0 z-10 mx-auto h-auto w-full"
        />
        <h1
          className="absolute z-20 m-0 text-center font-serif-display font-normal text-white"
          style={{
            left: `${(banner.titleX / FRAME_W) * 100}%`,
            top: `${(banner.titleY / FRAME_H) * 100}%`,
            width: `${(banner.titleW / FRAME_W) * 100}%`,
            fontSize: `${(52 / FRAME_W) * 100}cqw`,
            lineHeight: 1,
            letterSpacing: "0",
            whiteSpace: "nowrap",
          }}
        >
          {banner.title}
        </h1>
        <span
          className="pointer-events-none absolute z-20 text-[12px] font-semibold uppercase leading-none tracking-normal text-white underline underline-offset-4"
          style={{
            left: `${(25 / FRAME_W) * 100}%`,
            top: `${(614 / FRAME_H) * 100}%`,
          }}
        >
          Shop the collection
        </span>
      </div>
    </article>
  );
}

function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: number | undefined;

    const stopTimer = () => {
      if (timer) window.clearInterval(timer);
      timer = undefined;
    };

    const startTimer = () => {
      stopTimer();
      if (document.hidden) return;

      timer = window.setInterval(() => {
        setActive((current) => (current + 1) % banners.length);
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
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#f5b90a]" aria-label="Featured collections">
      <div
        className="hero-track flex"
        style={{
          width: `${banners.length * 100}%`,
          transform: `translate3d(-${active * (100 / banners.length)}%, 0, 0)`,
        }}
      >
        {banners.map((banner, index) => (
          <HeroBanner key={banner.title} banner={banner} isPriority={index === 0} />
        ))}
      </div>
      <div className="absolute bottom-4 right-5 z-30 flex gap-2" aria-label="Choose hero slide">
        {banners.map((banner, index) => (
          <button
            type="button"
            key={banner.title}
            aria-label={`Show ${banner.title}`}
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
    <section id="catalog" className="bg-white px-[18px] py-10 md:px-8 md:py-18">
      <div className="mx-auto max-w-[1120px]">
        <div className="mx-auto max-w-[640px] text-center" data-reveal>
          <p className="section-kicker text-black/50">Shop more collections</p>
          <h2 className="section-heading mt-2 text-[34px] text-black md:text-[52px]">
            EXPLORE EDITS
          </h2>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:mt-12 md:gap-6">
          {collectionBanners.map((banner, index) => (
            <a
              key={banner.title}
              href={banner.href}
              className="collection-banner group relative block min-h-[520px] overflow-hidden bg-black text-white md:min-h-[560px]"
              data-reveal
            >
              <img
                src={banner.image}
                alt=""
                aria-hidden
                loading={index === 0 ? "eager" : "lazy"}
                className={`absolute inset-0 h-full w-full object-cover ${
                  banner.title === "MAKKAH GLOVES" ? "object-center" : "object-center"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/18 to-black/5 md:bg-gradient-to-r md:from-black/68 md:via-black/20 md:to-transparent" />
              <div className="relative z-10 flex min-h-[520px] items-end p-6 md:min-h-[560px] md:items-center md:p-10">
                <div className="max-w-[420px]">
                  <p className="section-kicker text-white/72">{banner.eyebrow}</p>
                  <h3 className="banner-heading mt-3 text-[44px] md:text-[68px]">{banner.title}</h3>
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
        <h3 className="mt-1 min-h-8 text-[13px] font-semibold leading-4 text-current md:text-[14px]">
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
  const bestSellers = featuredSlugs
    .map((slug) => catalog.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product));

  return (
    <section id="bestsellers" className="bg-white px-[22px] py-18 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <div className="flex items-end justify-between gap-6" data-reveal>
          <div>
            <p className="section-kicker text-black/50">Our best sellers</p>
            <h2 className="section-heading mt-2 text-[34px] text-black md:text-[52px]">
              BEST SELLERS
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
          {bestSellers.map((product, index) => (
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

function ModestEssentials() {
  const edits = [
    {
      title: "FOR THE BROTHERS",
      eyebrow: "Shemaghs and kufis",
      copy: "Shemaghs, kufis, and daily embroidered staples.",
      image: shemaghManBack,
      href: "/shop?collection=Shemaghs",
    },
    {
      title: "FOR THE SISTERS",
      eyebrow: "Niqab essentials",
      copy: "Soft chiffon, clean drape, everyday coverage.",
      image: niqabKhadijaFull,
      href: "/shop?collection=Niqabs",
    },
  ];

  return (
    <section id="essentials" className="scroll-mt-[76px] bg-white px-[18px] py-14 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <div className="mx-auto max-w-[650px] text-center" data-reveal>
          <p className="section-kicker text-black/50">Fawzaan essentials</p>
          <h2 className="section-heading mt-2 text-[34px] text-black md:text-[52px]">
            DAILY ESSENTIALS
          </h2>
        </div>

        <div className="mt-9 grid gap-4 md:mt-12 md:grid-cols-2 md:gap-5">
          {edits.map((edit) => (
            <a
              key={edit.title}
              href={edit.href}
              className="collection-banner group relative min-h-[520px] overflow-hidden bg-black text-white md:min-h-[650px]"
              data-reveal
            >
              <img
                src={edit.image}
                alt=""
                aria-hidden
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <p className="section-kicker text-white/72">{edit.eyebrow}</p>
                <h3 className="banner-heading mt-3 text-[42px] md:text-[62px]">{edit.title}</h3>
                <p className="commerce-copy mt-4 max-w-[280px] text-white/76">{edit.copy}</p>
                <span className="mt-7 inline-flex h-11 items-center bg-white px-5 text-[10px] font-bold uppercase tracking-normal text-black">
                  Shop edit
                </span>
              </div>
            </a>
          ))}
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
      className="scroll-mt-[76px] bg-[#f4b400] px-[18px] py-12 md:px-8 md:py-20"
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
  const filters: Array<"All" | CollectionName> = [
    "All",
    "Shemaghs",
    "Niqabs",
    "Kufis",
    "Honey",
    "Watches",
  ];
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
  const visibleProducts =
    activeFilter === "All"
      ? merchandiseProducts(catalog)
      : catalog.filter((product) => product.collection === activeFilter);

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

      setActiveFilter(nextFilter);
      window.requestAnimationFrame(() =>
        document.getElementById("shop-all")?.scrollIntoView({ behavior: "smooth" }),
      );
    };

    applyHashFilter();
    window.addEventListener("hashchange", applyHashFilter);
    return () => window.removeEventListener("hashchange", applyHashFilter);
  }, []);

  return (
    <section id="shop-all" className="scroll-mt-[76px] bg-white px-[22px] py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-end justify-between gap-6" data-reveal>
          <div>
            <p className="section-kicker text-black/50">Browse the store</p>
            <h2 className="section-heading mt-2 text-[34px] text-black md:text-[52px]">SHOP ALL</h2>
          </div>
          <p className="hidden text-[12px] text-black/50 md:block">
            {visibleProducts.length} products
          </p>
        </div>

        <div
          className="no-scrollbar -mx-[22px] mt-7 flex gap-6 overflow-x-auto border-b border-black/10 px-[22px] md:mx-0 md:px-0"
          role="tablist"
          aria-label="Filter products"
        >
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
              className={`relative shrink-0 pb-3 text-[11px] font-bold uppercase transition-colors ${activeFilter === filter ? "text-black" : "text-black/40"}`}
            >
              {filter}
              {activeFilter === filter ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f4b400]" />
              ) : null}
            </button>
          ))}
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

function HoneyFeature() {
  const { products: catalog } = useStoreProducts();
  const honeyProducts = catalog.filter((product) => product.collection === "Honey");

  return (
    <section id="honey" className="scroll-mt-[76px] bg-white px-[22px] py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1180px]">
        <a
          href="/shop?collection=Honey"
          className="collection-banner relative block min-h-[420px] overflow-hidden bg-black text-white md:min-h-[520px]"
          data-reveal
        >
          <div className="absolute inset-0">
            <img
              src={honeyMulti}
              alt=""
              aria-hidden
              loading="lazy"
              className="h-full w-full object-cover md:object-[center_42%]"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-9">
            <p className="section-kicker text-white/72">The harvest</p>
            <h2 className="banner-heading mt-2 text-[38px] md:text-[62px]">KASHMIR HONEY</h2>
            <p className="commerce-copy mt-4 max-w-xs text-white/74">
              Raw floral honey, selected by origin.
            </p>
          </div>
        </a>

        <div className="mt-10 grid min-h-[360px] grid-cols-2 gap-x-2 gap-y-10 md:grid-cols-3 md:gap-x-4">
          {honeyProducts.map((product) => (
            <ProductTile key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WatchCollection() {
  const { products: catalog } = useStoreProducts();
  const { formatPrice } = useCurrency();
  const watchOrder = [
    "sabr-watch-green",
    "sabr-watch-blue",
    "sabr-watch-black",
    "sabr-watch-white",
  ];
  const watches = watchOrder
    .map((slug) => catalog.find((product) => product.slug === slug))
    .filter((product): product is Product => Boolean(product));

  return (
    <section
      id="watch-collection"
      className="scroll-mt-[76px] bg-white px-[18px] py-12 md:px-8 md:py-20"
    >
      <div className="mx-auto grid max-w-[1120px] gap-5 md:grid-cols-[0.9fr_1.1fr]">
        <a
          href="/shop?collection=Watches"
          className="collection-banner relative block min-h-[540px] overflow-hidden bg-black text-white md:min-h-[720px]"
          data-reveal
        >
          <img
            src={sabrWatchBlack}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <p className="section-kicker text-white/70">Arabic dial watches</p>
            <h2 className="banner-heading mt-3 text-[48px] md:text-[72px]">SABR WATCHES</h2>
            <p className="commerce-copy mt-4 max-w-xs text-white/74">
              Arabic numerals, brushed steel, clean daily polish.
            </p>
          </div>
        </a>

        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {watches.map((watch) => (
            <a
              key={watch.slug}
              href={`/products/${watch.slug}`}
              className="product-card group block border border-black/[0.07] bg-white p-2 md:p-3"
              data-reveal
            >
              <div className="product-card__media aspect-[4/5] overflow-hidden bg-[#f4f1eb]">
                <img
                  src={watch.images[0]}
                  alt={watch.name.replace(" Watch", "")}
                  loading="lazy"
                  className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.018]"
                />
              </div>
              <div className="pb-2 pt-3 text-center">
                <p className="section-kicker text-black/45">SABR</p>
                <h3 className="mt-1 text-[13px] leading-tight text-black md:text-[14px]">
                  {watch.name.replace(" Watch", "")}
                </h3>
                <p className="mt-1 text-[12px] leading-tight text-black/55">
                  {formatPrice(watch.price)}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-[6px] border-[#f4b400] bg-black px-[22px] pb-7 pt-12 text-white md:px-8 md:pt-16">
      <div className="mx-auto grid max-w-[1120px] gap-11 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:gap-16">
        <div>
          <img src={logoGold} alt="Fawzaan" className="h-14 w-auto object-contain" />
          <p className="mt-5 max-w-sm text-[13px] leading-5 text-white/60">
            Premium modest essentials: shemaghs, niqabs, kufis, and raw Kashmir honey.
          </p>
        </div>
        <div>
          <h3 className="text-[11px] font-bold uppercase text-[#f4b400]">Shop</h3>
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
          <h3 className="text-[11px] font-bold uppercase text-[#f4b400]">Support</h3>
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
        <p>© 2026 Fawzaan. All rights reserved.</p>
      </div>
    </footer>
  );
}

function Index() {
  useScrollReveal();
  useHashScroll();

  return (
    <main className="min-h-screen bg-white font-sans-ui text-black antialiased">
      <StoreHeader />
      <HeroSlider />
      <CollectionBanners />
      <ShopAllProducts />
      <ModestEssentials />
      <WatchCollection />
      <HoneyFeature />
      <ManagedHomepageBanners />
      <StoreFooter />
    </main>
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
          className="relative mx-auto min-h-[440px] max-w-[1180px] overflow-hidden bg-black text-white md:min-h-[560px]"
          data-store-reveal
        >
          <img
            src={banner.image_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative flex min-h-[440px] items-end p-7 md:min-h-[560px] md:p-12">
            <div className="max-w-lg">
              {banner.eyebrow ? (
                <p className="section-kicker text-white/65">{banner.eyebrow}</p>
              ) : null}
              <h2 className="banner-heading mt-3 text-[42px] leading-none md:text-[68px]">
                {banner.title}
              </h2>
              {banner.body ? (
                <p className="mt-4 max-w-md text-[14px] leading-6 text-white/75">{banner.body}</p>
              ) : null}
              {banner.button_label && banner.button_url ? (
                <a
                  href={banner.button_url}
                  className="mt-6 inline-flex h-11 items-center bg-white px-6 text-[11px] font-bold uppercase text-black"
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
