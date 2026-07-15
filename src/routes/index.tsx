import { createFileRoute } from "@tanstack/react-router";
import bgAsset from "@/assets/hero-bg.png.asset.json";
import niqabAsset from "@/assets/niqab.png.asset.json";
import shemaghAsset from "@/assets/shemagh.png.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
});

// Figma frame: 390 × 649 (mobile). All positions below are % of that frame.
type BannerProps = {
  title: string;
  product: string;
  productAlt: string;
  // Title box from Figma (x, y, width in px on 390-wide frame)
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
      {/* Yellow gradient background */}
      <img
        src={bgAsset.url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Product photo — bottom-centered, roughly 82% of frame height */}
      <img
        src={product}
        alt={productAlt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="absolute left-1/2 -translate-x-1/2 bottom-0 z-10"
        style={{ height: "82%", width: "auto", maxWidth: "92%", objectFit: "contain" }}
      />

      {/* Title — Instrument Serif 52px on 390 frame */}
      <h2
        className="absolute text-white m-0"
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

      {/* Action link — Schibsted Grotesk 13px, x=25 y=614 on 390×649 frame */}
      <a
        href="#"
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

function Index() {
  return (
    <main className="min-h-screen bg-background">
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
    </main>
  );
}
