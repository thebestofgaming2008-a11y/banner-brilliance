import honeyAcacia from "@/assets/product-photos/honey-kashmir-acacia.jpg";
import honeyBlack from "@/assets/product-photos/honey-kashmir-black.jpg";
import honeyMulti from "@/assets/product-photos/honey-kashmir-multiflora.jpg";
import kufiFront from "@/assets/product-photos/kufi-front.jpg";
import kufiSide from "@/assets/product-photos/kufi-side.jpg";
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
import type { Product } from "@/lib/products";
import { useCatalogProduct, useCatalogProducts } from "@/services/productService";

export type StoreCollection = "Shemaghs" | "Niqabs" | "Kufis" | "Honey" | "Watches" | "Gloves";

export type StoreProduct = {
  id?: string;
  slug: string;
  name: string;
  collection: StoreCollection;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  images: string[];
  description?: string;
  details?: string[];
  options?: string[];
  optionGroups?: Array<{ name: string; values: string[] }>;
  badge?: string;
  imageClassName?: string;
  mediaFit?: "cover" | "contain";
  inStock?: boolean;
};

export const storeProducts: StoreProduct[] = [
  {
    slug: "yemeni-shemagh-red",
    name: "Yemeni Shemagh - Red & White",
    collection: "Shemaghs",
    price: 2200,
    compareAt: 2800,
    rating: 4.9,
    reviews: 1240,
    images: [shemaghRedFull, shemaghRedFront, shemaghManBack],
    description:
      "A heritage red-and-white shemagh with a soft hand, generous drape, and traditional woven character.",
    details: [
      "Breathable woven fabric",
      "Full traditional size",
      "Finished edges",
      "Suitable for daily and occasion wear",
    ],
    options: ["Standard", "Large"],
    badge: "Bestseller",
    imageClassName: "origin-bottom scale-[1.12] translate-y-[2%]",
  },
  {
    slug: "ivory-embroidered-shemagh",
    name: "Ivory Embroidered Shemagh",
    collection: "Shemaghs",
    price: 2400,
    rating: 4.8,
    reviews: 312,
    images: [shemaghIvorySideFront, shemaghProfile, shemaghRearSide, shemaghBackCover],
    description:
      "An ivory shemagh finished with refined rose-red embroidery for a quieter, elevated look.",
    details: [
      "Lightweight ivory cloth",
      "Embroidered border",
      "Soft structured drape",
      "Presented in signature packaging",
    ],
    options: ["Standard", "Large"],
    badge: "New",
    imageClassName: "origin-bottom scale-[1.14] translate-y-[3%]",
  },
  {
    slug: "khadija-niqab",
    name: "Khadija Niqab",
    collection: "Niqabs",
    price: 650,
    rating: 4.9,
    reviews: 986,
    images: [niqabKhadijaFull, niqabKhadijaClose, niqabKhadijaSide, niqabKhadijaBack],
    description:
      "A two-layer chiffon niqab designed for clean coverage, comfortable wear, and an elegant long drape.",
    details: [
      "Soft breathable chiffon",
      "Two-layer construction",
      "Comfortable tie-back fit",
      "Opaque front panel",
    ],
    options: ["Black"],
    badge: "Bestseller",
    imageClassName: "origin-bottom scale-[1.14] translate-y-[3%]",
  },
  {
    slug: "rouge-niqab",
    name: "Rouge Niqab",
    collection: "Niqabs",
    price: 720,
    rating: 4.8,
    reviews: 214,
    images: [niqabRedFront, niqabRedAngle],
    description:
      "Premium chiffon in a deep rouge tone, cut for fluid coverage and an understated colour statement.",
    details: ["Premium chiffon", "Long front coverage", "Tie-back fit", "Deep rouge colour"],
    options: ["Rouge"],
    badge: "New",
    imageClassName: "origin-bottom scale-[1.16] translate-y-[4%]",
  },
  {
    slug: "white-kufi",
    name: "White Woven Kufi",
    collection: "Kufis",
    price: 450,
    rating: 4.7,
    reviews: 148,
    images: [kufiFront, kufiSide],
    description:
      "A clean white kufi with breathable openwork and a structured band for reliable everyday wear.",
    details: [
      "Breathable openwork crown",
      "Structured cotton band",
      "Lightweight feel",
      "Easy-care white finish",
    ],
    options: ["56 cm", "58 cm", "60 cm"],
    imageClassName: "origin-bottom scale-[1.16] translate-y-[4%]",
  },
  {
    slug: "kashmir-multiflora-honey",
    name: "Kashmir Multi-Flora Honey 500g",
    collection: "Honey",
    price: 850,
    rating: 4.9,
    reviews: 621,
    images: [honeyMulti],
    description:
      "Raw highland honey gathered from diverse Kashmiri blossoms, with a rounded floral finish.",
    details: [
      "Single-origin Kashmir harvest",
      "Raw and unblended",
      "500 g glass jar",
      "Naturally crystallises over time",
    ],
    badge: "Bestseller",
  },
  {
    slug: "kashmir-acacia-honey",
    name: "Kashmir Acacia Honey 500g",
    collection: "Honey",
    price: 900,
    rating: 4.8,
    reviews: 187,
    images: [honeyAcacia],
    description:
      "Light and delicately floral acacia honey with a clean finish and slow crystallisation.",
    details: [
      "Acacia blossom harvest",
      "Raw and unblended",
      "500 g glass jar",
      "Light floral profile",
    ],
    badge: "New",
  },
  {
    slug: "kashmir-black-honey",
    name: "Kashmir Wild Black Honey 500g",
    collection: "Honey",
    price: 1200,
    rating: 4.9,
    reviews: 92,
    images: [honeyBlack],
    description:
      "A rare dark-forest honey with deep mineral character and an intense, lingering finish.",
    details: [
      "Limited forest harvest",
      "Raw and unblended",
      "500 g glass jar",
      "Deep robust profile",
    ],
    badge: "Limited",
  },
];

export function formatPrice(price: number) {
  return `Rs. ${price.toLocaleString()}`;
}

export function getProduct(slug: string) {
  return storeProducts.find((product) => product.slug === slug);
}

const collectionLabels: Record<Product["collection"], StoreCollection> = {
  shemaghs: "Shemaghs",
  niqabs: "Niqabs",
  kufis: "Kufis",
  gloves: "Gloves",
  honey: "Honey",
  watches: "Watches",
};

export function toStoreProduct(product: Product): StoreProduct {
  const visualSlug = product.slug === "yemeni-shemagh" ? "yemeni-shemagh-red" : product.slug;
  const visualFallback = storeProducts.find((item) => item.slug === visualSlug);
  const optionGroups = [
    ...(product.colors?.length
      ? [{ name: "Colour", values: product.colors.map((colour) => colour.name) }]
      : []),
    ...(product.sizes?.length ? [{ name: "Size", values: product.sizes }] : []),
  ];
  const hasVerifiedRating = Boolean(
    product.id && product.id !== product.slug && product.reviews > 0,
  );

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    collection: collectionLabels[product.collection],
    price: product.price,
    compareAt: product.compareAt,
    rating: hasVerifiedRating ? product.rating : 0,
    reviews: hasVerifiedRating ? product.reviews : 0,
    images: product.images,
    description: product.description || product.short,
    details: product.features,
    options: optionGroups[0]?.values,
    optionGroups,
    badge: product.tag,
    imageClassName: visualFallback?.imageClassName,
    mediaFit: product.collection === "watches" ? "contain" : visualFallback?.mediaFit,
    inStock: product.inStock !== false,
  };
}

export function useStoreProducts() {
  const catalog = useCatalogProducts();
  return {
    products: catalog.products.map(toStoreProduct),
    loading: catalog.loading,
  };
}

export function useStoreProduct(slug: string) {
  const product = useCatalogProduct(slug);
  return product ? toStoreProduct(product) : null;
}
