import { createFileRoute } from "@tanstack/react-router";
import bgAsset from "@/assets/hero-bg.png.asset.json";
import niqabAsset from "@/assets/niqab.png.asset.json";
import shemaghAsset from "@/assets/shemagh.png.asset.json";
import extendedNiqab from "@/assets/extended-niqab.jpg.asset.json";
import extendedShemagh from "@/assets/extended-shemagh.jpg.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
});

/* ----------------------------- Hero Banner ----------------------------- */
// Figma frame: 390 × 649 (mobile). Positions are % of that frame.
type BannerProps = {
  title: string;
  product: string;
  productAlt: string;
  titleX: number;
  titleY: number;
  titleW: number;
  eager?: boolean;
};

const FRAME_W = 390;
const FRAME_H = 649;

function HeroBanner({ title, product, productAlt, titleX, titleY, titleW, eager }: BannerProps) {
  return (
    <article
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: `${FRAME_W} / ${FRAME_H}`,
        containerType: "inline-size",
      }}
    >
      <img
        src={bgAsset.url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Product photo — contained, bottom-aligned, never cropped */}
      <img
        src={product}
        alt={productAlt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-x-0 bottom-0 z-10 mx-auto h-full w-full"
        style={{ objectFit: "contain", objectPosition: "bottom center" }}
      />

      <h2
        className="absolute z-20 text-white m-0"
        style={{
          left: `${(titleX / FRAME_W) * 100}%`,
          top: `${(titleY / FRAME_H) * 100}%`,
          width: `${(titleW / FRAME_W) * 100}%`,
          fontFamily: "var(--font-serif-display)",
          fontWeight: 400,
          fontSize: `${(52 / FRAME_W) * 100}cqw`,
          lineHeight: 1,
          letterSpacing: "-0.01em",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h2>

      <a
        href="#collection"
        className="absolute z-20 text-white underline underline-offset-4 hover:opacity-80 transition-opacity"
        style={{
          left: `${(25 / FRAME_W) * 100}%`,
          top: `${(614 / FRAME_H) * 100}%`,
          fontFamily: "var(--font-sans-ui)",
          fontWeight: 500,
          fontSize: `${(13 / FRAME_W) * 100}cqw`,
          letterSpacing: "0.15em",
          lineHeight: 1,
        }}
      >
        SHOP THE COLLECTION
      </a>
    </article>
  );
}

/* -------------------------------- Header ------------------------------- */
function AnnouncementBar() {
  return (
    <div className="bg-black text-white text-center text-xs tracking-[0.15em] uppercase py-2.5 px-4">
      Free shipping on orders over $75 · Worldwide delivery
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <button aria-label="Menu" className="md:hidden">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <nav className="hidden md:flex items-center gap-8 text-sm tracking-wide uppercase" style={{ fontFamily: "var(--font-sans-ui)" }}>
          <a href="#" className="hover:opacity-60">Shop</a>
          <a href="#" className="hover:opacity-60">Collections</a>
          <a href="#" className="hover:opacity-60">About</a>
          <a href="#" className="hover:opacity-60">Contact</a>
        </nav>
        <a href="/" className="text-xl md:text-2xl tracking-wide" style={{ fontFamily: "var(--font-serif-display)" }}>
          Al‑Ikhwaan &amp; As‑Salihaat
        </a>
        <div className="flex items-center gap-4">
          <button aria-label="Search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
          <button aria-label="Account" className="hidden sm:block"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg></button>
          <button aria-label="Cart"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 7h12l-1.2 12.1a2 2 0 0 1-2 1.9H9.2a2 2 0 0 1-2-1.9L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg></button>
        </div>
      </div>
    </header>
  );
}

/* --------------------------- Featured Collection ------------------------ */
type Product = { name: string; price: string; image: string };
function ProductCard({ p }: { p: Product }) {
  return (
    <a href="#" className="group block">
      <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm md:text-base" style={{ fontFamily: "var(--font-serif-display)" }}>{p.name}</h3>
        <span className="text-sm text-neutral-600" style={{ fontFamily: "var(--font-sans-ui)" }}>{p.price}</span>
      </div>
    </a>
  );
}

function FeaturedCollection() {
  const products: Product[] = [
    { name: "As-Salihaat Niqab Set", price: "$89", image: extendedNiqab.url },
    { name: "Al-Ikhwaan Thobe Set", price: "$129", image: extendedShemagh.url },
    { name: "Classic Black Niqab", price: "$59", image: extendedNiqab.url },
    { name: "Red Shemagh Bundle", price: "$45", image: extendedShemagh.url },
  ];
  return (
    <section id="collection" className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
      <div className="mb-8 md:mb-12 flex items-end justify-between">
        <h2 className="text-3xl md:text-4xl" style={{ fontFamily: "var(--font-serif-display)" }}>Featured collection</h2>
        <a href="#" className="hidden md:inline text-sm uppercase tracking-[0.15em] underline underline-offset-4" style={{ fontFamily: "var(--font-sans-ui)" }}>View all</a>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
        {products.map((p, i) => <ProductCard key={i} p={p} />)}
      </div>
    </section>
  );
}

/* --------------------------- Image with Text --------------------------- */
function ImageWithText() {
  return (
    <section className="bg-neutral-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-16 md:grid-cols-2 md:gap-16 md:px-8 md:py-24 items-center">
        <div className="aspect-[4/5] w-full overflow-hidden bg-neutral-100">
          <img src={extendedNiqab.url} alt="Modest craftsmanship" loading="lazy" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4" style={{ fontFamily: "var(--font-sans-ui)" }}>Our story</p>
          <h2 className="text-3xl md:text-5xl mb-6" style={{ fontFamily: "var(--font-serif-display)" }}>Modest essentials, refined.</h2>
          <p className="text-neutral-700 leading-relaxed mb-8" style={{ fontFamily: "var(--font-sans-ui)" }}>
            Each piece in the Al-Ikhwaan and As-Salihaat collections is designed with care — cut from breathable, hand-selected fabrics and finished by artisans who understand the quiet importance of everyday modest wear.
          </p>
          <a href="#" className="inline-block border border-black px-8 py-3 text-sm uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-colors" style={{ fontFamily: "var(--font-sans-ui)" }}>Learn more</a>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Multicolumn ----------------------------- */
function Multicolumn() {
  const items = [
    { title: "Ethically sourced", body: "Fabrics selected from trusted, transparent suppliers." },
    { title: "Made to last", body: "Reinforced stitching and durable finishes on every piece." },
    { title: "Free returns", body: "30-day easy returns on all unworn items, worldwide." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-16 text-center">
        {items.map((it) => (
          <div key={it.title}>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12l5 5L20 7"/></svg>
            </div>
            <h3 className="text-xl mb-2" style={{ fontFamily: "var(--font-serif-display)" }}>{it.title}</h3>
            <p className="text-neutral-600 text-sm leading-relaxed" style={{ fontFamily: "var(--font-sans-ui)" }}>{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------- Extended shots --------------------------- */
function ExtendedShots() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <div className="mb-8 md:mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3" style={{ fontFamily: "var(--font-sans-ui)" }}>Look book</p>
          <h2 className="text-3xl md:text-4xl" style={{ fontFamily: "var(--font-serif-display)" }}>The full silhouette</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <figure className="bg-neutral-100">
            <img src={extendedNiqab.url} alt="Full-length niqab set on mannequin" loading="lazy" width={1280} height={1600} className="w-full h-auto object-contain" />
            <figcaption className="p-4 text-sm text-neutral-600 text-center" style={{ fontFamily: "var(--font-sans-ui)" }}>As-Salihaat — full look</figcaption>
          </figure>
          <figure className="bg-neutral-100">
            <img src={extendedShemagh.url} alt="Full-length thobe and shemagh on mannequin" loading="lazy" width={1280} height={1600} className="w-full h-auto object-contain" />
            <figcaption className="p-4 text-sm text-neutral-600 text-center" style={{ fontFamily: "var(--font-sans-ui)" }}>Al-Ikhwaan — full look</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Newsletter ----------------------------- */
function Newsletter() {
  return (
    <section className="bg-neutral-50">
      <div className="mx-auto max-w-2xl px-4 py-16 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl mb-4" style={{ fontFamily: "var(--font-serif-display)" }}>Subscribe to our emails</h2>
        <p className="text-neutral-600 mb-8" style={{ fontFamily: "var(--font-sans-ui)" }}>Be the first to know about new collections and exclusive offers.</p>
        <form className="flex max-w-md mx-auto border-b border-neutral-400 focus-within:border-black" onSubmit={(e) => e.preventDefault()}>
          <input type="email" required placeholder="Email" className="flex-1 bg-transparent py-3 px-1 outline-none text-sm" style={{ fontFamily: "var(--font-sans-ui)" }} />
          <button type="submit" aria-label="Subscribe" className="px-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </form>
      </div>
    </section>
  );
}

/* -------------------------------- Footer ------------------------------- */
function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <p className="text-lg mb-3" style={{ fontFamily: "var(--font-serif-display)" }}>Al‑Ikhwaan &amp; As‑Salihaat</p>
          <p className="text-sm text-neutral-600 leading-relaxed" style={{ fontFamily: "var(--font-sans-ui)" }}>Modest essentials, thoughtfully designed and made to last.</p>
        </div>
        {[
          { h: "Shop", links: ["Niqab sets", "Shemagh & thobe", "Accessories", "Gift cards"] },
          { h: "Help", links: ["Contact", "Shipping", "Returns", "FAQ"] },
          { h: "Company", links: ["Our story", "Journal", "Sustainability", "Press"] },
        ].map((c) => (
          <div key={c.h}>
            <h4 className="text-xs uppercase tracking-[0.15em] mb-4" style={{ fontFamily: "var(--font-sans-ui)" }}>{c.h}</h4>
            <ul className="space-y-2 text-sm text-neutral-600" style={{ fontFamily: "var(--font-sans-ui)" }}>
              {c.links.map((l) => <li key={l}><a href="#" className="hover:text-black">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 text-xs text-neutral-500 flex flex-col md:flex-row items-center justify-between gap-2" style={{ fontFamily: "var(--font-sans-ui)" }}>
          <span>© {new Date().getFullYear()} Al‑Ikhwaan &amp; As‑Salihaat.</span>
          <span>Made with care.</span>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------- Page -------------------------------- */
function Index() {
  return (
    <main className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <div className="grid grid-cols-1 md:grid-cols-2">
        <HeroBanner
          title="AS-SALIHAAT SET"
          product={niqabAsset.url}
          productAlt="Black niqab"
          titleX={41}
          titleY={100}
          titleW={319}
          eager
        />
        <HeroBanner
          title="AL-IKHWAAN SET"
          product={shemaghAsset.url}
          productAlt="Red and white shemagh"
          titleX={37}
          titleY={121}
          titleW={316}
        />
      </div>
      <FeaturedCollection />
      <ImageWithText />
      <Multicolumn />
      <ExtendedShots />
      <Newsletter />
      <Footer />
    </main>
  );
}
