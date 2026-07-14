import { createFileRoute } from "@tanstack/react-router";
import niqabImg from "@/assets/hero-niqab.jpg";
import shemaghImg from "@/assets/hero-shemagh.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

type BannerProps = {
  title: string;
  image: string;
  imageAlt: string;
  /** Percentage of banner height where the product image starts (from Figma). */
  imageTopPct: number;
  /** Percentage of banner height where the title baseline sits. */
  titleTopPct: number;
  eager?: boolean;
};

function HeroBanner({ title, image, imageAlt, imageTopPct, titleTopPct, eager }: BannerProps) {
  return (
    <article className="relative w-full overflow-hidden aspect-[390/649] bg-[#f5c518]">
      {/* Product photo — carries the yellow gradient itself, so it fills the whole banner.
          object-position is tuned so the product sits at the Figma-specified vertical start. */}
      <img
        src={image}
        alt={imageAlt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: `center ${(imageTopPct / (100 - (100 - 100))).toFixed(2)}%` }}
      />


      {/* Title — sits above the image on the yellow field */}
      <h2
        className="absolute left-0 right-0 text-center font-light tracking-[0.08em] text-white px-8"
        style={{
          top: `${titleTopPct}%`,
          fontFamily: "var(--font-serif-display)",
          fontSize: "clamp(1.75rem, 7.2vw, 3rem)",
          lineHeight: 1,
        }}
      >
        {title}
      </h2>

      {/* Action link — bottom-left per Figma (x=25, y=614 on a 649-tall canvas) */}
      <a
        href="#"
        className="absolute left-[6.4%] bottom-[3%] text-white text-[13px] tracking-[0.12em] underline underline-offset-4 hover:opacity-80 transition-opacity"
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
          image={niqabImg}
          imageAlt="Black niqab set on mannequin"
          imageTopPct={22.2}
          titleTopPct={15.4}
          eager
        />
        <HeroBanner
          title="AL-IKHWAAN SET"
          image={shemaghImg}
          imageAlt="Red and white shemagh set on mannequin"
          imageTopPct={33.9}
          titleTopPct={18.6}
        />
      </div>
    </main>
  );
}
