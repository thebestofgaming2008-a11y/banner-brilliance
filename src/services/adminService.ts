import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { convex } from "@/integrations/convex/client";
import type { Product } from "./productService";

export const PRODUCT_BUCKET = "product-images";

export interface ProductInput {
  name: string;
  slug?: string | null;
  short_description?: string | null;
  description?: string | null;
  author?: string | null;
  publisher?: string | null;
  language?: string | null;
  pages?: number | null;
  isbn?: string | null;
  binding?: string | null;
  edition?: string | null;
  weight_g?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  shipping_class?: string | null;
  weight_source_url?: string | null;
  weight_confidence?: string | null;
  price?: number;
  price_inr: number;
  sale_price?: number | null;
  sale_price_inr?: number | null;
  sku?: string | null;
  stock_quantity?: number | null;
  category?: string | null;
  category_id?: string | null;
  highlights?: string[] | null;
  cover_image_url?: string | null;
  images?: string[];
  media_fit?: "cover" | "contain" | null;
  media_position?: string | null;
  hidden_image_urls?: string[];
  linked_product_ids?: string[];
  variant_label?: string | null;
  color_options?: string[] | null;
  size_options?: string[] | null;
  option_types?: Array<{ name: string; values: string[] }> | null;
  badge?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  show_in_category_section?: boolean;
  is_bestseller?: boolean;
  is_new_arrival?: boolean;
  is_on_sale?: boolean;
  tags?: string[];
}

export async function listAllProducts(): Promise<Product[]> {
  return (await convex.query(api.products.listAllProducts, {})) as Product[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function createProduct(input: ProductInput): Promise<Product | null> {
  const payload = {
    ...input,
    slug: input.slug || slugify(input.name) || null,
    price: input.price ?? input.price_inr,
  };
  return (await convex.mutation(api.products.createProduct, payload)) as Product | null;
}

export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>,
): Promise<Product | null> {
  const next: Record<string, unknown> = { ...patch };
  if (patch.price_inr != null && patch.price == null) next.price = patch.price_inr;
  return (await convex.mutation(api.products.updateProduct, { id, patch: next })) as Product | null;
}

export interface DeleteProductResult {
  deleted: boolean;
  wishlistItems: number;
  reviews: number;
  linkedProducts: number;
  pausedGiftCampaigns?: number;
}

export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  return await convex.mutation(api.products.deleteProduct, { id: id as Id<"products"> });
}

export async function refreshPublicCatalog(product?: Pick<Product, "id" | "slug"> | null) {
  if (typeof window === "undefined") return;
  const version = Date.now().toString();
  window.localStorage.setItem("fawzaan.catalogVersion", version);
  const requests = [
    `/api/catalog/products?refresh=${encodeURIComponent(version)}`,
    `/api/catalog/presentation?refresh=${encodeURIComponent(version)}`,
  ];
  if (product?.id)
    requests.push(
      `/api/catalog/product?id=${encodeURIComponent(product.id)}&refresh=${encodeURIComponent(version)}`,
    );
  if (product?.slug)
    requests.push(
      `/api/catalog/product?slug=${encodeURIComponent(product.slug)}&refresh=${encodeURIComponent(version)}`,
    );

  await Promise.allSettled(
    requests.map((url) =>
      fetch(url, {
        cache: "no-store",
        headers: { accept: "application/json" },
      }),
    ),
  );
}

export async function uploadProductImage(file: File): Promise<string | null> {
  const uploadFile = await optimizeProductImage(file);
  const contentType = inferProductMediaType(uploadFile);
  if (uploadFile.size > 25 * 1024 * 1024) {
    throw new Error("Product media must be 25 MB or smaller.");
  }
  if (!contentType) {
    throw new Error(
      "Upload JPG, PNG, WebP, AVIF, GIF, MP4, or WebM. HEIC/HEIF phone photos must be exported as JPG first.",
    );
  }

  const media = await convex.action(api.media.createProductMediaUpload, {
    fileName: uploadFile.name || "product-media",
    contentType,
    size: uploadFile.size,
  });
  const uploadUrl =
    typeof window === "undefined"
      ? media.uploadUrl
      : new URL("/api/media/upload", window.location.origin).toString();
  const result = await fetch(uploadUrl, {
    method: media.method ?? "POST",
    headers: {
      "Content-Type": media.headers.contentType,
      "x-file-name": media.headers.fileName,
      "x-file-size": media.headers.fileSize,
      "x-admin-upload-token": media.headers.adminUploadToken,
    },
    body: uploadFile,
  });
  if (!result.ok) {
    const payload = (await result.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Upload failed with status ${result.status}.`);
  }
  const payload = (await result.json().catch(() => null)) as { url?: string } | null;
  const url = media.publicUrl || payload?.url;
  if (!url) throw new Error("Upload finished, but no media URL was returned.");
  return `${url}#${encodeURIComponent(uploadFile.name)}`;
}

const PRODUCT_IMAGE_MAX_EDGE = 1800;
const PRODUCT_IMAGE_TARGET_BYTES = 700 * 1024;

async function optimizeProductImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/avif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PRODUCT_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const encode = (quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    let blob = await encode(0.84);
    if (blob && blob.size > PRODUCT_IMAGE_TARGET_BYTES) blob = await encode(0.76);
    if (!blob || (blob.size >= file.size && scale === 1)) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "product-image";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

function inferProductMediaType(file: File) {
  const declared = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (SUPPORTED_PRODUCT_MEDIA_TYPES.has(declared)) return declared;

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  return PRODUCT_MEDIA_TYPES_BY_EXTENSION[extension] ?? null;
}

const SUPPORTED_PRODUCT_MEDIA_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

const PRODUCT_MEDIA_TYPES_BY_EXTENSION: Record<string, string | null> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  heic: null,
  heif: null,
  mov: null,
  m4v: null,
};

export interface ShippingRate {
  id: string;
  carrier: string;
  zone: string;
  method: string;
  base_fee: number;
  per_item_fee: number;
  per_weight_fee: number;
  is_active: boolean;
  updated_at: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  section: string;
}

export interface AdminShippingAddress {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export async function listShippingRates(): Promise<ShippingRate[]> {
  let rows = (await convex.query(api.admin.listShippingRates, {})) as ShippingRate[];
  if (!rows.length) {
    await convex.mutation(api.admin.seedShippingDefaults, {});
    rows = (await convex.query(api.admin.listShippingRates, {})) as ShippingRate[];
  }
  return rows;
}

export async function updateShippingRate(
  id: string,
  patch: Partial<ShippingRate>,
): Promise<ShippingRate | null> {
  return (await convex.mutation(api.admin.updateShippingRate, {
    id: id as Id<"shipping_rates">,
    patch,
  })) as ShippingRate | null;
}

export async function getStoreSettings(): Promise<Record<string, unknown>> {
  return (await convex.query(api.admin.getStoreSettings, {})) as Record<string, unknown>;
}

export async function saveStoreSettings(settings: Record<string, unknown>): Promise<boolean> {
  return await convex.mutation(api.admin.saveStoreSettings, { settings });
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  type: string;
  description?: string | null;
  parent_slug?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function listCategories(type?: string): Promise<AdminCategory[]> {
  return (await convex.query(api.admin.listCategories, { type })) as AdminCategory[];
}

export async function upsertCategory(input: {
  slug?: string | null;
  name: string;
  type?: string;
  description?: string | null;
  parent_slug?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
}): Promise<AdminCategory | null> {
  return (await convex.mutation(api.admin.upsertCategory, input)) as AdminCategory | null;
}

export async function removeCategory(id: string): Promise<{
  removed: boolean;
  updatedProducts: number;
  pausedGiftCampaigns?: number;
  slug: string | null;
}> {
  return await convex.mutation(api.admin.removeCategory, { id: id as Id<"categories"> });
}

export async function seedDefaultCategories(): Promise<boolean> {
  return await convex.mutation(api.admin.seedDefaultCategories, {});
}

export interface StorefrontBanner {
  id: string;
  placement:
    | "homepage_hero"
    | "homepage_collection"
    | "homepage_promo"
    | "shop_hero"
    | "shop_promo"
    | string;
  category_slug?: string | null;
  eyebrow?: string | null;
  title: string;
  body?: string | null;
  button_label?: string | null;
  button_url?: string | null;
  image_url: string;
  background_color?: string | null;
  image_position?: "center" | "top" | "bottom" | string | null;
  overlay_image_url?: string | null;
  overlay_position?: "left" | "center" | "right" | string | null;
  overlay_scale?: number | null;
  content_alignment?: "left" | "center" | "right" | string | null;
  text_theme?: "dark" | "light" | string | null;
  product_limit?: number | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function listStorefrontBanners(): Promise<StorefrontBanner[]> {
  return (await convex.query(api.admin.listStorefrontBanners, {})) as StorefrontBanner[];
}

export async function upsertStorefrontBanner(
  input: Omit<StorefrontBanner, "id" | "created_at" | "updated_at"> & { id?: string },
): Promise<StorefrontBanner | null> {
  const payload = { ...input, is_active: input.is_active ?? undefined };
  return (await convex.mutation(
    api.admin.upsertStorefrontBanner,
    payload,
  )) as StorefrontBanner | null;
}

export async function archiveStorefrontBanner(id: string): Promise<boolean> {
  return await convex.mutation(api.admin.archiveStorefrontBanner, { id });
}

export async function deleteStorefrontBanner(id: string): Promise<boolean> {
  return await convex.mutation(api.admin.deleteStorefrontBanner, { id });
}

export async function reorderStorefrontBanners(ids: string[]): Promise<number> {
  return await convex.mutation(api.admin.reorderStorefrontBanners, { ids });
}

export async function restoreDefaultHomepageHero(): Promise<number> {
  return await convex.mutation(api.admin.restoreDefaultHomepageHero, {});
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  minimum_subtotal: number | null;
  maximum_discount: number | null;
  scope_type: "all" | "products";
  product_ids: string[];
  storefront_enabled: boolean;
  storefront_title: string | null;
  storefront_message: string | null;
  storefront_badge: string | null;
  storefront_button_label: string | null;
  storefront_button_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PromotionInput = Omit<Promotion, "id" | "used_count" | "created_at" | "updated_at">;

function promotionServiceError(error: unknown) {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === "string" && data.trim()) return data;
  }
  return error instanceof Error ? error.message : "Promotion request failed.";
}

export async function listPromotions(): Promise<Promotion[]> {
  return (await convex.query(api.promotions.listAdmin, {})) as Promotion[];
}

export async function savePromotion(input: PromotionInput, id?: string): Promise<Promotion> {
  try {
    return (await convex.mutation(api.promotions.save, {
      ...input,
      product_ids: input.product_ids as Id<"products">[],
      id: id ? (id as Id<"discounts">) : undefined,
    })) as Promotion;
  } catch (error) {
    throw new Error(promotionServiceError(error));
  }
}

export async function deletePromotion(id: string): Promise<boolean> {
  try {
    return await convex.mutation(api.promotions.remove, {
      id: id as Id<"discounts">,
    });
  } catch (error) {
    throw new Error(promotionServiceError(error));
  }
}

export interface GiftRequirement {
  label: string;
  scope_type: "collection" | "products" | "subtotal";
  collection_slugs: string[];
  category_ids: string[];
  product_ids: string[];
  required_quantity: number;
}

export interface GiftCampaign {
  id: string;
  name: string;
  active: boolean;
  match_mode: "all" | "any";
  requirements: GiftRequirement[];
  gift_product_id: string;
  gift_quantity: number;
  gift_color: string | null;
  gift_size: string | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  priority: number;
  combines_with_other_gifts: boolean;
  repeatable: boolean;
  max_awards_per_order: number;
  allow_discount_codes: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GiftCampaignInput = Omit<
  GiftCampaign,
  "id" | "archived_at" | "created_at" | "updated_at"
>;

export async function listGiftCampaigns(): Promise<GiftCampaign[]> {
  return (await convex.query(api.gifts.listAdmin, {})) as GiftCampaign[];
}

export async function saveGiftCampaign(
  input: GiftCampaignInput,
  id?: string,
): Promise<GiftCampaign> {
  try {
    return (await convex.mutation(api.gifts.save, {
      ...input,
      gift_product_id: input.gift_product_id as Id<"products">,
      requirements: input.requirements.map((requirement) => ({
        ...requirement,
        category_ids: requirement.category_ids as Id<"categories">[],
        product_ids: requirement.product_ids as Id<"products">[],
      })),
      id: id ? (id as Id<"gift_campaigns">) : undefined,
    })) as GiftCampaign;
  } catch (error) {
    throw new Error(promotionServiceError(error));
  }
}

export async function archiveGiftCampaign(id: string): Promise<boolean> {
  try {
    return await convex.mutation(api.gifts.remove, {
      id: id as Id<"gift_campaigns">,
    });
  } catch (error) {
    throw new Error(promotionServiceError(error));
  }
}

export interface GiftCampaignTestResult {
  id: string;
  name: string;
  earned: boolean;
  eligible: boolean;
  progress: number;
  gift_available: boolean;
  blocked_reason: string | null;
  requirements: Array<{
    label: string;
    required_quantity: number;
    current_quantity: number;
    complete: boolean;
  }>;
  gift: { name: string; quantity: number };
}

export async function testGiftCampaign(
  id: string,
  cart: Array<{ product_id: string; quantity: number }>,
): Promise<GiftCampaignTestResult | null> {
  return (await convex.query(api.gifts.testCampaign, {
    id: id as Id<"gift_campaigns">,
    cart: cart.map((line) => ({
      product_id: line.product_id as Id<"products">,
      quantity: line.quantity,
    })),
  })) as GiftCampaignTestResult | null;
}

export interface LaunchReadiness {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  counts: Record<string, number>;
  checkoutMode: string;
  samples: Record<string, string[]>;
  env: Record<string, boolean>;
}

export async function getLaunchReadiness(): Promise<LaunchReadiness> {
  return (await convex.query(api.admin.launchReadiness, {})) as LaunchReadiness;
}

export async function listAdminNotifications(): Promise<AdminNotification[]> {
  return (await convex.query(api.admin.notifications, {})) as AdminNotification[];
}

export interface AdminOrder {
  id: string;
  order_number: string | null;
  user_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: string | null;
  payment_status: string | null;
  shipping_payment_status?: string | null;
  shipping_payment_note?: string | null;
  customer_country_type?: string | null;
  shipping_address?: AdminShippingAddress | null;
  shipping_cost?: number | null;
  subtotal?: number | null;
  tax?: number | null;
  discount?: number | null;
  promotion_code?: string | null;
  currency?: string | null;
  payment_provider?: string | null;
  payment_method?: string | null;
  payment_order_id?: string | null;
  payment_id?: string | null;
  refund_status?: string | null;
  refunded_amount_inr?: number | null;
  latest_refund_id?: string | null;
  refund_updated_at?: string | null;
  whatsapp_message?: string | null;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  total: number;
  total_inr: number | null;
  created_at: string | null;
  updated_at?: string | null;
  items?: Array<{
    id: string;
    product_id?: string | null;
    product_name?: string | null;
    product_image_url?: string | null;
    selected_color?: string | null;
    selected_size?: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    is_gift?: boolean | null;
    gift_campaign_id?: string | null;
    gift_campaign_name?: string | null;
  }>;
}

export async function listAllOrders(limit = 100): Promise<AdminOrder[]> {
  return (await convex.query(api.orders.listAll, { limit })) as AdminOrder[];
}

export interface PaymentRecovery {
  id: string;
  razorpay_order_id: string;
  payment_id: string | null;
  status: string;
  customer: { name?: string; email?: string; phone?: string };
  amount_paise: number;
  error: string | null;
  updated_at: string;
}

export async function listPaymentRecoveries(): Promise<PaymentRecovery[]> {
  return (await convex.query(api.orders.listPaymentRecoveries, {})) as PaymentRecovery[];
}

export async function retryPaymentRecovery(razorpayOrderId: string): Promise<{
  status: "completed" | "not_captured" | "recovery_required";
  order: AdminOrder | null;
}> {
  return (await convex.action(api.orders.retryPaymentRecovery, {
    razorpay_order_id: razorpayOrderId,
  })) as {
    status: "completed" | "not_captured" | "recovery_required";
    order: AdminOrder | null;
  };
}

export async function updateOrderStatus(id: string, status: string): Promise<boolean> {
  return await convex.mutation(api.orders.updateStatus, { id, status });
}

export async function updateOrderTracking(
  id: string,
  payload: { carrier?: string | null; trackingNumber: string; trackingUrl?: string | null },
): Promise<AdminOrder | null> {
  return (await convex.mutation(api.orders.updateTracking, {
    id,
    ...payload,
  })) as AdminOrder | null;
}

export interface AdminCustomer {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  marketing_consent?: boolean | null;
  total_orders: number | null;
  total_spent: number | null;
  created_at: string | null;
}

export async function listAllCustomers(limit = 200): Promise<AdminCustomer[]> {
  return (await convex.query(api.users.listCustomers, { limit })) as AdminCustomer[];
}

export interface MarketingCampaignInput {
  name: string;
  subject: string;
  preheader?: string | null;
  body: string;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  subject: string;
  preheader?: string | null;
  body: string;
  button_label?: string | null;
  button_url?: string | null;
  status: "draft" | "sending" | "sent" | "failed";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  error?: string | null;
  created_at: string;
  updated_at: string;
  sent_at?: string | null;
}

export type MarketingConfiguration = {
  ready: boolean;
  hasApiKey: boolean;
  hasSender: boolean;
  hasPublicSiteUrl: boolean;
  recipientCount: number;
};

export async function listMarketingCampaigns(): Promise<MarketingCampaign[]> {
  return (await convex.query(api.marketing.listCampaigns, {})) as MarketingCampaign[];
}

export async function getMarketingConfiguration(): Promise<MarketingConfiguration> {
  return (await convex.query(api.marketing.configuration, {})) as MarketingConfiguration;
}

export async function saveMarketingCampaign(
  input: MarketingCampaignInput,
  id?: string,
): Promise<string> {
  return String(
    await convex.mutation(api.marketing.saveCampaign, {
      ...input,
      id: id ? (id as Id<"marketing_campaigns">) : undefined,
    }),
  );
}

export async function deleteMarketingDraft(id: string): Promise<boolean> {
  return await convex.mutation(api.marketing.removeDraft, {
    id: id as Id<"marketing_campaigns">,
  });
}

export async function sendMarketingTest(
  email: string,
  input: MarketingCampaignInput,
): Promise<{ sent: boolean }> {
  return await convex.action(api.marketing.sendTest, { email, ...input });
}

export async function sendMarketingCampaign(id: string): Promise<{ sent: number }> {
  return await convex.action(api.marketing.sendCampaign, {
    id: id as Id<"marketing_campaigns">,
  });
}

export interface AdminReview {
  id: string;
  product_id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  media_urls: string[] | null;
  status: string;
  admin_note: string | null;
  created_at: string | null;
}

export async function listAllReviews(limit = 200): Promise<AdminReview[]> {
  return (await convex.query(api.reviews.listAll, { limit })) as AdminReview[];
}

export async function updateReviewStatus(
  id: string,
  status: "pending" | "published" | "hidden",
  adminNote?: string | null,
): Promise<boolean> {
  return await convex.mutation(api.reviews.updateStatus, {
    id,
    status,
    adminNote: adminNote ?? null,
  });
}

export async function deleteReview(id: string): Promise<boolean> {
  return await convex.mutation(api.reviews.remove, { id });
}
