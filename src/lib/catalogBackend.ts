import { catalog, type Collection, type Gender, type Product } from "@/lib/products";

export type BackendProduct = {
  id?: string;
  name: string;
  slug?: string | null;
  short_description?: string | null;
  description?: string | null;
  price?: number | null;
  price_inr?: number | null;
  sale_price?: number | null;
  sale_price_inr?: number | null;
  stock_quantity?: number | null;
  category?: string | null;
  category_id?: string | null;
  tags?: string[] | null;
  cover_image_url?: string | null;
  images?: string[] | null;
  color_options?: string[] | null;
  size_options?: string[] | null;
  option_types?: Array<{ name?: string; values?: string[] }> | null;
  badge?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;
  is_new_arrival?: boolean | null;
  is_bestseller?: boolean | null;
  is_on_sale?: boolean | null;
  in_stock?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const collectionLabels: Record<Collection, string> = {
  shemaghs: "Shemaghs",
  niqabs: "Niqabs",
  kufis: "Kufis",
  gloves: "Gloves",
  honey: "Honey",
};

function tagForProduct(product: Product) {
  if (product.tag === "Bestseller") return ["bestseller"];
  if (product.tag === "New") return ["new"];
  if (product.tag === "Limited") return ["limited"];
  return [];
}

export function localProductToBackend(product: Product): BackendProduct {
  const regularPrice = product.compareAt ?? product.price;
  const isOnSale = Boolean(product.compareAt && product.compareAt > product.price);
  return {
    id: product.id ?? product.slug,
    name: product.name,
    slug: product.slug,
    short_description: product.short,
    description: product.description,
    price: regularPrice,
    price_inr: regularPrice,
    sale_price: isOnSale ? product.price : null,
    sale_price_inr: isOnSale ? product.price : null,
    stock_quantity: 50,
    category: collectionLabels[product.collection],
    category_id: product.collection,
    tags: [product.gender, ...tagForProduct(product)],
    cover_image_url: product.images[0] ?? null,
    images: product.images,
    color_options: product.colors?.map((color) => color.name) ?? [],
    size_options: product.sizes ?? [],
    option_types: [
      ...(product.colors?.length
        ? [{ name: "Colour", values: product.colors.map((c) => c.name) }]
        : []),
      ...(product.sizes?.length ? [{ name: "Size", values: product.sizes }] : []),
    ],
    badge: product.tag ?? null,
    rating: product.rating,
    reviews_count: product.reviews,
    is_active: true,
    is_featured: product.tag === "Bestseller",
    is_new_arrival: product.tag === "New",
    is_bestseller: product.tag === "Bestseller",
    is_on_sale: isOnSale,
    in_stock: true,
  };
}

function collectionFromBackend(product: BackendProduct, fallback?: Product): Collection {
  const raw = `${product.category_id ?? ""} ${product.category ?? ""}`.toLowerCase();
  if (raw.includes("shemagh")) return "shemaghs";
  if (raw.includes("niqab")) return "niqabs";
  if (raw.includes("kufi")) return "kufis";
  if (raw.includes("glove")) return "gloves";
  if (raw.includes("honey")) return "honey";
  return fallback?.collection ?? "shemaghs";
}

function genderFromBackend(
  product: BackendProduct,
  collection: Collection,
  fallback?: Product,
): Gender {
  const tags = (product.tags ?? []).map((tag) => tag.toLowerCase());
  if (tags.includes("women")) return "women";
  if (tags.includes("men")) return "men";
  if (tags.includes("unisex")) return "unisex";
  if (collection === "niqabs") return "women";
  if (collection === "shemaghs" || collection === "kufis") return "men";
  return fallback?.gender ?? "unisex";
}

function tagFromBackend(product: BackendProduct, fallback?: Product): Product["tag"] {
  const badge = String(product.badge ?? "").toLowerCase();
  if (product.is_bestseller || badge.includes("best")) return "Bestseller";
  if (product.is_new_arrival || badge.includes("new")) return "New";
  if (badge.includes("limited")) return "Limited";
  return fallback?.tag;
}

export function backendProductToProduct(product: BackendProduct): Product {
  const fallbackSlug = product.slug === "yemeni-shemagh" ? "yemeni-shemagh-red" : product.slug;
  const fallback = catalog.find((item) => item.slug === fallbackSlug);
  const collection = collectionFromBackend(product, fallback);
  const gender = genderFromBackend(product, collection, fallback);
  const regular = Number(product.price_inr ?? product.price ?? fallback?.price ?? 0);
  const sale = Number(product.sale_price_inr ?? product.sale_price ?? 0);
  const hasSale = sale > 0 && sale < regular;
  const images = [
    product.cover_image_url,
    ...(Array.isArray(product.images) ? product.images : []),
  ].filter((src): src is string => Boolean(src));

  return {
    id: product.id,
    slug: product.slug || fallback?.slug || product.id || "",
    name: product.name || fallback?.name || "Product",
    collection,
    gender,
    price: hasSale ? sale : regular,
    compareAt: hasSale ? regular : fallback?.compareAt,
    rating: Number(product.rating ?? (product.id ? 0 : fallback?.rating) ?? 0),
    reviews: Number(product.reviews_count ?? (product.id ? 0 : fallback?.reviews) ?? 0),
    images: images.length ? Array.from(new Set(images)) : (fallback?.images ?? []),
    colors:
      product.color_options?.map((name) => ({
        name,
        swatch: fallback?.colors?.find((color) => color.name.toLowerCase() === name.toLowerCase())
          ?.swatch,
      })) ?? fallback?.colors,
    sizes: product.size_options?.length ? product.size_options : fallback?.sizes,
    short: product.short_description || fallback?.short || "",
    description: product.description || fallback?.description || product.short_description || "",
    features: fallback?.features ?? [],
    materials: fallback?.materials ?? "",
    care: fallback?.care ?? "",
    tag: tagFromBackend(product, fallback),
    inStock: product.in_stock !== false && Number(product.stock_quantity ?? 1) > 0,
    stockQuantity: Number(product.stock_quantity ?? 0),
  };
}

export const localBackendProducts = catalog.map(localProductToBackend);
