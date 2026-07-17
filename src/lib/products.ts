// Central product catalog for Fawzaan Store.
// Prices are in INR (₹). Currency is converted at render via useCurrency().

import shemaghRedHead from "@/assets/shemagh-red-head.jpg";
import shemaghIvoryFront from "@/assets/shemagh-red-front.jpg";
import shemaghIvorySide from "@/assets/shemagh-red-side.jpg";
import shemaghIvoryWrap from "@/assets/shemagh-red-wrap.jpg";
import shemaghIvoryBack from "@/assets/shemagh-red-back.jpg";
import shemaghIvoryFlat from "@/assets/shemagh-red-flat.jpg";
import kufiFront from "@/assets/kufi-white-front.jpg";
import kufiSide from "@/assets/kufi-white-side.jpg";
import niqabRedFront from "@/assets/niqab-red-front.jpg";
import niqabRedSide from "@/assets/niqab-red-side.jpg";
import niqabKhadija1 from "@/assets/niqab-khadija-1.jpg";
import niqabKhadija2 from "@/assets/niqab-khadija-2.jpg";
import niqabKhadija3 from "@/assets/niqab-khadija-3.jpg";
import niqabKhadija4 from "@/assets/niqab-khadija-4.jpg";
import honeyMulti from "@/assets/honey-kashmir-multiflora.jpg";
import honeyAcacia from "@/assets/honey-kashmir-acacia.jpg";
import honeyBlack from "@/assets/honey-kashmir-black.jpg";
import sabrWatchBlack from "@/assets/collection-banners/sabr-watch-black.jpg";
import sabrWatchBlue from "@/assets/collection-banners/sabr-watch-blue.jpg";
import sabrWatchGreen from "@/assets/collection-banners/sabr-watch-green.jpg";
import sabrWatchWhite from "@/assets/collection-banners/sabr-watch-white.jpg";

export type Collection = "shemaghs" | "niqabs" | "kufis" | "gloves" | "honey" | "watches" | "other";
export type Gender = "men" | "women" | "unisex";

export type Variant = { name: string; swatch?: string };

export type Product = {
  id?: string;
  slug: string;
  name: string;
  collection: Collection;
  collectionSlug?: string;
  collectionLabel?: string;
  filterTags?: string[];
  gender: Gender;
  price: number; // INR base
  compareAt?: number; // INR base
  rating: number;
  reviews: number;
  images: string[];
  colors?: Variant[];
  sizes?: string[];
  short: string;
  description: string;
  features: string[];
  materials: string;
  care: string;
  tag?: "Bestseller" | "New" | "Limited";
  inStock?: boolean;
  stockQuantity?: number;
};

export const catalog: Product[] = [
  {
    slug: "yemeni-shemagh-red",
    name: "Yemeni Shemagh — Red & White",
    collection: "shemaghs",
    gender: "men",
    price: 2200,
    compareAt: 2800,
    rating: 4.9,
    reviews: 1240,
    images: [shemaghRedHead],
    sizes: ["Standard · 130 × 130 cm"],
    short: "The heritage red-and-white keffiyeh, hand-loomed in Yemen.",
    description:
      "Hand-loomed in 100% long-staple cotton with the classic red-and-white herringbone weave. A generous 130 × 130 cm cut wraps without slipping — the honest Yemeni original.",
    features: [
      "100% combed cotton, mid-weight",
      "Traditional red-and-white herringbone weave",
      "130 × 130 cm — wraps without slipping",
      "Colour-fast dye, machine washable cold",
    ],
    materials: "100% long-staple cotton.",
    care: "Machine wash cold, hang dry. Iron on low.",
    tag: "Bestseller",
  },
  {
    slug: "ivory-embroidered-shemagh",
    name: "Ivory Embroidered Shemagh",
    collection: "shemaghs",
    gender: "men",
    price: 2400,
    rating: 4.8,
    reviews: 312,
    images: [
      shemaghIvoryFront,
      shemaghIvorySide,
      shemaghIvoryWrap,
      shemaghIvoryBack,
      shemaghIvoryFlat,
    ],
    sizes: ["Standard · 130 × 130 cm"],
    short: "Ivory shemagh with rose-red embroidered borders.",
    description:
      "A softer, dressier take on the Yemeni original. Featherlight ivory ground with delicate rose-red embroidery running along the borders. Drapes cleanly, holds shape.",
    features: [
      "Ivory ground with rose-red embroidered borders",
      "Featherlight, breathable weave",
      "130 × 130 cm — full drape",
      "Suitable for daily and formal wear",
    ],
    materials: "Cotton blend with embroidered detailing.",
    care: "Hand wash cold, hang dry.",
    tag: "New",
  },
  {
    slug: "khadija-niqab",
    name: "Khadija Niqab",
    collection: "niqabs",
    gender: "women",
    price: 650,
    rating: 4.9,
    reviews: 986,
    images: [niqabKhadija2, niqabKhadija1, niqabKhadija3, niqabKhadija4],
    colors: [{ name: "Onyx Black", swatch: "#000000" }],
    sizes: ["One Size"],
    short: "Two-layer chiffon niqab with long draping veil.",
    description:
      "Featherlight two-layer chiffon niqab with an extended draping veil. Breathable, opaque, and drapes without static. Cut generously to layer beautifully over any abaya.",
    features: [
      "First layer: 54 in — Second layer: 34 in",
      "Face veil: 22.5 × 13.5 in",
      "Gear: 82 in",
      "Premium chiffon fabric",
      "Adjustable elastic band",
    ],
    materials: "Premium chiffon.",
    care: "Hand wash cold, hang dry.",
    tag: "Bestseller",
  },
  {
    slug: "rouge-niqab",
    name: "Rouge Niqab",
    collection: "niqabs",
    gender: "women",
    price: 720,
    rating: 4.8,
    reviews: 214,
    images: [niqabRedFront, niqabRedSide],
    colors: [
      { name: "Rouge", swatch: "#a22222" },
      { name: "Wine", swatch: "#6b1b1b" },
    ],
    sizes: ["One Size", "Long"],
    short: "A quiet colour statement in premium chiffon.",
    description:
      "Same premium chiffon build as our Khadija, in a rich rouge dye. Layered, breathable, and drapes softly.",
    features: ["Two-layer chiffon", "Adjustable ties", "Colour-fast"],
    materials: "Premium chiffon.",
    care: "Hand wash cold, hang dry.",
    tag: "New",
  },
  {
    slug: "white-kufi",
    name: "White Woven Kufi",
    collection: "kufis",
    gender: "men",
    price: 450,
    rating: 4.7,
    reviews: 148,
    images: [kufiFront, kufiSide],
    colors: [{ name: "Ivory White", swatch: "#f5f2ea" }],
    sizes: ["S", "M", "L"],
    short: "Breathable openwork kufi for daily wear.",
    description: "Openwork cotton kufi, hand-finished. Sits softly and holds shape all day.",
    features: ["Breathable openwork", "Cotton blend", "Holds shape"],
    materials: "Cotton blend.",
    care: "Hand wash cold, air dry flat.",
  },
  {
    slug: "kashmir-multiflora-honey",
    name: "Kashmir Multi-Flora Honey · 500g",
    collection: "honey",
    gender: "unisex",
    price: 850,
    rating: 4.9,
    reviews: 621,
    images: [honeyMulti],
    sizes: ["500g"],
    short: "Pure Kashmiri highland honey — no adulteration.",
    description:
      "Premium multi-flora honey from the highlands of Kashmir. Cold-extracted, unfiltered and completely free from adulteration. Rich amber colour with a full floral finish.",
    features: [
      "Sourced from Kashmir highlands",
      "100% pure — no adulteration",
      "Cold-extracted, unfiltered",
      "Multi-flora blend",
      "500g glass jar",
    ],
    materials: "Raw honey.",
    care: "Store cool and dry. Natural crystallisation is normal.",
    tag: "Bestseller",
  },
  {
    slug: "kashmir-acacia-honey",
    name: "Kashmir Acacia Honey · 500g",
    collection: "honey",
    gender: "unisex",
    price: 900,
    rating: 4.8,
    reviews: 187,
    images: [honeyAcacia],
    sizes: ["500g"],
    short: "Light, floral Kashmiri acacia. Slow to crystallise.",
    description:
      "Delicate acacia honey from Kashmir — light golden in colour, gentle on the palate, and slow to crystallise. Pure and unfiltered.",
    features: [
      "Kashmir acacia origin",
      "100% pure — no adulteration",
      "Slow to crystallise",
      "500g glass jar",
    ],
    materials: "Raw acacia honey.",
    care: "Store cool and dry.",
    tag: "New",
  },
  {
    slug: "kashmir-black-honey",
    name: "Kashmir Wild Black Honey · 500g",
    collection: "honey",
    gender: "unisex",
    price: 1200,
    rating: 4.9,
    reviews: 92,
    images: [honeyBlack],
    sizes: ["500g"],
    short: "Rare dark-forest honey — intense, minerally, wild.",
    description:
      "Deep near-black honey harvested from wild Kashmiri forest blooms. Intense, minerally, and prized for its density. Limited seasonal batches.",
    features: [
      "Wild forest Kashmir",
      "100% pure — no adulteration",
      "Cold-extracted",
      "500g glass jar",
    ],
    materials: "Raw wild honey.",
    care: "Store cool and dry.",
    tag: "Limited",
  },
  {
    slug: "sabr-watch-green",
    name: "SABR Green Dial Watch",
    collection: "watches",
    gender: "unisex",
    price: 3500,
    rating: 0,
    reviews: 0,
    images: [sabrWatchGreen],
    colors: [{ name: "Green Dial", swatch: "#174d3b" }],
    sizes: ["Standard"],
    short: "A brushed steel everyday watch with a deep green Arabic numeral dial.",
    description:
      "A brushed steel everyday watch with a deep green dial, Eastern Arabic numerals, and a compact square case.",
    features: ["Arabic numeral dial", "Brushed steel bracelet", "Quartz movement", "Date window"],
    materials: "Brushed metal case and adjustable steel bracelet.",
    care: "Keep dry and wipe with a soft cloth after wear.",
  },
  {
    slug: "sabr-watch-blue",
    name: "SABR Blue Dial Watch",
    collection: "watches",
    gender: "unisex",
    price: 3500,
    rating: 0,
    reviews: 0,
    images: [sabrWatchBlue],
    colors: [{ name: "Blue Dial", swatch: "#426879" }],
    sizes: ["Standard"],
    short: "A brushed steel everyday watch with a blue Arabic numeral dial.",
    description:
      "A brushed steel everyday watch with a muted blue dial, Eastern Arabic numerals, and a compact square case.",
    features: ["Arabic numeral dial", "Brushed steel bracelet", "Quartz movement", "Date window"],
    materials: "Brushed metal case and adjustable steel bracelet.",
    care: "Keep dry and wipe with a soft cloth after wear.",
    tag: "New",
  },
  {
    slug: "sabr-watch-black",
    name: "SABR Black Dial Watch",
    collection: "watches",
    gender: "unisex",
    price: 3500,
    rating: 0,
    reviews: 0,
    images: [sabrWatchBlack],
    colors: [{ name: "Black Dial", swatch: "#111111" }],
    sizes: ["Standard"],
    short: "A brushed steel everyday watch with a black Arabic numeral dial.",
    description:
      "A brushed steel everyday watch with a black dial, Eastern Arabic numerals, and a compact square case.",
    features: ["Arabic numeral dial", "Brushed steel bracelet", "Quartz movement", "Date window"],
    materials: "Brushed metal case and adjustable steel bracelet.",
    care: "Keep dry and wipe with a soft cloth after wear.",
    tag: "Bestseller",
  },
  {
    slug: "sabr-watch-white",
    name: "SABR White Dial Watch",
    collection: "watches",
    gender: "unisex",
    price: 3500,
    rating: 0,
    reviews: 0,
    images: [sabrWatchWhite],
    colors: [{ name: "White Dial", swatch: "#f1eee7" }],
    sizes: ["Standard"],
    short: "A brushed steel everyday watch with a white Arabic numeral dial.",
    description:
      "A brushed steel everyday watch with a clean white dial, Eastern Arabic numerals, and a compact square case.",
    features: ["Arabic numeral dial", "Brushed steel bracelet", "Quartz movement", "Date window"],
    materials: "Brushed metal case and adjustable steel bracelet.",
    care: "Keep dry and wipe with a soft cloth after wear.",
    tag: "New",
  },
];

export function getProduct(slug: string) {
  return catalog.find((p) => p.slug === slug);
}
export function byCollection(c: Collection) {
  return catalog.filter((p) => p.collection === c);
}
export function byGender(g: Gender) {
  return catalog.filter((p) => p.gender === g || p.gender === "unisex");
}
export function related(slug: string, n = 4) {
  const p = getProduct(slug);
  if (!p) return [];
  return catalog.filter((x) => x.slug !== slug && x.collection === p.collection).slice(0, n);
}
