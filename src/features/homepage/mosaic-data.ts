import honeyMulti from "@/assets/product-photos/honey-kashmir-multiflora.jpg";
import kufiSide from "@/assets/product-photos/kufi-side.jpg";
import niqabBlackFront from "@/assets/product-photos/niqab-black-front.jpg";
import shemaghManBack from "@/assets/product-photos/shemagh-man-back.jpg";
import shemaghRedFull from "@/assets/product-photos/shemagh-red-full.jpg";

import type { HomepageData, HomepageMosaicCard } from "./types";

export const MAX_MOSAIC_CARDS = 20;

export const DEFAULT_MOSAIC_COLLECTIONS: HomepageMosaicCard[] = [
  {
    id: "mosaic-honey",
    title: "KASHMIR HONEY",
    eyebrow: "The harvest",
    image: honeyMulti,
    imagePosition: "center",
    href: "/shop?collection=Honey",
  },
  {
    id: "mosaic-gloves",
    title: "MAKKAH GLOVES",
    eyebrow: "Coming next",
    image: "/homepage/makkah-gloves.jpg",
    imagePosition: "center",
    href: "/shop?collection=Gloves",
  },
  {
    id: "mosaic-shemaghs",
    title: "YEMENI SHEMAGHS",
    eyebrow: "For the brothers",
    image: shemaghManBack,
    imagePosition: "62% center",
    href: "/shop?collection=Shemaghs",
  },
  {
    id: "mosaic-niqabs",
    title: "KHADIJA NIQABS",
    eyebrow: "For the sisters",
    image: niqabBlackFront,
    imagePosition: "50% 30%",
    href: "/shop?collection=Niqabs",
  },
  {
    id: "mosaic-kufis",
    title: "WOVEN KUFIS",
    eyebrow: "Daily prayerwear",
    image: kufiSide,
    imagePosition: "center 28%",
    href: "/shop?collection=Kufis",
  },
  {
    id: "mosaic-watches",
    title: "SABR WATCHES",
    eyebrow: "Arabic dial watches",
    image: "/homepage/sabr-watch-black.jpg",
    imagePosition: "center",
    href: "/shop?collection=Watches",
  },
  {
    id: "mosaic-shop-all",
    title: "SHOP ALL",
    eyebrow: "The complete edit",
    image: shemaghRedFull,
    imagePosition: "center 28%",
    href: "/shop",
  },
];

function cloneDefaults() {
  return DEFAULT_MOSAIC_COLLECTIONS.map((card) => ({ ...card }));
}

export function homepageMosaicCards(homepage?: HomepageData | null) {
  const cards = homepage?.root.props.mosaicCollections;
  if (!Array.isArray(cards) || cards.length === 0) return cloneDefaults();
  return cards.slice(0, MAX_MOSAIC_CARDS).map((card, index) => ({
    id: String(card.id || `mosaic-${index + 1}`),
    title: String(card.title || "Collection"),
    eyebrow: String(card.eyebrow || "Explore"),
    image: String(card.image || ""),
    imagePosition: String(card.imagePosition || "center"),
    href: String(card.href || "/shop"),
  }));
}

export function ensureHomepageMosaic(homepage: HomepageData): HomepageData {
  return {
    ...homepage,
    root: {
      ...homepage.root,
      props: {
        ...homepage.root.props,
        mosaicCollections: homepageMosaicCards(homepage),
      },
    },
  };
}
