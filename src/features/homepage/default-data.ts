import { DEFAULT_HERO_GRADIENT } from "./brand";
import type { HeroGradient, HeroProps, HeroSlide, HomepageData } from "./types";

export const DEFAULT_HOMEPAGE_DATA: HomepageData = {
  schemaVersion: 2,
  root: {
    props: {
      title: "Fawzaan homepage",
      backgroundColor: "#ffffff",
    },
  },
  content: [
    {
      type: "Hero",
      props: {
        id: "original-hero",
        slides: [
          {
            eyebrow: "New collection",
            title: "AL-IKHWAAN SET",
            body: "",
            buttonLabel: "Shop the collection",
            buttonUrl: "/shop?collection=Shemaghs",
            backgroundImage: "/homepage/hero-bg.png",
            foregroundImage: "/homepage/hero-shemagh.webp",
            backgroundColor: "#F6AD32",
            imageFocus: "center",
            gradient: { ...DEFAULT_HERO_GRADIENT },
            layout: "original",
            textAlign: "left",
            textTone: "light",
            titleFont: "display",
            titleSize: 76,
            mobileTitleSize: 50,
            contentWidth: 650,
            contentOffsetX: 6,
            contentOffsetY: 9,
            foregroundScale: 100,
            overlayOpacity: 12,
          },
          {
            eyebrow: "New collection",
            title: "AS-SALIHAAT SET",
            body: "",
            buttonLabel: "Shop the collection",
            buttonUrl: "/shop?collection=Niqabs",
            backgroundImage: "/homepage/hero-bg.png",
            foregroundImage: "/homepage/hero-niqab.webp",
            backgroundColor: "#F6AD32",
            imageFocus: "center",
            gradient: { ...DEFAULT_HERO_GRADIENT },
            layout: "original",
            textAlign: "left",
            textTone: "light",
            titleFont: "display",
            titleSize: 76,
            mobileTitleSize: 50,
            contentWidth: 650,
            contentOffsetX: 6,
            contentOffsetY: 9,
            foregroundScale: 100,
            overlayOpacity: 12,
          },
        ],
        layout: "original",
        editorSlide: 1,
        textAlign: "left",
        textTone: "light",
        titleFont: "display",
        titleSize: 76,
        mobileTitleSize: 50,
        contentWidth: 650,
        contentOffsetX: 6,
        contentOffsetY: 9,
        foregroundScale: 100,
        overlayOpacity: 12,
        autoplay: "on",
        autoplayInterval: 7000,
        transition: "slide",
        transitionDuration: 600,
        pauseOnHover: "yes",
        loop: "yes",
      },
    },
    {
      type: "CollectionBanners",
      props: {
        id: "explore-edits",
        eyebrow: "Shop more collections",
        title: "EXPLORE EDITS",
        cards: [
          {
            eyebrow: "Coming next",
            title: "MAKKAH GLOVES",
            body: "Gold artwork cases in staple colours.",
            buttonLabel: "Shop collection",
            buttonUrl: "/shop?collection=Gloves",
            image: "/homepage/makkah-gloves.jpg",
          },
          {
            eyebrow: "Harvest edit",
            title: "KASHMIR HONEY",
            body: "Raw floral honey from Kashmir.",
            buttonLabel: "Shop collection",
            buttonUrl: "/shop?collection=Honey",
            image: "/homepage/honey.jpg",
          },
        ],
        backgroundColor: "#ffffff",
        titleFont: "display",
        titleSize: 52,
      },
    },
    {
      type: "ProductGrid",
      props: {
        id: "shop-all",
        eyebrow: "Browse the store",
        title: "SHOP ALL",
        collection: "all",
        productLimit: 24,
        showFilters: "yes",
        backgroundColor: "#ffffff",
        titleFont: "display",
        titleSize: 52,
        columns: "4",
      },
    },
    {
      type: "SplitEditorial",
      props: {
        id: "daily-essentials",
        eyebrow: "Fawzaan essentials",
        title: "DAILY ESSENTIALS",
        cards: [
          {
            eyebrow: "Shemaghs and kufis",
            title: "FOR THE BROTHERS",
            body: "Shemaghs, kufis, and daily embroidered staples.",
            buttonLabel: "Shop the edit",
            buttonUrl: "/shop?collection=Shemaghs",
            image: "/homepage/shemagh.jpg",
          },
          {
            eyebrow: "Niqab essentials",
            title: "FOR THE SISTERS",
            body: "Soft chiffon, clean drape, everyday coverage.",
            buttonLabel: "Shop the edit",
            buttonUrl: "/shop?collection=Niqabs",
            image: "/homepage/niqab.jpg",
          },
        ],
        backgroundColor: "#ffffff",
        titleFont: "display",
        titleSize: 52,
      },
    },
    {
      type: "CollectionFeature",
      props: {
        id: "sabr-watches",
        eyebrow: "Arabic dial watches",
        title: "SABR WATCHES",
        body: "Arabic numerals, brushed steel, clean daily polish.",
        buttonLabel: "Shop watches",
        buttonUrl: "/shop?collection=Watches",
        collection: "watches",
        image: "/homepage/sabr-watch-black.jpg",
        backgroundColor: "#ffffff",
        bannerColor: "#000000",
        textTone: "light",
        textAlign: "left",
        titleFont: "display",
        titleSize: 72,
        mobileTitleSize: 48,
        productLimit: 4,
        layout: "banner-left",
      },
    },
    {
      type: "CollectionFeature",
      props: {
        id: "kashmir-honey",
        eyebrow: "The harvest",
        title: "KASHMIR HONEY",
        body: "Raw floral honey, selected by origin.",
        buttonLabel: "Shop honey",
        buttonUrl: "/shop?collection=Honey",
        collection: "honey",
        image: "/homepage/honey.jpg",
        backgroundColor: "#ffffff",
        bannerColor: "#000000",
        textTone: "light",
        textAlign: "left",
        titleFont: "display",
        titleSize: 62,
        mobileTitleSize: 38,
        productLimit: 3,
        layout: "banner-top",
      },
    },
  ],
};

export function cloneDefaultHomepageData(): HomepageData {
  const data = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_DATA)) as HomepageData;
  data.content = data.content.filter((item) => item.type === "Hero");
  return data;
}

export function isHomepageEditorData(value: unknown): value is HomepageData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<HomepageData>;
  if (data.schemaVersion !== 2 || !Array.isArray(data.content)) return false;
  if (data.content.length < 1 || data.content[0]?.type !== "Hero") return false;
  return data.content.every(
    (item, index) =>
      (index === 0 && item.type === "Hero") ||
      (index > 0 && (item.type === "CollectionFeature" || item.type === "PromoBanner")),
  );
}

const LEGACY_BRAND_COLOURS = new Set(["#f4b400", "#f5b90a", "#ffbf00", "#f39a3b"]);

function migrateBrandColours(value: unknown): unknown {
  if (typeof value === "string") {
    return LEGACY_BRAND_COLOURS.has(value.toLowerCase()) ? "#F6AD32" : value;
  }
  if (Array.isArray(value)) return value.map(migrateBrandColours);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      migrateBrandColours(nested),
    ]),
  );
}

function normalizeSlide(slide: Partial<HeroSlide>, defaults: Partial<HeroProps>): HeroSlide {
  const incomingGradient: Partial<HeroGradient> = slide.gradient ?? {};
  const usedPreviousBrandGradient =
    String(incomingGradient.startColor ?? "").toLowerCase() === "#f8c247" &&
    String(incomingGradient.endColor ?? "").toLowerCase() === "#e96a3a";
  return {
    eyebrow: String(slide.eyebrow ?? ""),
    title: String(slide.title ?? ""),
    body: String(slide.body ?? ""),
    buttonLabel: String(slide.buttonLabel ?? ""),
    buttonUrl: String(slide.buttonUrl ?? "/shop"),
    backgroundImage: String(slide.backgroundImage ?? ""),
    foregroundImage: String(slide.foregroundImage ?? ""),
    backgroundColor: String(slide.backgroundColor ?? "#F6AD32"),
    imageFocus: String(slide.imageFocus ?? "center"),
    gradient: usedPreviousBrandGradient
      ? {
          ...DEFAULT_HERO_GRADIENT,
          ...incomingGradient,
          startColor: DEFAULT_HERO_GRADIENT.startColor,
          endColor: DEFAULT_HERO_GRADIENT.endColor,
        }
      : { ...DEFAULT_HERO_GRADIENT, ...incomingGradient },
    layout: (slide.layout ?? defaults.layout) === "banner" ? "banner" : "original",
    textAlign:
      (slide.textAlign ?? defaults.textAlign) === "center" ||
      (slide.textAlign ?? defaults.textAlign) === "right"
        ? (slide.textAlign ?? defaults.textAlign)
        : "left",
    textTone: (slide.textTone ?? defaults.textTone) === "dark" ? "dark" : "light",
    titleFont: (slide.titleFont ?? defaults.titleFont) === "sans" ? "sans" : "display",
    titleSize: Number(slide.titleSize ?? defaults.titleSize ?? 76),
    mobileTitleSize: Number(slide.mobileTitleSize ?? defaults.mobileTitleSize ?? 50),
    contentWidth: Number(slide.contentWidth ?? defaults.contentWidth ?? 650),
    contentOffsetX: Number(slide.contentOffsetX ?? defaults.contentOffsetX ?? 6),
    contentOffsetY: Number(slide.contentOffsetY ?? defaults.contentOffsetY ?? 9),
    foregroundScale: Number(slide.foregroundScale ?? defaults.foregroundScale ?? 100),
    overlayOpacity: Number(slide.overlayOpacity ?? defaults.overlayOpacity ?? 12),
    scene: slide.scene,
  };
}

export function normalizeHomepageData(data: HomepageData): HomepageData {
  const normalized = migrateBrandColours(JSON.parse(JSON.stringify(data))) as HomepageData;
  normalized.schemaVersion = 2;
  normalized.content = (normalized.content ?? [])
    .filter(
      (item) =>
        item.type === "Hero" || item.type === "CollectionFeature" || item.type === "PromoBanner",
    )
    .map((item) => {
      if (item.type !== "Hero") return item;
      const props = item.props as HeroProps & { id: string };
      return {
        ...item,
        props: {
          ...props,
          layout: props.layout === "banner" ? "banner" : "original",
          editorSlide: Math.min(12, Math.max(1, Number(props.editorSlide || 1))),
          slides: (props.slides ?? []).map((slide) => normalizeSlide(slide, props)),
        },
      } as typeof item;
    });
  return normalized;
}
