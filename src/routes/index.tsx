import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import logoAsset from "@/assets/fawzaan-logo.png.asset.json";
import bannerBrothers from "@/assets/banner-brothers.jpg.asset.json";
import bannerNisaa from "@/assets/banner-nisaa.jpg.asset.json";
import heroShemagh from "@/assets/hero-shemagh-editorial.jpg.asset.json";
import heroNiqab from "@/assets/hero-niqab.jpg.asset.json";
import heroHoney from "@/assets/hero-honey.jpg.asset.json";
import heroKufi from "@/assets/hero-kufi.jpg.asset.json";
import shemaghFront from "@/assets/shemagh-red-front.jpg.asset.json";
import shemaghSide from "@/assets/shemagh-red-side.jpg.asset.json";
import shemaghHead from "@/assets/shemagh-red-head.jpg.asset.json";
import shemaghBack from "@/assets/shemagh-red-back.jpg.asset.json";
import shemaghFlat from "@/assets/shemagh-red-flat.jpg.asset.json";
import shemaghWrap from "@/assets/shemagh-red-wrap.jpg.asset.json";
import niqabBlack from "@/assets/niqab-black-front.jpg.asset.json";
import niqabRedFront from "@/assets/niqab-red-front.jpg.asset.json";
import niqabRedSide from "@/assets/niqab-red-side.jpg.asset.json";
import niqabK1 from "@/assets/niqab-khadija-1.jpg.asset.json";
import niqabK2 from "@/assets/niqab-khadija-2.jpg.asset.json";
import niqabK3 from "@/assets/niqab-khadija-3.jpg.asset.json";
import niqabK4 from "@/assets/niqab-khadija-4.jpg.asset.json";
import niqabGrid from "@/assets/niqab-khadija-grid.jpg.asset.json";
import kufiFront from "@/assets/kufi-white-front.jpg.asset.json";
import kufiSide from "@/assets/kufi-white-side.jpg.asset.json";
import honeyAcacia from "@/assets/honey-kashmir-acacia.jpg.asset.json";
import honeyBlack from "@/assets/honey-kashmir-black.jpg.asset.json";
import honeyMulti from "@/assets/honey-kashmir-multiflora.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fawzaan — Heritage Shemaghs, Niqabs & Kashmir Honey" },
      { name: "description", content: "Hand-loomed shemaghs, chiffon niqabs, and raw Kashmir honey. Heritage essentials, quietly refined." },
      { property: "og:title", content: "Fawzaan — Heritage Essentials" },
      { property: "og:description", content: "Hand-loomed shemaghs, chiffon niqabs, and raw Kashmir honey." },
      { property: "og:image", content: heroShemagh.url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

/* ---------------------------------------------------------------- */
/* Data                                                             */
/* ---------------------------------------------------------------- */

type Product = { name: string; price: string; image: string; hover?: string; tag?: string };

const bestSellers: Product[] = [
  { name: "Yemeni Shemagh — Crimson", price: "$48", image: shemaghFront.url, hover: shemaghSide.url, tag: "Bestseller" },
  { name: "Khadijah Niqab — Onyx", price: "$36", image: niqabBlack.url, hover: niqabK2.url },
  { name: "Khadijah Niqab — Crimson", price: "$36", image: niqabRedFront.url, hover: niqabRedSide.url, tag: "New" },
  { name: "Cotton Kufi — Ivory", price: "$22", image: kufiFront.url, hover: kufiSide.url },
];

const editorial: Product[] = [
  { name: "Shemagh — Head Wrap", price: "$48", image: shemaghHead.url, hover: shemaghWrap.url },
  { name: "Shemagh — Flat Weave", price: "$48", image: shemaghFlat.url, hover: shemaghBack.url },
  { name: "Khadijah — Editorial 01", price: "$36", image: niqabK1.url, hover: niqabK3.url },
  { name: "Khadijah — Editorial 02", price: "$36", image: niqabK4.url, hover: niqabGrid.url },
];

const honeyLine: Product[] = [
  { name: "Kashmir Acacia — 500g", price: "$34", image: honeyAcacia.url },
  { name: "Kashmir Blackseed — 500g", price: "$42", image: honeyBlack.url, tag: "Rare" },
  { name: "Kashmir Multiflora — 500g", price: "$28", image: honeyMulti.url },
];

const collections = [
  { name: "Shemaghs", image: heroShemagh.url },
  { name: "Niqabs", image: heroNiqab.url },
  { name: "Kufis", image: heroKufi.url },
  { name: "Honey", image: heroHoney.url },
];

/* ---------------------------------------------------------------- */
/* Chrome                                                           */
/* ---------------------------------------------------------------- */

function Announcement() {
  return (
    <div className="bg-black text-white text-[10px] md:text-[11px] tracking-[0.25em] uppercase py-2.5 text-center">
      Free worldwide shipping over $75 · 30-day returns
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const nav = ["Shemaghs", "Niqabs", "Kufis", "Honey", "Journal"];
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-black/10">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
        <div className="flex-1 flex items-center gap-6">
          <button aria-label="Menu" onClick={() => setOpen(!open)} className="md:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <nav className="hidden md:flex gap-7 text-[11px] tracking-[0.2em] uppercase">
            {nav.map((n) => <a key={n} href="#" className="hover:opacity-60">{n}</a>)}
          </nav>
        </div>
        <a href="/" className="flex-1 flex justify-center">
          <img src={logoAsset.url} alt="Fawzaan" className="h-9 md:h-11 w-auto object-contain" />
        </a>
        <div className="flex-1 flex items-center justify-end gap-4">
          <button aria-label="Search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
          <button aria-label="Account" className="hidden sm:block"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg></button>
          <button aria-label="Cart" className="relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 7h12l-1.2 12.1a2 2 0 0 1-2 1.9H9.2a2 2 0 0 1-2-1.9L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
            <span className="absolute -top-1.5 -right-2 bg-black text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center">0</span>
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-black/10 px-4 py-4 flex flex-col gap-4 text-[13px] tracking-[0.15em] uppercase">
          {nav.map((n) => <a key={n} href="#" onClick={() => setOpen(false)}>{n}</a>)}
        </nav>
      )}
    </header>
  );
}

/* ---------------------------------------------------------------- */
/* Sections                                                         */
/* ---------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative w-full">
      <div className="relative h-[92svh] min-h-[560px] w-full overflow-hidden bg-neutral-900">
        <img src={heroShemagh.url} alt="Heritage shemagh" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/70" />
        <div className="relative z-10 h-full flex flex-col items-center justify-end text-center text-white pb-16 md:pb-24 px-5">
          <p className="text-[10px] md:text-[11px] tracking-[0.4em] uppercase opacity-80">Autumn Edit · 2026</p>
          <h1 className="mt-4 font-serif italic text-6xl sm:text-7xl md:text-[110px] leading-[0.9]" style={{ fontFamily: "var(--font-serif-display)" }}>
            Heritage,<br/>rewoven.
          </h1>
          <p className="mt-5 max-w-md text-[13px] md:text-[14px] leading-relaxed opacity-85">
            Hand-loomed shemaghs, chiffon niqabs, and raw Kashmir honey — sourced at origin and made to last.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#women" className="bg-white text-black px-8 py-3.5 text-[11px] tracking-[0.25em] uppercase hover:bg-black hover:text-white transition-colors">Shop Women</a>
            <a href="#men" className="border border-white text-white px-8 py-3.5 text-[11px] tracking-[0.25em] uppercase hover:bg-white hover:text-black transition-colors">Shop Men</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const words = ["Made at origin", "Hand-loomed", "Chiffon-soft", "Raw & unfiltered", "Traceable"];
  return (
    <div className="bg-black text-white overflow-hidden border-y border-white/10">
      <div className="flex gap-12 py-4 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
        {[...words, ...words, ...words].map((w, i) => (
          <span key={i} className="text-[11px] tracking-[0.35em] uppercase flex items-center gap-12">
            {w} <span className="opacity-40">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Collections() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500">Shop by</p>
            <h2 className="mt-2 text-3xl md:text-5xl" style={{ fontFamily: "var(--font-serif-display)" }}>Collections</h2>
          </div>
          <a href="#" className="hidden md:inline text-[11px] tracking-[0.2em] uppercase underline underline-offset-4">View all</a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {collections.map((c) => (
            <a key={c.name} href="#" className="group relative block aspect-[3/4] overflow-hidden bg-neutral-100">
              <img src={c.image} alt={c.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white flex items-center justify-between">
                <h3 className="text-lg md:text-2xl" style={{ fontFamily: "var(--font-serif-display)" }}>{c.name}</h3>
                <span className="text-[10px] tracking-[0.2em] uppercase">Shop →</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ p }: { p: Product }) {
  return (
    <a href="#" className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <img src={p.image} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0" />
        {p.hover && <img src={p.hover} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
        {p.tag && <span className="absolute top-3 left-3 bg-white text-black text-[9px] tracking-[0.2em] uppercase px-2 py-1">{p.tag}</span>}
        <span className="absolute bottom-3 left-3 right-3 bg-black text-white text-[10px] tracking-[0.2em] uppercase text-center py-2.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">Quick add</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm md:text-[15px]" style={{ fontFamily: "var(--font-serif-display)" }}>{p.name}</h3>
        <span className="text-xs md:text-sm text-neutral-600">{p.price}</span>
      </div>
    </a>
  );
}

function ProductGrid({ eyebrow, title, items, id }: { eyebrow: string; title: string; items: Product[]; id?: string }) {
  return (
    <section id={id} className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500">{eyebrow}</p>
          <h2 className="mt-3 text-3xl md:text-5xl" style={{ fontFamily: "var(--font-serif-display)" }}>{title}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
          {items.map((p, i) => <ProductCard key={i} p={p} />)}
        </div>
      </div>
    </section>
  );
}

function SplitBanner({ img, eyebrow, title, blurb, align, id }: { img: string; eyebrow: string; title: string; blurb: string; align: "left" | "right"; id?: string }) {
  return (
    <section id={id} className="relative w-full overflow-hidden">
      <div className="relative h-[75vh] min-h-[480px]">
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className={`absolute inset-0 ${align === "left" ? "bg-gradient-to-r from-black/60 via-black/20 to-transparent" : "bg-gradient-to-l from-black/60 via-black/20 to-transparent"}`} />
        <div className={`relative z-10 h-full mx-auto max-w-[1400px] px-5 md:px-8 flex items-center ${align === "right" ? "justify-end text-right" : ""}`}>
          <div className="text-white max-w-md">
            <p className="text-[10px] tracking-[0.35em] uppercase opacity-80">{eyebrow}</p>
            <h2 className="mt-4 text-4xl md:text-6xl leading-[0.95]" style={{ fontFamily: "var(--font-serif-display)" }}>{title}</h2>
            <p className={`mt-4 text-[13px] md:text-[14px] opacity-85 max-w-sm ${align === "right" ? "ml-auto" : ""}`}>{blurb}</p>
            <a href="#" className="mt-7 inline-block border-b border-white pb-1 text-[11px] tracking-[0.25em] uppercase hover:opacity-70">Shop the edit →</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function EditorialSplit() {
  return (
    <section className="bg-[#f5f2ec]">
      <div className="grid grid-cols-1 md:grid-cols-2 items-center">
        <div className="relative aspect-square md:aspect-auto md:h-[75vh]">
          <img src={niqabGrid.url} alt="Khadijah editorial" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="px-6 py-16 md:px-16 md:py-24 max-w-xl">
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500">Made with intent</p>
          <h2 className="mt-4 text-4xl md:text-5xl leading-tight" style={{ fontFamily: "var(--font-serif-display)" }}>
            The Khadijah niqab. Two-layer chiffon, softly draped.
          </h2>
          <p className="mt-5 text-[14px] text-neutral-700 leading-relaxed">
            Opaque yet weightless. Cut from long-staple chiffon and finished by hand — an everyday piece designed to disappear into your rhythm.
          </p>
          <a href="#" className="mt-8 inline-block bg-black text-white px-8 py-3.5 text-[11px] tracking-[0.25em] uppercase hover:bg-neutral-800">Discover the collection</a>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    { q: "The softest niqab I've ever worn. Truly.", a: "— Aisha M." },
    { q: "The shemagh weight is perfect. Feels like an heirloom.", a: "— Yusuf R." },
    { q: "That black seed honey is unreal. Reordering.", a: "— Hana K." },
  ];
  return (
    <section className="bg-black text-white py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 text-center">
        <p className="text-[10px] tracking-[0.35em] uppercase opacity-60">Kind words</p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
          {quotes.map((t) => (
            <figure key={t.a}>
              <blockquote className="text-2xl md:text-3xl leading-snug" style={{ fontFamily: "var(--font-serif-display)" }}>
                "{t.q}"
              </blockquote>
              <figcaption className="mt-5 text-[11px] tracking-[0.2em] uppercase opacity-60">{t.a}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Values() {
  const items = [
    { t: "Free shipping", s: "On orders over $75" },
    { t: "30-day returns", s: "Easy and no questions" },
    { t: "Sourced at origin", s: "Direct from artisans" },
    { t: "Secure checkout", s: "Encrypted end-to-end" },
  ];
  return (
    <section className="border-y border-black/10 bg-[#f5f2ec]">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10">
        <ul className="grid grid-cols-2 md:grid-cols-4 divide-x divide-black/10">
          {items.map((v) => (
            <li key={v.t} className="text-center px-3 py-3">
              <p className="text-[11px] tracking-[0.2em] uppercase">{v.t}</p>
              <p className="mt-1 text-[11px] text-neutral-600">{v.s}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-xl px-4 text-center">
        <p className="text-[10px] tracking-[0.35em] uppercase text-neutral-500">The list</p>
        <h2 className="mt-3 text-3xl md:text-4xl" style={{ fontFamily: "var(--font-serif-display)" }}>Join Fawzaan</h2>
        <p className="mt-3 text-[14px] text-neutral-600">First look at new drops and 10% off your first order.</p>
        <form className="mt-8 flex border-b border-black" onSubmit={(e) => e.preventDefault()}>
          <input type="email" required placeholder="Email address" className="flex-1 bg-transparent py-3 outline-none text-sm placeholder:text-neutral-400" />
          <button className="text-[11px] tracking-[0.25em] uppercase px-2">Subscribe →</button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { h: "Shop", l: ["Shemaghs", "Niqabs", "Kufis", "Honey", "Gift cards"] },
    { h: "Help", l: ["Contact", "Shipping", "Returns", "FAQ", "Size guide"] },
    { h: "About", l: ["Our story", "Sourcing", "Journal", "Sustainability"] },
  ];
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <img src={logoAsset.url} alt="Fawzaan" className="h-10 w-auto object-contain brightness-0 invert" />
          <p className="mt-4 text-[13px] text-white/60 leading-relaxed max-w-xs">Heritage essentials — hand-loomed, made at origin, and quietly built to last.</p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h4 className="text-[11px] tracking-[0.25em] uppercase mb-5">{c.h}</h4>
            <ul className="space-y-2.5 text-[13px] text-white/60">
              {c.l.map((x) => <li key={x}><a href="#" className="hover:text-white">{x}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-6 text-[11px] text-white/50 flex flex-col md:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Fawzaan. All rights reserved.</span>
          <span className="tracking-[0.2em] uppercase">Made with care</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------------- */
/* Page                                                             */
/* ---------------------------------------------------------------- */

function Home() {
  return (
    <main className="min-h-screen bg-white text-black">
      <Announcement />
      <Header />
      <Hero />
      <Marquee />
      <Collections />
      <ProductGrid eyebrow="Bestsellers" title="What everyone's wearing" items={bestSellers} />
      <SplitBanner
        id="men"
        img={bannerBrothers.url}
        eyebrow="The Brothers Collection"
        title="For the men of the house."
        blurb="Hand-loomed shemaghs, ivory-embroidered kufis, breathable weaves."
        align="left"
      />
      <ProductGrid eyebrow="Editorial" title="The look book" items={editorial} />
      <SplitBanner
        id="women"
        img={bannerNisaa.url}
        eyebrow="The Nisaa' Collection"
        title="For the women of the house."
        blurb="Two-layer chiffon niqabs — quiet, opaque, and softly draped."
        align="right"
      />
      <EditorialSplit />
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500">The Harvest</p>
            <h2 className="mt-3 text-3xl md:text-5xl" style={{ fontFamily: "var(--font-serif-display)" }}>Raw Kashmir Honey</h2>
            <p className="mt-3 text-[14px] text-neutral-600 max-w-md mx-auto">Unfiltered, unheated, and traceable to a single highland origin.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {honeyLine.map((p, i) => <ProductCard key={i} p={p} />)}
          </div>
        </div>
      </section>
      <Testimonials />
      <Values />
      <Newsletter />
      <Footer />
    </main>
  );
}
