import honeyAcacia from "@/assets/product-photos/honey-kashmir-acacia.webp";
import honeyBlack from "@/assets/product-photos/honey-kashmir-black.webp";
import honeyMulti from "@/assets/product-photos/honey-kashmir-multiflora.webp";
import kufiFront from "@/assets/product-photos/kufi-front.webp";
import kufiSide from "@/assets/product-photos/kufi-side.webp";
import niqabKhadijaBack from "@/assets/product-photos/niqab-khadija-back.webp";
import niqabKhadijaClose from "@/assets/product-photos/niqab-khadija-close.webp";
import niqabKhadijaFull from "@/assets/product-photos/niqab-khadija-full.webp";
import niqabKhadijaSide from "@/assets/product-photos/niqab-khadija-side.webp";
import niqabRedAngle from "@/assets/product-photos/niqab-red-angle.webp";
import niqabRedFront from "@/assets/product-photos/niqab-red-front.webp";
import shemaghBackCover from "@/assets/product-photos/shemagh-back-cover.webp";
import shemaghIvorySideFront from "@/assets/product-photos/shemagh-ivory-side-front.webp";
import shemaghManBack from "@/assets/product-photos/shemagh-man-back.webp";
import shemaghProfile from "@/assets/product-photos/shemagh-profile.webp";
import shemaghRearSide from "@/assets/product-photos/shemagh-rear-side.webp";
import shemaghRedFront from "@/assets/product-photos/shemagh-red-front.webp";
import shemaghRedFull from "@/assets/product-photos/shemagh-red-full.webp";
import { createContext, createElement, useContext, type ReactNode } from "react";
import type { Product } from "@/lib/products";
import { useCatalogProduct, useCatalogProducts } from "@/services/productService";

export type StoreCollection = string;

export type StoreProduct = {
  id?: string;
  slug: string;
  name: string;
  collection: StoreCollection;
  collectionSlug?: string;
  filterTags?: string[];
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
  mediaPosition?: string;
  inStock?: boolean;
  stockQuantity?: number;
};

export function isPreOrderProduct(product: Pick<StoreProduct, "badge">) {
  return /^pre[\s-]?order$/i.test(product.badge?.trim() ?? "");
}

export const storeProducts: StoreProduct[] = [
  {
    slug: "yemeni-shemagh-red",
    name: "Yemeni Shemagh - Red & White",
    collection: "Shemaghs",
    price: 2200,
    compareAt: 2800,
    rating: 0,
    reviews: 0,
    images: [shemaghRedFull, shemaghRedFront, shemaghManBack],
    description:
      "A heritage red-and-white shemagh with a soft hand, generous drape, and traditional woven character.",
    details: [
      "Breathable woven fabric",
      "Full traditional size",
      "Finished edges",
      "Suitable for daily and occasion wear",
    ],
    optionGroups: [
      { name: "Colour", values: ["Brown", "Purple", "Blue", "Red"] },
      { name: "Size", values: ["60 x 60 cm"] },
    ],
    options: ["Brown", "Purple", "Blue", "Red"],
    badge: "Bestseller",
    imageClassName: "origin-bottom scale-[1.12] translate-y-[2%]",
  },
  {
    slug: "ivory-embroidered-shemagh",
    name: "Ivory Embroidered Shemagh",
    collection: "Shemaghs",
    price: 2400,
    rating: 0,
    reviews: 0,
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
    rating: 0,
    reviews: 0,
    images: [niqabKhadijaFull, niqabKhadijaClose, niqabKhadijaSide, niqabKhadijaBack],
    description: "Daily comfort wear.",
    details: ["Premium chiffon fabric"],
    options: ["Black"],
    optionGroups: [
      { name: "Colour", values: ["Black"] },
      {
        name: "Size",
        values: ["One Size - Layers: 54 / 34 in; Veil: 22.5 x 13.5 in; Gear: 82 in"],
      },
    ],
    badge: "Bestseller",
    imageClassName: "origin-bottom scale-[1.14] translate-y-[3%]",
  },
  {
    slug: "rouge-niqab",
    name: "Rouge Niqab",
    collection: "Niqabs",
    price: 720,
    rating: 0,
    reviews: 0,
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
    rating: 0,
    reviews: 0,
    images: [kufiFront, kufiSide],
    description:
      "A clean white kufi with breathable openwork and a structured band for reliable everyday wear.",
    details: [
      "Breathable openwork crown",
      "Structured cotton band",
      "Lightweight feel",
      "Easy-care white finish",
    ],
    options: ["White"],
    optionGroups: [
      { name: "Colour", values: ["White"] },
      { name: "Size", values: ["Free Size"] },
    ],
    imageClassName: "origin-bottom scale-[1.16] translate-y-[4%]",
  },
  {
    slug: "kashmir-multiflora-honey",
    name: "Kashmir Multi-Flora Honey 500g",
    collection: "Honey",
    price: 850,
    rating: 0,
    reviews: 0,
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
    rating: 0,
    reviews: 0,
    images: [honeyAcacia],
    description: "Light and delicately floral acacia honey, kept unheated for a clean finish.",
    details: ["Acacia blossom harvest", "Raw and unblended", "500 g glass jar", "Unheated"],
    badge: "New",
  },
  {
    slug: "kashmir-black-honey",
    name: "Kashmir Wild Black Honey 500g",
    collection: "Honey",
    price: 1200,
    rating: 0,
    reviews: 0,
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

const featuredProductOrder = [
  "yemeni-shemagh",
  "yemeni-shemagh-red",
  "khadija-niqab",
  "kashmir-multiflora-honey",
  "sabr-watch-green",
  "white-kufi",
  "rouge-niqab",
  "sabr-watch-black",
  "kashmir-acacia-honey",
  "sabr-watch-blue",
  "kashmir-black-honey",
  "sabr-watch-white",
];

const featuredProductRank = new Map(featuredProductOrder.map((slug, index) => [slug, index]));

export function merchandiseProducts(products: StoreProduct[]) {
  return [...products].sort((a, b) => {
    const aRank = featuredProductRank.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bRank = featuredProductRank.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.name.localeCompare(b.name);
  });
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
  other: "Other",
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
    collection: product.collectionLabel || collectionLabels[product.collection],
    collectionSlug: product.collectionSlug || product.collection,
    filterTags: product.filterTags ?? [],
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
    imageClassName: visualFallback?.images.includes(product.images[0])
      ? visualFallback.imageClassName
      : undefined,
    mediaFit: product.mediaFit ?? visualFallback?.mediaFit ?? "cover",
    mediaPosition: product.mediaPosition ?? "center",
    inStock:
      product.inStock !== false &&
      (product.stockQuantity === undefined || product.stockQuantity > 0),
    stockQuantity: product.stockQuantity,
  };
}

export function useStoreProducts() {
  const providedProducts = useContext(StoreProductsContext);
  const catalog = useCatalogProducts(providedProducts ?? undefined);
  return {
    products: catalog.products.map(toStoreProduct),
    loading: catalog.loading,
  };
}

const StoreProductsContext = createContext<Product[] | null>(null);

export function StoreProductsProvider({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  return createElement(StoreProductsContext.Provider, { value: products }, children);
}

export function useStoreProduct(slug: string) {
  const product = useCatalogProduct(slug);
  return product ? toStoreProduct(product) : null;
}
