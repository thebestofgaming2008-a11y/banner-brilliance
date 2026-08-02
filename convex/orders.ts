import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  action,
  httpAction,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  isAdminEmail,
  nowIso,
  publicOrder,
  requireAdmin,
  requireIdentity,
  writeAuditLog,
} from "./lib";
import { checkoutShippingForCountry } from "./shipping";
import {
  evaluatePromotion,
  normalizePromotionCode,
  releasePromotionUse,
  reservePromotionUse,
} from "./promotionRules";
import { evaluateGiftCampaigns } from "./gifts";
import { summarizeRefundLifecycle } from "./refundRules";
import {
  CHECKOUT_RECONCILIATION_INITIAL_DELAY_MS,
  CHECKOUT_RECONCILIATION_RETRY_DELAYS_MS,
  PAYMENT_TECHNICAL_RETENTION_MS,
} from "./paymentRules";

const cartItem = v.object({
  cartKey: v.optional(v.string()),
  productId: v.string(),
  qty: v.number(),
  name: v.string(),
  price: v.number(),
  priceInr: v.optional(v.union(v.number(), v.null())),
  image: v.optional(v.union(v.string(), v.null())),
  slug: v.optional(v.union(v.string(), v.null())),
  weightG: v.optional(v.union(v.number(), v.null())),
  shippingClass: v.optional(v.union(v.string(), v.null())),
  selectedColor: v.optional(v.union(v.string(), v.null())),
  selectedSize: v.optional(v.union(v.string(), v.null())),
});

const checkoutCustomer = v.object({
  email: v.string(),
  phone: v.string(),
  name: v.string(),
  address_line_1: v.string(),
  address_line_2: v.optional(v.string()),
  city: v.string(),
  state: v.optional(v.string()),
  postal_code: v.string(),
  country: v.string(),
});

const checkoutPayload = {
  cart: v.array(cartItem),
  customer: checkoutCustomer,
  subtotal: v.number(),
  shipping: v.number(),
  total: v.number(),
  promotion_code: v.optional(v.string()),
};

const ORDER_STATUSES = new Set([
  "whatsapp_pending",
  "contacted",
  "awaiting_payment",
  "paid",
  "packed",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);
const WHATSAPP_STOCK_STATUSES = new Set([
  "paid",
  "packed",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]);
const CHECKOUT_RESERVATION_MS = 30 * 60 * 1000;
const WEBHOOK_EVENT_RETENTION_MS = PAYMENT_TECHNICAL_RETENTION_MS;

function cleanText(value: string | null | undefined, max = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 160) {
  const next = cleanText(value, max);
  return next.length ? next : null;
}

function cleanLongMessage(value: string | null | undefined, max = 5000) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function messageWithOrderNumber(message: string, orderNumber: string) {
  const clean = cleanLongMessage(message);
  if (!clean) return `Order request: ${orderNumber}`;
  if (/Order request:/i.test(clean)) return clean;
  return clean.replace(/(Name:)/i, `Order request: ${orderNumber}\n$1`);
}

function requireIndiaShipping(country: string | null | undefined) {
  const shipping = checkoutShippingForCountry(country);
  if (shipping.countryType !== "india") {
    throw new Error("We currently deliver within India only.");
  }
  return shipping;
}

function productNameWithOptions(name: string, color?: string | null, size?: string | null) {
  const options = [color ? `Colour: ${color}` : "", size ? `Size: ${size}` : ""].filter(Boolean);
  return options.length ? `${name} (${options.join(", ")})` : name;
}

function cleanVariantSelection(
  value: string | null | undefined,
  allowed: string[] | null | undefined,
  label: string,
  productName: string,
) {
  const selected = cleanNullable(value, 60);
  const options = Array.isArray(allowed)
    ? allowed.map((option) => cleanText(option, 60)).filter(Boolean)
    : [];
  if (options.length === 0) return selected;
  if (!selected) throw new Error(`${label} is required for ${productName}.`);
  const match = options.find((option) => option.toLowerCase() === selected.toLowerCase());
  if (!match) throw new Error(`Invalid ${label.toLowerCase()} for ${productName}.`);
  return match;
}

function cleanEmail(value: string) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email address is required.");
  }
  return email;
}

function cleanPhone(value: string) {
  const phone = cleanText(value, 32);
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("A valid phone number is required.");
  }
  return phone;
}

function validateCheckoutCustomer(customer: {
  email: string;
  phone: string;
  name: string;
  address_line_1: string;
  city: string;
  postal_code: string;
  country: string;
}) {
  cleanEmail(customer.email);
  cleanPhone(customer.phone);
  if (
    !cleanText(customer.name, 120) ||
    !cleanText(customer.address_line_1, 180) ||
    !cleanText(customer.city, 80) ||
    !cleanText(customer.postal_code, 24) ||
    !cleanText(customer.country, 80)
  ) {
    throw new Error("Complete shipping details are required.");
  }
  requireIndiaShipping(customer.country);
}

function cleanTrackingUrl(value: string | null | undefined) {
  const url = cleanText(value, 500);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Tracking URL must start with http:// or https://.");
  }
  return url;
}

async function getCheckoutProduct(ctx: any, productId: string) {
  const id = ctx.db.normalizeId("products", cleanText(productId, 200));
  return id ? await ctx.db.get(id) : null;
}

async function nextOrderNumber(ctx: any, _entropy: string) {
  const timestamp = nowIso();
  const existing = await ctx.db
    .query("store_settings")
    .withIndex("by_key", (q: any) => q.eq("key", "order_sequence"))
    .first();
  const next = Math.max(1, Number(existing?.value ?? 0) + 1);
  if (existing) await ctx.db.patch(existing._id, { value: next, updated_at: timestamp });
  else
    await ctx.db.insert("store_settings", {
      key: "order_sequence",
      value: next,
      updated_at: timestamp,
    });
  return `#${next}`;
}

async function orderWithItems(ctx: any, order: any): Promise<Record<string, any>> {
  const items = await ctx.db
    .query("order_items")
    .withIndex("by_order_id", (q: any) => q.eq("order_id", order._id))
    .take(100);
  const legacyMessage = Array.isArray(order.items)
    ? order.items.find((item: any) => item?.type === "whatsapp_message")?.whatsapp_message
    : null;
  return {
    ...publicOrder(order),
    whatsapp_message: order.whatsapp_message ?? legacyMessage ?? null,
    items: items.map((item: any) => {
      const { _id, _creationTime, order_id, ...rest } = item;
      return { id: _id, order_id, ...rest };
    }),
  };
}

async function checkoutQuote(ctx: any, cart: Array<any>, promotionCode?: string | null) {
  if (!cart.length) throw new Error("Cart is empty.");
  if (cart.length > 100) throw new Error("A checkout can contain up to 100 product lines.");
  let subtotal = 0;
  let itemCount = 0;
  const validatedCart = [];
  for (const item of cart) {
    const qty = Math.floor(item.qty);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) throw new Error("Cart quantity is invalid.");
    const product = (await getCheckoutProduct(ctx, item.productId)) as any;
    if (!product || product.is_active === false)
      throw new Error(`Product is no longer available: ${cleanText(item.name, 80)}`);
    const stock = product.stock_quantity ?? 0;
    if (stock < qty || product.in_stock === false)
      throw new Error(`Not enough stock for ${product.name}.`);
    const unitPrice = product.sale_price_inr ?? product.price_inr ?? product.price;
    if (!Number.isFinite(unitPrice) || unitPrice < 0)
      throw new Error(`Invalid price for ${product.name}.`);
    const selectedColor = cleanVariantSelection(
      item.selectedColor,
      product.color_options,
      "Colour",
      product.name,
    );
    const selectedSize = cleanVariantSelection(
      item.selectedSize,
      product.size_options,
      "Size",
      product.name,
    );
    subtotal += unitPrice * qty;
    itemCount += qty;
    validatedCart.push({
      cartKey: cleanNullable(item.cartKey, 160) ?? undefined,
      productId: String(product._id),
      qty,
      name: cleanText(product.name, 160),
      price: unitPrice,
      priceInr: unitPrice,
      image: cleanNullable(product.cover_image_url, 1000),
      slug: cleanNullable(product.slug, 120),
      weightG: Number.isFinite(product.weight_g) ? product.weight_g : null,
      shippingClass: cleanNullable(product.shipping_class, 80),
      selectedColor,
      selectedSize,
    });
  }
  const shipping = 0;
  const promotion = await evaluatePromotion(ctx, promotionCode, validatedCart, subtotal);
  const giftOffers = await evaluateGiftCampaigns(ctx, validatedCart, Date.now(), {
    hasDiscount: Boolean(promotion),
  });
  const earnedGifts = giftOffers.filter((offer) => offer.earned);
  for (const offer of earnedGifts) {
    validatedCart.push({
      cartKey: `gift__${offer.id}`,
      productId: String(offer.gift.id),
      qty: offer.gift.quantity,
      name: offer.gift.name,
      price: 0,
      priceInr: 0,
      image: offer.gift.image,
      slug: offer.gift.slug,
      weightG: null,
      shippingClass: null,
      selectedColor: offer.gift.color,
      selectedSize: offer.gift.size,
      isGift: true,
      giftCampaignId: String(offer.id),
      giftCampaignName: offer.name,
      giftCampaignSnapshot: {
        name: offer.name,
        requirements: offer.requirements.map((requirement) => ({
          label: requirement.label,
          required_quantity: requirement.required_quantity,
        })),
        priority: offer.priority,
        repeatable: offer.repeatable,
        award_count: offer.award_count,
        combines_with_other_gifts: offer.combines_with_other_gifts,
        allow_discount_codes: offer.allow_discount_codes,
      },
    });
  }
  const requiredStock = new Map<string, number>();
  for (const item of validatedCart) {
    requiredStock.set(item.productId, (requiredStock.get(item.productId) ?? 0) + item.qty);
  }
  for (const [productId, quantity] of requiredStock) {
    const product = (await getCheckoutProduct(ctx, productId)) as any;
    if (!product || product.in_stock === false || Number(product.stock_quantity ?? 0) < quantity)
      throw new Error(`Not enough stock for ${product?.name ?? "an item in your cart"}.`);
  }
  const discount = promotion?.discount ?? 0;
  const total = Math.max(0, Math.round((subtotal + shipping - discount) * 100) / 100);
  return {
    subtotal,
    shipping,
    discount,
    total,
    amountPaise: Math.round(total * 100),
    itemCount,
    validatedCart,
    promotion,
    gifts: earnedGifts.map((offer) => ({
      campaign_id: offer.id,
      campaign_name: offer.name,
      product_id: offer.gift.id,
      product_name: offer.gift.name,
      product_image_url: offer.gift.image,
      product_slug: offer.gift.slug,
      quantity: offer.gift.quantity,
      color: offer.gift.color,
      size: offer.gift.size,
    })),
  };
}

async function restoreReservedStock(ctx: any, cart: Array<any>) {
  const timestamp = nowIso();
  for (const item of cart) {
    const product = (await getCheckoutProduct(ctx, item.productId)) as any;
    if (!product) continue;
    const nextStock = Math.max(
      0,
      Number(product.stock_quantity ?? 0) + Math.max(1, Math.floor(item.qty)),
    );
    await ctx.db.patch(product._id, {
      stock_quantity: nextStock,
      in_stock: nextStock > 0,
      updated_at: timestamp,
    });
  }
}

async function releaseExpiredReservations(ctx: any) {
  const now = Date.now();
  const expired = await ctx.db
    .query("checkout_intents")
    .withIndex("by_status_expires_at", (q: any) => q.eq("status", "pending").lt("expires_at", now))
    .take(100);
  for (const intent of expired) {
    if (intent.stock_reserved !== false) await restoreReservedStock(ctx, intent.cart);
    if (intent.promotion_reserved)
      await releasePromotionUse(ctx, intent.promotion_id as Id<"discounts"> | null | undefined);
    await ctx.db.patch(intent._id, {
      status: "released",
      stock_reserved: false,
      promotion_reserved: false,
      updated_at: nowIso(),
    });
  }
}

async function failCheckoutIntent(
  ctx: any,
  args: {
    razorpay_order_id: string;
    razorpay_payment_id?: string | null;
    error?: string | null;
  },
) {
  const intent = await ctx.db
    .query("checkout_intents")
    .withIndex("by_razorpay_order_id", (q: any) =>
      q.eq("razorpay_order_id", args.razorpay_order_id),
    )
    .first();
  if (!intent || intent.status !== "pending") return null;
  if (intent.stock_reserved !== false) await restoreReservedStock(ctx, intent.cart);
  if (intent.promotion_reserved)
    await releasePromotionUse(ctx, intent.promotion_id as Id<"discounts"> | null | undefined);
  await ctx.db.patch(intent._id, {
    status: "failed",
    stock_reserved: false,
    promotion_reserved: false,
    payment_id: args.razorpay_payment_id ?? null,
    error: cleanNullable(args.error, 500),
    updated_at: nowIso(),
  });
  return true;
}

async function recordGiftRedemption(
  ctx: MutationCtx,
  args: {
    orderId: Id<"orders">;
    campaignId: Id<"gift_campaigns"> | null;
    campaignName: string | null;
    campaignSnapshot: unknown;
    productId: Id<"products">;
    productName: string;
    quantity: number;
    customerEmail: string;
    customerPhone: string;
    status?: "pending" | "awarded";
    createdAt: string;
  },
) {
  if (!args.campaignId) return;
  const campaign = await ctx.db.get(args.campaignId);
  const snapshot =
    args.campaignSnapshot ??
    (campaign
      ? {
          name: campaign.name,
          requirements: campaign.requirements.map((requirement) => ({
            label: requirement.label,
            required_quantity: requirement.required_quantity,
          })),
          priority: campaign.priority ?? campaign.sort_order,
          repeatable: campaign.repeatable ?? false,
          max_awards_per_order: campaign.max_awards_per_order ?? 1,
          combines_with_other_gifts: campaign.combines_with_other_gifts ?? false,
          allow_discount_codes: campaign.allow_discount_codes ?? true,
        }
      : { name: args.campaignName ?? "Archived gift campaign" });
  await ctx.db.insert("gift_redemptions", {
    campaign_id: args.campaignId,
    campaign_name: args.campaignName ?? campaign?.name ?? "Gift campaign",
    order_id: args.orderId,
    product_id: args.productId,
    product_name: args.productName,
    quantity: args.quantity,
    customer_email: args.customerEmail || null,
    customer_phone: args.customerPhone || null,
    status: args.status ?? "awarded",
    campaign_snapshot: snapshot,
    created_at: args.createdAt,
  });
}

async function savePaidOrder(
  ctx: any,
  args: {
    cart: Array<any>;
    customer: any;
    user_id?: string | null;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    payment_method?: string | null;
    locked_amount_paise?: number;
    locked_discount?: number;
    locked_promotion_id?: Id<"discounts"> | null;
    locked_promotion_code?: string | null;
    promotion_code?: string;
    promotion_already_reserved?: boolean;
    stock_already_reserved?: boolean;
  },
) {
  const existingByPayment = await ctx.db
    .query("orders")
    .withIndex("by_payment_id", (q: any) => q.eq("payment_id", args.razorpay_payment_id))
    .first();
  if (existingByPayment) {
    if (existingByPayment.payment_order_id !== args.razorpay_order_id)
      throw new Error("Payment order mismatch.");
    if (!existingByPayment.payment_method && args.payment_method) {
      await ctx.db.patch(existingByPayment._id, {
        payment_method: cleanNullable(args.payment_method, 40),
        updated_at: nowIso(),
      });
    }
    return publicOrder(existingByPayment);
  }
  const existingByRazorpayOrder = await ctx.db
    .query("orders")
    .withIndex("by_payment_order_id", (q: any) => q.eq("payment_order_id", args.razorpay_order_id))
    .first();
  if (existingByRazorpayOrder) {
    if (existingByRazorpayOrder.payment_id !== args.razorpay_payment_id)
      throw new Error("This Razorpay order is already linked to another payment.");
    if (!existingByRazorpayOrder.payment_method && args.payment_method) {
      await ctx.db.patch(existingByRazorpayOrder._id, {
        payment_method: cleanNullable(args.payment_method, 40),
        updated_at: nowIso(),
      });
    }
    return publicOrder(existingByRazorpayOrder);
  }
  if (!args.cart.length) throw new Error("Cart is empty.");
  if (args.cart.length > 100) throw new Error("A checkout can contain up to 100 product lines.");
  const customer = {
    email: cleanEmail(args.customer.email),
    phone: cleanPhone(args.customer.phone),
    name: cleanText(args.customer.name, 120),
    address_line_1: cleanText(args.customer.address_line_1, 180),
    address_line_2: cleanNullable(args.customer.address_line_2, 180) ?? undefined,
    city: cleanText(args.customer.city, 80),
    state: cleanNullable(args.customer.state, 80) ?? undefined,
    postal_code: cleanText(args.customer.postal_code, 24),
    country: cleanText(args.customer.country, 80),
  };
  if (
    !customer.name ||
    !customer.address_line_1 ||
    !customer.city ||
    !customer.postal_code ||
    !customer.country
  ) {
    throw new Error("Complete shipping details are required.");
  }

  const normalizedItems: Array<any> = [];
  let computedSubtotal = 0;
  for (const item of args.cart) {
    const qty = Math.floor(item.qty);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) throw new Error("Cart quantity is invalid.");
    const product = (await getCheckoutProduct(ctx, item.productId)) as any;
    if (!product || (args.locked_amount_paise === undefined && product.is_active === false))
      throw new Error(`Product is no longer available: ${cleanText(item.name, 80)}`);
    const stock = product.stock_quantity ?? 0;
    if (!args.stock_already_reserved && (stock < qty || product.in_stock === false))
      throw new Error(`Not enough stock for ${product.name}.`);
    const isGift = args.locked_amount_paise !== undefined && item.isGift === true;
    const unitPrice = isGift
      ? 0
      : args.locked_amount_paise !== undefined
        ? Number(item.priceInr)
        : (product.sale_price_inr ?? product.price_inr ?? product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0)
      throw new Error(`Invalid price for ${product.name}.`);
    const selectedColor = cleanVariantSelection(
      item.selectedColor,
      product.color_options,
      "Colour",
      product.name,
    );
    const selectedSize = cleanVariantSelection(
      item.selectedSize,
      product.size_options,
      "Size",
      product.name,
    );
    computedSubtotal += unitPrice * qty;
    normalizedItems.push({
      product,
      qty,
      unitPrice,
      selectedColor,
      selectedSize,
      isGift,
      giftCampaignId: isGift
        ? ctx.db.normalizeId("gift_campaigns", cleanText(item.giftCampaignId, 200))
        : null,
      giftCampaignName: isGift ? cleanNullable(item.giftCampaignName, 100) : null,
      giftCampaignSnapshot: isGift ? (item.giftCampaignSnapshot ?? null) : null,
    });
  }

  const currentPromotion =
    args.locked_discount === undefined
      ? await evaluatePromotion(
          ctx,
          args.promotion_code,
          normalizedItems.map((item) => ({
            productId: String(item.product._id),
            qty: item.qty,
            priceInr: item.unitPrice,
          })),
          computedSubtotal,
        )
      : null;

  if (args.locked_amount_paise === undefined) {
    const giftOffers = await evaluateGiftCampaigns(
      ctx,
      normalizedItems.map((item) => ({ productId: String(item.product._id), qty: item.qty })),
      Date.now(),
      { hasDiscount: Boolean(currentPromotion) },
    );
    for (const offer of giftOffers.filter((item) => item.earned)) {
      const giftProduct = await ctx.db.get(offer.gift.id);
      if (!giftProduct) continue;
      normalizedItems.push({
        product: giftProduct,
        qty: offer.gift.quantity,
        unitPrice: 0,
        selectedColor: offer.gift.color,
        selectedSize: offer.gift.size,
        isGift: true,
        giftCampaignId: offer.id,
        giftCampaignName: offer.name,
        giftCampaignSnapshot: {
          name: offer.name,
          requirements: offer.requirements.map((requirement) => ({
            label: requirement.label,
            required_quantity: requirement.required_quantity,
          })),
          priority: offer.priority,
          repeatable: offer.repeatable,
          award_count: offer.award_count,
          combines_with_other_gifts: offer.combines_with_other_gifts,
          allow_discount_codes: offer.allow_discount_codes,
        },
      });
    }
  }

  const computedDiscount = Math.min(
    computedSubtotal,
    Math.max(0, args.locked_discount ?? currentPromotion?.discount ?? 0),
  );
  const promotionId = args.locked_promotion_id ?? currentPromotion?.promotionId ?? null;
  const promotionCode =
    args.locked_promotion_code ??
    currentPromotion?.code ??
    normalizePromotionCode(args.promotion_code);
  if (currentPromotion && !args.promotion_already_reserved)
    await reservePromotionUse(ctx, currentPromotion.promotionId);

  const shippingMeta = requireIndiaShipping(customer.country);
  const computedShipping = shippingMeta.amount;
  const computedTotal =
    Math.round(Math.max(0, computedSubtotal + computedShipping - computedDiscount) * 100) / 100;
  if (
    args.locked_amount_paise !== undefined &&
    Math.round(computedTotal * 100) !== args.locked_amount_paise
  ) {
    throw new Error("Reserved checkout total does not match the captured Razorpay amount.");
  }
  const timestamp = nowIso();
  const orderNumber = await nextOrderNumber(ctx, args.razorpay_payment_id);
  const orderId = await ctx.db.insert("orders", {
    order_number: orderNumber,
    user_id: args.user_id ?? null,
    customer_email: customer.email,
    customer_name: customer.name,
    customer_phone: customer.phone,
    status: "processing",
    payment_status: "paid",
    subtotal: computedSubtotal,
    tax: 0,
    shipping_cost: computedShipping,
    shipping_payment_status: shippingMeta.paymentStatus,
    shipping_payment_note: shippingMeta.note,
    customer_country_type: shippingMeta.countryType,
    discount: computedDiscount,
    promotion_id: promotionId,
    promotion_code: promotionCode || null,
    total: computedTotal,
    total_inr: computedTotal,
    currency: "INR",
    shipping_address: customer,
    payment_provider: "RAZORPAY",
    payment_method: cleanNullable(args.payment_method, 40),
    payment_order_id: cleanText(args.razorpay_order_id, 120),
    payment_id: cleanText(args.razorpay_payment_id, 120),
    stock_adjusted_at: timestamp,
    stock_restored_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  });

  for (const item of normalizedItems) {
    await ctx.db.insert("order_items", {
      order_id: orderId,
      product_id: item.product._id,
      product_name: productNameWithOptions(
        item.product.name,
        item.selectedColor,
        item.selectedSize,
      ),
      product_image_url: item.product.cover_image_url ?? null,
      selected_color: item.selectedColor,
      selected_size: item.selectedSize,
      quantity: item.qty,
      unit_price: item.unitPrice,
      subtotal: item.unitPrice * item.qty,
      is_gift: item.isGift,
      gift_campaign_id: item.giftCampaignId,
      gift_campaign_name: item.giftCampaignName,
      gift_campaign_snapshot: item.giftCampaignSnapshot,
    });
    if (item.isGift) {
      await recordGiftRedemption(ctx, {
        orderId,
        campaignId: item.giftCampaignId,
        campaignName: item.giftCampaignName,
        campaignSnapshot: item.giftCampaignSnapshot,
        productId: item.product._id,
        productName: item.product.name,
        quantity: item.qty,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        createdAt: timestamp,
      });
    }
  }

  if (!args.stock_already_reserved) {
    const quantities = new Map<string, number>();
    for (const item of normalizedItems) {
      const id = String(item.product._id);
      quantities.set(id, (quantities.get(id) ?? 0) + item.qty);
    }
    for (const [productId, quantity] of quantities) {
      const product = (await getCheckoutProduct(ctx, productId)) as any;
      if (!product || product.in_stock === false || Number(product.stock_quantity ?? 0) < quantity)
        throw new Error(`Not enough stock for ${product?.name ?? "an item in your cart"}.`);
      const nextStock = Number(product.stock_quantity ?? 0) - quantity;
      await ctx.db.patch(product._id, {
        stock_quantity: nextStock,
        in_stock: nextStock > 0,
        updated_at: timestamp,
      });
    }
  }

  if (args.user_id) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", args.user_id))
      .unique();
    if (profile) {
      await ctx.db.patch(profile._id, {
        total_orders: (profile.total_orders ?? 0) + 1,
        total_spent: (profile.total_spent ?? 0) + computedTotal,
        updated_at: timestamp,
      });
    }
  }

  const order = await ctx.db.get(orderId);
  return order ? publicOrder(order) : null;
}

export const quoteCheckout = query({
  args: {
    cart: v.array(cartItem),
    promotion_code: v.optional(v.string()),
  },
  returns: v.object({
    subtotal: v.number(),
    shipping: v.number(),
    discount: v.number(),
    total: v.number(),
    amountPaise: v.number(),
    itemCount: v.number(),
    promotion: v.union(
      v.object({
        id: v.id("discounts"),
        code: v.string(),
        name: v.string(),
        type: v.union(v.literal("percent"), v.literal("fixed")),
        value: v.number(),
        eligibleSubtotal: v.number(),
      }),
      v.null(),
    ),
    gifts: v.array(
      v.object({
        campaign_id: v.id("gift_campaigns"),
        campaign_name: v.string(),
        product_id: v.id("products"),
        product_name: v.string(),
        product_image_url: v.union(v.string(), v.null()),
        product_slug: v.union(v.string(), v.null()),
        quantity: v.number(),
        color: v.union(v.string(), v.null()),
        size: v.union(v.string(), v.null()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const quote = await checkoutQuote(ctx, args.cart, args.promotion_code);
    return {
      subtotal: quote.subtotal,
      shipping: quote.shipping,
      discount: quote.discount,
      total: quote.total,
      amountPaise: quote.amountPaise,
      itemCount: quote.itemCount,
      promotion: quote.promotion
        ? {
            id: quote.promotion.promotionId,
            code: quote.promotion.code,
            name: quote.promotion.name,
            type: quote.promotion.type,
            value: quote.promotion.value,
            eligibleSubtotal: quote.promotion.eligibleSubtotal,
          }
        : null,
      gifts: quote.gifts,
    };
  },
});

function buildWhatsAppOrderMessage(
  orderNumber: string,
  customer: Record<string, any>,
  cart: Array<any>,
  subtotal: number,
  discount: number,
  promotionCode: string | null,
  total: number,
) {
  const productBase = String(process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  return cleanLongMessage(
    [
      `Assalamu alaikum. I would like to order to ${customer.country}.`,
      `Order request: ${orderNumber}`,
      "",
      `Name: ${customer.name}`,
      `Email: ${customer.email}`,
      `WhatsApp number: ${customer.phone}`,
      "",
      `Country: ${customer.country}`,
      `Address: ${customer.address_line_1}${customer.address_line_2 ? `, ${customer.address_line_2}` : ""}`,
      `City: ${customer.city}`,
      `State / province / region: ${customer.state ?? ""}`,
      `Postal code: ${customer.postal_code ?? ""}`,
      "",
      ...cart.flatMap((item, index) => [
        `${index + 1}. ${item.isGift ? "FREE GIFT: " : ""}${productNameWithOptions(item.name, item.selectedColor, item.selectedSize)}`,
        `   Quantity: ${item.qty}`,
        item.slug && productBase
          ? `   Product page: ${productBase}/products/${encodeURIComponent(item.slug)}`
          : "",
        "",
      ]),
      `Product subtotal: INR ${subtotal.toLocaleString("en-IN")}`,
      ...(discount > 0
        ? [
            `Promotion${promotionCode ? ` (${promotionCode})` : ""}: -INR ${discount.toLocaleString("en-IN")}`,
            `Discounted subtotal: INR ${total.toLocaleString("en-IN")}`,
          ]
        : []),
      "Please confirm availability, international shipping, and payment details.",
    ]
      .filter((line) => line !== "")
      .join("\n"),
  );
}

export const createWhatsAppOrder = mutation({
  args: {
    cart: v.array(cartItem),
    customer: checkoutCustomer,
    client_request_id: v.string(),
    promotion_code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requestId = cleanText(args.client_request_id, 100);
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) {
      throw new Error("Invalid checkout request ID.");
    }
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_client_request_id", (q) => q.eq("client_request_id", requestId))
      .first();
    if (existing) return await orderWithItems(ctx, existing);

    const customer = {
      email: cleanEmail(args.customer.email),
      phone: cleanPhone(args.customer.phone),
      name: cleanText(args.customer.name, 120),
      address_line_1: cleanText(args.customer.address_line_1, 180),
      address_line_2: cleanNullable(args.customer.address_line_2, 180) ?? undefined,
      city: cleanText(args.customer.city, 80),
      state: cleanNullable(args.customer.state, 80) ?? undefined,
      postal_code: cleanText(args.customer.postal_code, 24),
      country: cleanText(args.customer.country, 80),
    };
    if (!customer.name || !customer.address_line_1 || !customer.city || !customer.country) {
      throw new Error("Complete shipping details are required.");
    }
    const shipping = checkoutShippingForCountry(customer.country);
    if (shipping.countryType === "india") {
      throw new Error("India orders must use the secure Razorpay checkout.");
    }
    const recentCutoff = Date.now() - 60 * 60 * 1_000;
    const recentRequests = await ctx.db
      .query("orders")
      .withIndex("by_customer_email", (q) => q.eq("customer_email", customer.email))
      .order("desc")
      .take(6);
    if (
      recentRequests.filter(
        (order) =>
          order.payment_provider === "WHATSAPP" &&
          Date.parse(order.created_at ?? "") >= recentCutoff,
      ).length >= 5
    ) {
      throw new Error("Too many WhatsApp order requests. Please try again later.");
    }

    const quote = await checkoutQuote(ctx, args.cart, args.promotion_code);
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getAuthUserId(ctx) : null;
    const timestamp = nowIso();
    const orderNumber = await nextOrderNumber(ctx, requestId);
    const whatsappMessage = buildWhatsAppOrderMessage(
      orderNumber,
      customer,
      quote.validatedCart,
      quote.subtotal,
      quote.discount,
      quote.promotion?.code ?? null,
      quote.total,
    );
    const orderId = await ctx.db.insert("orders", {
      order_number: orderNumber,
      client_request_id: requestId,
      user_id: userId ?? null,
      customer_email: customer.email,
      customer_name: customer.name,
      customer_phone: customer.phone,
      status: "whatsapp_pending",
      payment_status: "unconfirmed",
      subtotal: quote.subtotal,
      tax: 0,
      shipping_cost: 0,
      shipping_payment_status: "to_confirm",
      shipping_payment_note:
        "International shipping and payment are confirmed manually on WhatsApp.",
      customer_country_type: "international",
      discount: quote.discount,
      promotion_id: quote.promotion?.promotionId ?? null,
      promotion_code: quote.promotion?.code ?? null,
      promotion_reserved: false,
      total: quote.total,
      total_inr: quote.total,
      currency: "INR",
      shipping_address: customer,
      payment_provider: "WHATSAPP",
      payment_method: "manual_confirmation",
      whatsapp_message: whatsappMessage,
      created_at: timestamp,
      updated_at: timestamp,
    });

    for (const item of quote.validatedCart) {
      await ctx.db.insert("order_items", {
        order_id: orderId,
        product_id: item.productId,
        product_name: productNameWithOptions(item.name, item.selectedColor, item.selectedSize),
        product_image_url: item.image ?? null,
        selected_color: item.selectedColor ?? null,
        selected_size: item.selectedSize ?? null,
        quantity: item.qty,
        unit_price: item.priceInr,
        subtotal: item.priceInr * item.qty,
        is_gift: item.isGift === true,
        gift_campaign_id: item.giftCampaignId
          ? ctx.db.normalizeId("gift_campaigns", item.giftCampaignId)
          : null,
        gift_campaign_name: cleanNullable(item.giftCampaignName, 100),
        gift_campaign_snapshot: item.giftCampaignSnapshot ?? null,
      });
      if (item.isGift) {
        const campaignId = item.giftCampaignId
          ? ctx.db.normalizeId("gift_campaigns", item.giftCampaignId)
          : null;
        const productId = ctx.db.normalizeId("products", item.productId);
        if (productId) {
          await recordGiftRedemption(ctx, {
            orderId,
            campaignId,
            campaignName: cleanNullable(item.giftCampaignName, 100),
            campaignSnapshot: item.giftCampaignSnapshot ?? null,
            productId,
            productName: item.name,
            quantity: item.qty,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            status: "pending",
            createdAt: timestamp,
          });
        }
      }
    }
    const saved = await ctx.db.get(orderId);
    return saved ? await orderWithItems(ctx, saved) : null;
  },
});

function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) throw new Error("Razorpay keys are not configured.");
  return { keyId, keySecret };
}

async function razorpayRequest(ctx: any, path: string, init: RequestInit = {}) {
  const result: any = await ctx.runAction((internal as any).razorpay.request, {
    path,
    method: init.method ?? "GET",
    body: typeof init.body === "string" ? init.body : undefined,
  });
  if (!result?.ok) {
    const code = cleanText(result?.error?.code ?? "PROVIDER_ERROR", 80);
    const description = cleanText(
      result?.error?.description ?? "Payment provider request failed.",
      240,
    );
    throw new Error(`Payment provider error (${result?.status ?? 500}/${code}): ${description}`);
  }
  return result.data;
}

async function hmacSha256Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1)
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function requireCheckoutServerToken(value: string) {
  const expected =
    process.env.CHECKOUT_API_SECRET?.trim() || process.env.ADMIN_UPLOAD_TOKEN?.trim() || "";
  if (!expected || !timingSafeEqual(expected, value)) {
    throw new Error("Checkout API authorization failed.");
  }
}

export const findSavedPayment = internalQuery({
  args: {
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const existingByPayment = await ctx.db
      .query("orders")
      .withIndex("by_payment_id", (q) => q.eq("payment_id", args.razorpay_payment_id))
      .first();
    if (existingByPayment) {
      if (existingByPayment.payment_order_id !== args.razorpay_order_id)
        throw new Error("Payment order mismatch.");
      return publicOrder(existingByPayment);
    }
    const existingByRazorpayOrder = await ctx.db
      .query("orders")
      .withIndex("by_payment_order_id", (q: any) =>
        q.eq("payment_order_id", args.razorpay_order_id),
      )
      .first();
    if (!existingByRazorpayOrder) return null;
    if (existingByRazorpayOrder.payment_id !== args.razorpay_payment_id)
      throw new Error("This Razorpay order is already linked to another payment.");
    return publicOrder(existingByRazorpayOrder);
  },
});

export const createRazorpayCheckoutOrder = action({
  args: { ...checkoutPayload, server_token: v.string() },
  handler: async (ctx, args) => {
    requireCheckoutServerToken(args.server_token);
    validateCheckoutCustomer(args.customer);
    const quote = await ctx.runQuery(api.orders.quoteCheckout, {
      cart: args.cart,
      promotion_code: args.promotion_code,
    });
    if (quote.amountPaise < 100) throw new Error("Order total must be at least INR 1.");
    const { keyId } = razorpayKeys();
    const receipt = `FZ-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`.slice(0, 40);
    const order = await razorpayRequest(ctx, "/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: quote.amountPaise,
        currency: "INR",
        receipt,
        notes: {
          customer: cleanText(args.customer.name, 80),
          email: cleanText(args.customer.email, 120),
          promotion: quote.promotion?.code ?? "",
        },
      }),
    });
    if (
      typeof order?.id !== "string" ||
      order.amount !== quote.amountPaise ||
      order.currency !== "INR" ||
      order.status !== "created"
    ) {
      throw new Error("Payment provider returned an invalid checkout order.");
    }
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getAuthUserId(ctx) : null;
    await ctx.runMutation(internal.orders.reserveCheckoutIntent, {
      razorpay_order_id: order.id,
      user_id: userId,
      cart: args.cart,
      customer: args.customer,
      amount_paise: quote.amountPaise,
      promotion_code: args.promotion_code,
    });
    return { keyId, orderId: order.id, amount: order.amount, currency: order.currency, receipt };
  },
});

export const reserveCheckoutIntent = internalMutation({
  args: {
    razorpay_order_id: v.string(),
    user_id: v.optional(v.union(v.string(), v.null())),
    cart: v.array(cartItem),
    customer: checkoutCustomer,
    amount_paise: v.number(),
    promotion_code: v.optional(v.string()),
  },
  returns: v.id("checkout_intents"),
  handler: async (ctx, args) => {
    await releaseExpiredReservations(ctx);
    const existing = await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q: any) =>
        q.eq("razorpay_order_id", args.razorpay_order_id),
      )
      .first();
    if (existing) return existing._id;
    const quote = await checkoutQuote(ctx, args.cart, args.promotion_code);
    if (quote.amountPaise !== args.amount_paise)
      throw new Error("Checkout total changed. Please try again.");
    const timestamp = nowIso();
    if (quote.promotion) await reservePromotionUse(ctx, quote.promotion.promotionId);
    for (const item of quote.validatedCart) {
      const product = (await getCheckoutProduct(ctx, item.productId)) as any;
      if (!product) throw new Error("Product is no longer available.");
      const nextStock = Number(product.stock_quantity ?? 0) - Math.max(1, Math.floor(item.qty));
      if (nextStock < 0) throw new Error(`Not enough stock for ${product.name}.`);
      await ctx.db.patch(product._id, {
        stock_quantity: nextStock,
        in_stock: nextStock > 0,
        updated_at: timestamp,
      });
    }
    const intentId = await ctx.db.insert("checkout_intents", {
      razorpay_order_id: args.razorpay_order_id,
      user_id: args.user_id ?? null,
      payment_id: null,
      status: "pending",
      cart: quote.validatedCart,
      customer: args.customer,
      amount_paise: args.amount_paise,
      subtotal_inr: quote.subtotal,
      shipping_inr: quote.shipping,
      discount_inr: quote.discount,
      promotion_id: quote.promotion?.promotionId ?? null,
      promotion_code: quote.promotion?.code ?? null,
      promotion_reserved: Boolean(quote.promotion),
      error: null,
      stock_reserved: true,
      reconciliation_attempts: 0,
      last_reconciled_at: null,
      expires_at: Date.now() + CHECKOUT_RESERVATION_MS,
      created_at: timestamp,
      updated_at: timestamp,
    });
    await ctx.scheduler.runAfter(
      CHECKOUT_RECONCILIATION_INITIAL_DELAY_MS,
      internal.orders.reconcileCheckoutIntent,
      { razorpay_order_id: args.razorpay_order_id, attempt: 0 },
    );
    return intentId;
  },
});

export const cleanupExpiredCheckoutIntents = internalMutation({
  args: {},
  handler: async (ctx) => {
    await releaseExpiredReservations(ctx);
  },
});

export const finalizeCheckoutIntent = internalMutation({
  args: {
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    amount_paise: v.optional(v.number()),
    currency: v.optional(v.string()),
    payment_method: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => finalizeCheckoutIntentHandler(ctx, args),
});

export const markCheckoutRecovery = internalMutation({
  args: {
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.optional(v.union(v.string(), v.null())),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q) => q.eq("razorpay_order_id", args.razorpay_order_id))
      .first();
    if (!intent || intent.status === "completed") return false;
    await ctx.db.patch(intent._id, {
      status: "recovery_required",
      payment_id: args.razorpay_payment_id ?? intent.payment_id ?? null,
      error: cleanText(args.error, 500) || "Paid checkout needs recovery.",
      last_reconciled_at: nowIso(),
      updated_at: nowIso(),
    });
    return true;
  },
});

export const markCheckoutFailed = internalMutation({
  args: {
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.optional(v.union(v.string(), v.null())),
    error: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => await failCheckoutIntent(ctx, args),
});

async function finalizeCheckoutIntentHandler(
  ctx: any,
  args: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    amount_paise?: number;
    currency?: string;
    payment_method?: string | null;
  },
) {
  const intent = await ctx.db
    .query("checkout_intents")
    .withIndex("by_razorpay_order_id", (q: any) =>
      q.eq("razorpay_order_id", args.razorpay_order_id),
    )
    .first();
  if (!intent) return null;
  if (
    (args.amount_paise !== undefined && args.amount_paise !== intent.amount_paise) ||
    (args.currency && args.currency !== "INR")
  ) {
    await ctx.db.patch(intent._id, {
      status: "recovery_required",
      payment_id: args.razorpay_payment_id,
      error: "Captured Razorpay amount does not match the reserved checkout total.",
      updated_at: nowIso(),
    });
    return null;
  }
  if (intent.status === "completed") {
    const existingOrder = await ctx.db
      .query("orders")
      .withIndex("by_payment_order_id", (q: any) =>
        q.eq("payment_order_id", args.razorpay_order_id),
      )
      .first();
    if (existingOrder && !existingOrder.payment_method && args.payment_method) {
      await ctx.db.patch(existingOrder._id, {
        payment_method: cleanNullable(args.payment_method, 40),
        updated_at: nowIso(),
      });
      return await ctx.db.get(existingOrder._id);
    }
    return existingOrder;
  }
  const hasServerSnapshot = intent.stock_reserved !== undefined;
  const stockAlreadyReserved = intent.stock_reserved ?? intent.status === "pending";
  const order = await savePaidOrder(ctx, {
    cart: intent.cart,
    customer: intent.customer,
    user_id: intent.user_id ?? null,
    razorpay_order_id: args.razorpay_order_id,
    razorpay_payment_id: args.razorpay_payment_id,
    razorpay_signature: "verified-by-server",
    payment_method: args.payment_method,
    locked_amount_paise: hasServerSnapshot ? intent.amount_paise : undefined,
    locked_discount: hasServerSnapshot ? Number(intent.discount_inr ?? 0) : undefined,
    locked_promotion_id: hasServerSnapshot ? (intent.promotion_id ?? null) : undefined,
    locked_promotion_code: hasServerSnapshot ? (intent.promotion_code ?? null) : undefined,
    promotion_already_reserved: Boolean(intent.promotion_reserved),
    stock_already_reserved: stockAlreadyReserved,
  });
  await ctx.db.patch(intent._id, {
    status: "completed",
    payment_id: args.razorpay_payment_id,
    error: null,
    stock_reserved: false,
    promotion_reserved: false,
    updated_at: nowIso(),
  });
  return order;
}

export const saveVerifiedGuestOrder = internalMutation({
  args: {
    ...checkoutPayload,
    user_id: v.optional(v.union(v.string(), v.null())),
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    razorpay_signature: v.string(),
    payment_method: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    return await savePaidOrder(ctx, args);
  },
});

export const verifyRazorpayPayment = action({
  args: {
    ...checkoutPayload,
    server_token: v.string(),
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    razorpay_signature: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    requireCheckoutServerToken(args.server_token);
    const { keySecret } = razorpayKeys();
    const expectedSignature = await hmacSha256Hex(
      keySecret,
      `${args.razorpay_order_id}|${args.razorpay_payment_id}`,
    );
    if (!timingSafeEqual(expectedSignature, args.razorpay_signature))
      throw new Error("Razorpay signature verification failed.");

    const savedOrder: any = await ctx.runQuery(internal.orders.findSavedPayment, {
      razorpay_order_id: args.razorpay_order_id,
      razorpay_payment_id: args.razorpay_payment_id,
    });
    if (savedOrder) return savedOrder;

    const reservedIntent = await ctx.runQuery(internal.orders.findCheckoutIntent, {
      razorpay_order_id: args.razorpay_order_id,
    });
    const expectedAmountPaise =
      reservedIntent?.amount_paise ??
      (
        await ctx.runQuery(api.orders.quoteCheckout, {
          cart: args.cart,
          promotion_code: args.promotion_code,
        })
      ).amountPaise;

    const [razorpayOrder, fetchedPayment] = await Promise.all([
      razorpayRequest(ctx, `/orders/${args.razorpay_order_id}`),
      razorpayRequest(ctx, `/payments/${args.razorpay_payment_id}`),
    ]);
    if (razorpayOrder.amount !== expectedAmountPaise || razorpayOrder.currency !== "INR") {
      throw new Error("Razorpay amount does not match the current cart total.");
    }
    if (
      fetchedPayment.order_id !== args.razorpay_order_id ||
      fetchedPayment.amount !== expectedAmountPaise ||
      fetchedPayment.currency !== "INR"
    ) {
      throw new Error("Razorpay payment does not match the current order.");
    }
    let payment = fetchedPayment;
    if (fetchedPayment.status === "authorized") {
      try {
        payment = await razorpayRequest(ctx, `/payments/${args.razorpay_payment_id}/capture`, {
          method: "POST",
          body: JSON.stringify({ amount: expectedAmountPaise, currency: "INR" }),
        });
      } catch {
        // A repeated callback can race with capture. Refetch before treating it as a failed paid order.
        payment = await razorpayRequest(ctx, `/payments/${args.razorpay_payment_id}`);
      }
    }
    if (payment.status !== "captured") throw new Error("Razorpay payment has not been captured.");
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getAuthUserId(ctx) : null;

    let reservedOrder: any;
    try {
      reservedOrder = await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
        razorpay_order_id: args.razorpay_order_id,
        razorpay_payment_id: args.razorpay_payment_id,
        amount_paise: fetchedPayment.amount,
        currency: fetchedPayment.currency,
        payment_method: cleanNullable(payment.method, 40),
      });
    } catch (error) {
      await ctx.runMutation(internal.orders.markCheckoutRecovery, {
        razorpay_order_id: args.razorpay_order_id,
        razorpay_payment_id: args.razorpay_payment_id,
        error: error instanceof Error ? error.message : "Paid checkout could not be finalized.",
      });
      throw new Error("Payment received and is being confirmed. Do not pay again.");
    }
    if (reservedOrder) return reservedOrder;
    const hasIntent = await ctx.runQuery(internal.orders.findCheckoutIntent, {
      razorpay_order_id: args.razorpay_order_id,
    });
    if (hasIntent)
      throw new Error("Payment received, but this order needs manual recovery. Do not pay again.");
    return await ctx.runMutation(internal.orders.saveVerifiedGuestOrder, {
      cart: args.cart,
      customer: args.customer,
      subtotal: args.subtotal,
      shipping: args.shipping,
      total: args.total,
      promotion_code: args.promotion_code,
      user_id: userId,
      razorpay_order_id: args.razorpay_order_id,
      razorpay_payment_id: args.razorpay_payment_id,
      razorpay_signature: args.razorpay_signature,
      payment_method: cleanNullable(payment.method, 40),
    });
  },
});

export const findCheckoutIntent = internalQuery({
  args: { razorpay_order_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q: any) =>
        q.eq("razorpay_order_id", args.razorpay_order_id),
      )
      .first();
  },
});

export const getCheckoutStatus = query({
  args: { razorpay_order_id: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const intent = await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q) =>
        q.eq("razorpay_order_id", cleanText(args.razorpay_order_id, 120)),
      )
      .first();
    const storedEmail = String(intent?.customer?.email ?? "")
      .trim()
      .toLowerCase();
    const requestedEmail = String(args.email ?? "")
      .trim()
      .toLowerCase();
    if (!intent || !requestedEmail || storedEmail !== requestedEmail) return null;
    const order =
      intent.status === "completed"
        ? await ctx.db
            .query("orders")
            .withIndex("by_payment_order_id", (q) =>
              q.eq("payment_order_id", intent.razorpay_order_id),
            )
            .first()
        : null;
    return {
      status: intent.status,
      order_id: order?._id ?? null,
      order_number: order?.order_number ?? null,
      payment_received: Boolean(intent.payment_id) || intent.status === "completed",
      message:
        intent.status === "completed"
          ? "Order confirmed."
          : intent.status === "failed"
            ? "Payment failed."
            : intent.status === "recovery_required"
              ? "Payment received and under confirmation."
              : "Waiting for payment confirmation.",
    };
  },
});

export const attachPaidOrderToCurrentUser = mutation({
  args: { id: v.id("orders") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("Order not found.");
    if (order.payment_status !== "paid" || order.payment_provider !== "RAZORPAY") {
      throw new Error("Only confirmed Razorpay orders can be linked to an account.");
    }

    const accountEmail = cleanText(
      (auth.user as { email?: string | null }).email,
      254,
    ).toLowerCase();
    const orderEmail = cleanText(order.customer_email, 254).toLowerCase();
    if (!accountEmail || accountEmail !== orderEmail) {
      throw new Error("The checkout email does not match this account.");
    }

    const userId = String(auth.userId);
    if (order.user_id) {
      if (order.user_id !== userId) throw new Error("This order belongs to another account.");
      return true;
    }

    const timestamp = nowIso();
    await ctx.db.patch(args.id, { user_id: userId, updated_at: timestamp });
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
    if (profile) {
      await ctx.db.patch(profile._id, {
        total_orders: (profile.total_orders ?? 0) + 1,
        total_spent: (profile.total_spent ?? 0) + order.total,
        updated_at: timestamp,
      });
    }
    return true;
  },
});

export const recordReconciliationAttempt = internalMutation({
  args: { razorpay_order_id: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const intent = await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q) => q.eq("razorpay_order_id", args.razorpay_order_id))
      .first();
    if (!intent || intent.status === "completed") return false;
    await ctx.db.patch(intent._id, {
      reconciliation_attempts: Number(intent.reconciliation_attempts ?? 0) + 1,
      last_reconciled_at: nowIso(),
      updated_at: nowIso(),
    });
    return true;
  },
});

export const listUnresolvedCheckoutIntents = internalQuery({
  args: { limit: v.optional(v.number()), cutoff: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const statuses = ["pending", "released", "failed", "recovery_required"];
    const rows = [];
    for (const status of statuses) {
      const matches = await ctx.db
        .query("checkout_intents")
        .withIndex("by_status_expires_at", (q) =>
          q.eq("status", status).gte("expires_at", args.cutoff),
        )
        .order("desc")
        .take(100);
      rows.push(...matches.filter((intent) => Number(intent.reconciliation_attempts ?? 0) < 12));
    }
    return rows.sort((a, b) => b._creationTime - a._creationTime).slice(0, limit);
  },
});

async function capturedPaymentForIntent(ctx: any, intent: any) {
  const result = await razorpayRequest(ctx, `/orders/${intent.razorpay_order_id}/payments`);
  const payments = Array.isArray(result?.items) ? result.items : [];
  let payment = payments.find(
    (item: any) =>
      ["captured", "authorized"].includes(item?.status) &&
      item?.amount === intent.amount_paise &&
      item?.currency === "INR" &&
      item?.order_id === intent.razorpay_order_id,
  );
  if (payment?.status === "authorized") {
    try {
      payment = await razorpayRequest(ctx, `/payments/${payment.id}/capture`, {
        method: "POST",
        body: JSON.stringify({ amount: intent.amount_paise, currency: "INR" }),
      });
    } catch {
      payment = await razorpayRequest(ctx, `/payments/${payment.id}`);
    }
  }
  return payment?.status === "captured" ? payment : null;
}

async function finalizeReconciledIntent(ctx: any, intent: any, captured: any) {
  try {
    return await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
      razorpay_order_id: intent.razorpay_order_id,
      razorpay_payment_id: cleanText(captured.id, 120),
      amount_paise: captured.amount,
      currency: captured.currency,
      payment_method: cleanNullable(captured.method, 40),
    });
  } catch (error) {
    await ctx.runMutation(internal.orders.markCheckoutRecovery, {
      razorpay_order_id: intent.razorpay_order_id,
      razorpay_payment_id: cleanText(captured.id, 120),
      error: error instanceof Error ? error.message : "Reconciliation failed.",
    });
    throw error;
  }
}

export const reconcileCheckoutIntent = internalAction({
  args: { razorpay_order_id: v.string(), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const intent: any = await ctx.runQuery(internal.orders.findCheckoutIntent, {
      razorpay_order_id: cleanText(args.razorpay_order_id, 120),
    });
    if (!intent || intent.status === "completed") return null;

    await ctx.runMutation(internal.orders.recordReconciliationAttempt, {
      razorpay_order_id: intent.razorpay_order_id,
    });
    try {
      const captured = await capturedPaymentForIntent(ctx, intent);
      if (captured?.id) {
        await finalizeReconciledIntent(ctx, intent, captured);
        return null;
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "razorpay_checkout_reconciliation_error",
          razorpayOrderId: intent.razorpay_order_id,
          attempt: args.attempt,
          message: error instanceof Error ? cleanText(error.message, 200) : "Unknown error",
        }),
      );
    }

    const retryDelay = CHECKOUT_RECONCILIATION_RETRY_DELAYS_MS[args.attempt];
    if (retryDelay !== undefined) {
      await ctx.scheduler.runAfter(retryDelay, internal.orders.reconcileCheckoutIntent, {
        razorpay_order_id: intent.razorpay_order_id,
        attempt: args.attempt + 1,
      });
    }
    return null;
  },
});

export const reconcileCapturedPayments = internalAction({
  args: {},
  returns: v.object({
    checked: v.number(),
    finalized: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const intents: any[] = await ctx.runQuery(internal.orders.listUnresolvedCheckoutIntents, {
      limit: 75,
      cutoff: Date.now() - 14 * 24 * 60 * 60 * 1000,
    });
    let finalized = 0;
    let checked = 0;
    const errors: string[] = [];
    for (const intent of intents) {
      checked += 1;
      await ctx.runMutation(internal.orders.recordReconciliationAttempt, {
        razorpay_order_id: intent.razorpay_order_id,
      });
      try {
        const captured = await capturedPaymentForIntent(ctx, intent);
        if (!captured?.id) continue;
        const order = await finalizeReconciledIntent(ctx, intent, captured);
        if (order) finalized += 1;
      } catch (error) {
        errors.push(
          `${intent.razorpay_order_id}: ${
            error instanceof Error ? cleanText(error.message, 160) : "Unknown reconciliation error"
          }`,
        );
      }
    }
    await ctx.runMutation(internal.orders.recordRazorpayReconciliationHealth, {
      checked,
      finalized,
    });
    return { checked, finalized, errors: errors.slice(0, 10) };
  },
});

export const retryPaymentRecovery = action({
  args: { razorpay_order_id: v.string() },
  handler: async (ctx, args): Promise<any> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!isAdminEmail(identity?.email)) throw new Error("Admin access required.");
    const intent: any = await ctx.runQuery(internal.orders.findCheckoutIntent, {
      razorpay_order_id: cleanText(args.razorpay_order_id, 120),
    });
    if (!intent) throw new Error("Checkout attempt was not found.");
    if (intent.status === "completed") {
      return { status: "completed", order: null };
    }
    const payment = await capturedPaymentForIntent(ctx, intent);
    if (!payment?.id) {
      return { status: "not_captured", order: null };
    }
    try {
      const order = await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
        razorpay_order_id: intent.razorpay_order_id,
        razorpay_payment_id: cleanText(payment.id, 120),
        amount_paise: payment.amount,
        currency: payment.currency,
        payment_method: cleanNullable(payment.method, 40),
      });
      return { status: order ? "completed" : "recovery_required", order };
    } catch (error) {
      await ctx.runMutation(internal.orders.markCheckoutRecovery, {
        razorpay_order_id: intent.razorpay_order_id,
        razorpay_payment_id: cleanText(payment.id, 120),
        error: error instanceof Error ? error.message : "Manual recovery failed.",
      });
      throw new Error(error instanceof Error ? error.message : "Manual recovery failed.");
    }
  },
});

export const recordRazorpayApiHealth = internalMutation({
  args: { ok: v.boolean(), error: v.optional(v.union(v.string(), v.null())) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const existing = await ctx.db
      .query("payment_system_health")
      .withIndex("by_provider", (q) => q.eq("provider", "razorpay"))
      .first();
    const patch = {
      last_api_check_at: timestamp,
      ...(args.ok ? { last_api_success_at: timestamp } : {}),
      consecutive_api_failures: args.ok ? 0 : Number(existing?.consecutive_api_failures ?? 0) + 1,
      last_api_error: args.ok ? null : cleanNullable(args.error, 500),
      updated_at: timestamp,
    };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("payment_system_health", { provider: "razorpay", ...patch });
    return true;
  },
});

export const recordRazorpayReconciliationHealth = internalMutation({
  args: { checked: v.number(), finalized: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const existing = await ctx.db
      .query("payment_system_health")
      .withIndex("by_provider", (q) => q.eq("provider", "razorpay"))
      .first();
    const patch = {
      last_reconciliation_at: timestamp,
      last_reconciliation_checked: Math.max(0, Math.floor(args.checked)),
      last_reconciliation_finalized: Math.max(0, Math.floor(args.finalized)),
      updated_at: timestamp,
    };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("payment_system_health", { provider: "razorpay", ...patch });
    return true;
  },
});

async function checkRazorpayApiAndRecord(ctx: any) {
  try {
    const result = await razorpayRequest(ctx, "/orders?count=1");
    const ok = Array.isArray(result?.items);
    await ctx.runMutation(internal.orders.recordRazorpayApiHealth, {
      ok,
      error: ok ? null : "Razorpay returned an unexpected response.",
    });
    return ok;
  } catch (error) {
    await ctx.runMutation(internal.orders.recordRazorpayApiHealth, {
      ok: false,
      error: error instanceof Error ? error.message : "Razorpay connection failed.",
    });
    return false;
  }
}

export const monitorRazorpayHealth = internalAction({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => await checkRazorpayApiAndRecord(ctx),
});

export const checkRazorpayConnection = action({
  args: {},
  returns: v.object({
    ok: v.boolean(),
    mode: v.union(v.literal("live"), v.literal("test")),
    webhookConfigured: v.boolean(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!isAdminEmail(identity?.email)) throw new Error("Admin access required.");
    const { keyId } = razorpayKeys();
    const ok = await checkRazorpayApiAndRecord(ctx);
    const mode: "live" | "test" = keyId.startsWith("rzp_live_") ? "live" : "test";
    return {
      ok,
      mode,
      webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
    };
  },
});

export const getRazorpaySystemStatus = query({
  args: {},
  returns: v.object({
    mode: v.union(v.literal("live"), v.literal("test"), v.literal("missing")),
    webhook_secret_configured: v.boolean(),
    last_api_check_at: v.union(v.number(), v.null()),
    last_api_success_at: v.union(v.number(), v.null()),
    consecutive_api_failures: v.number(),
    last_api_error: v.union(v.string(), v.null()),
    last_webhook_at: v.union(v.number(), v.null()),
    last_webhook_event: v.union(v.string(), v.null()),
    last_reconciliation_at: v.union(v.number(), v.null()),
    last_reconciliation_checked: v.number(),
    last_reconciliation_finalized: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const health = await ctx.db
      .query("payment_system_health")
      .withIndex("by_provider", (q) => q.eq("provider", "razorpay"))
      .first();
    const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
    const mode: "live" | "test" | "missing" = keyId.startsWith("rzp_live_")
      ? "live"
      : keyId
        ? "test"
        : "missing";
    return {
      mode,
      webhook_secret_configured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
      last_api_check_at: health?.last_api_check_at ?? null,
      last_api_success_at: health?.last_api_success_at ?? null,
      consecutive_api_failures: Number(health?.consecutive_api_failures ?? 0),
      last_api_error: health?.last_api_error ?? null,
      last_webhook_at: health?.last_webhook_at ?? null,
      last_webhook_event: health?.last_webhook_event ?? null,
      last_reconciliation_at: health?.last_reconciliation_at ?? null,
      last_reconciliation_checked: Number(health?.last_reconciliation_checked ?? 0),
      last_reconciliation_finalized: Number(health?.last_reconciliation_finalized ?? 0),
    };
  },
});

export const releaseUnpaidCheckoutIntent = action({
  args: { razorpay_order_id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!isAdminEmail(identity?.email)) throw new Error("Admin access required.");
    const razorpayOrderId = cleanText(args.razorpay_order_id, 120);
    const intent: any = await ctx.runQuery(internal.orders.findCheckoutIntent, {
      razorpay_order_id: razorpayOrderId,
    });
    if (!intent || intent.status !== "pending") {
      return { released: false, status: intent?.status ?? "not_found" };
    }
    const result = await razorpayRequest(ctx, `/orders/${razorpayOrderId}/payments`);
    const payments = Array.isArray(result?.items) ? result.items : [];
    if (payments.some((payment: any) => ["authorized", "captured"].includes(payment?.status))) {
      throw new Error("This checkout has a payment and cannot be released.");
    }
    await ctx.runMutation(internal.orders.markCheckoutFailed, {
      razorpay_order_id: razorpayOrderId,
      error: "Unpaid checkout released by an administrator.",
    });
    return { released: true, status: "failed" };
  },
});

export const listPaymentRecoveries = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("checkout_intents")
      .withIndex("by_status", (q) => q.eq("status", "recovery_required"))
      .take(500);
    return rows
      .map(({ _id, _creationTime, ...row }) => ({ id: _id, ...row }))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
});

export const recordRazorpayWebhook = internalMutation({
  args: {
    event_id: v.string(),
    event_type: v.string(),
    razorpay_order_id: v.optional(v.string()),
    razorpay_payment_id: v.optional(v.string()),
    razorpay_refund_id: v.optional(v.string()),
    razorpay_dispute_id: v.optional(v.string()),
    amount_paise: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  returns: v.object({ duplicate: v.boolean(), status: v.string() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("razorpay_webhook_events")
      .withIndex("by_event_id", (q) => q.eq("event_id", args.event_id))
      .first();
    if (existing) return { duplicate: true, status: existing.processing_status ?? "received" };
    await ctx.db.insert("razorpay_webhook_events", {
      event_id: args.event_id,
      event_type: args.event_type,
      razorpay_order_id: args.razorpay_order_id,
      razorpay_payment_id: args.razorpay_payment_id,
      razorpay_refund_id: args.razorpay_refund_id,
      razorpay_dispute_id: args.razorpay_dispute_id,
      amount_paise: args.amount_paise,
      currency: args.currency,
      processing_status: "received",
      expires_at: Date.now() + WEBHOOK_EVENT_RETENTION_MS,
      created_at: nowIso(),
    });
    const timestamp = Date.now();
    const health = await ctx.db
      .query("payment_system_health")
      .withIndex("by_provider", (q) => q.eq("provider", "razorpay"))
      .first();
    const healthPatch = {
      last_webhook_at: timestamp,
      last_webhook_event: cleanText(args.event_type, 80),
      updated_at: timestamp,
    };
    if (health) await ctx.db.patch(health._id, healthPatch);
    else
      await ctx.db.insert("payment_system_health", {
        provider: "razorpay",
        ...healthPatch,
      });
    return { duplicate: false, status: "received" };
  },
});

export const updateRazorpayWebhookEvent = internalMutation({
  args: {
    event_id: v.string(),
    processing_status: v.string(),
    error: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("razorpay_webhook_events")
      .withIndex("by_event_id", (q) => q.eq("event_id", args.event_id))
      .first();
    if (!event) return false;
    await ctx.db.patch(event._id, {
      processing_status: cleanText(args.processing_status, 40),
      error: args.error ? cleanText(args.error, 500) : null,
      processed_at: nowIso(),
    });
    return true;
  },
});

export const syncRazorpayRefund = internalMutation({
  args: {
    refund_id: v.string(),
    payment_id: v.string(),
    razorpay_order_id: v.optional(v.string()),
    amount_paise: v.number(),
    total_refunded_paise: v.optional(v.number()),
    payment_amount_paise: v.optional(v.number()),
    currency: v.string(),
    status: v.string(),
    error: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({
    linked: v.boolean(),
    refund_status: v.string(),
    refunded_amount_inr: v.number(),
  }),
  handler: async (ctx, args) => {
    const refundId = cleanText(args.refund_id, 120);
    const paymentId = cleanText(args.payment_id, 120);
    const status = cleanText(args.status, 40).toLowerCase() || "pending";
    const currency = cleanText(args.currency, 12).toUpperCase() || "INR";
    const amountPaise = Math.max(0, Math.floor(args.amount_paise));
    if (!refundId || !paymentId || amountPaise <= 0) {
      throw new Error("Razorpay refund payload is incomplete.");
    }

    const order = await ctx.db
      .query("orders")
      .withIndex("by_payment_id", (q) => q.eq("payment_id", paymentId))
      .first();
    const timestamp = nowIso();
    const existing = await ctx.db
      .query("razorpay_refunds")
      .withIndex("by_refund_id", (q) => q.eq("refund_id", refundId))
      .first();
    const razorpayOrderId = cleanNullable(args.razorpay_order_id, 120);
    const refundRecord = {
      payment_id: paymentId,
      ...(razorpayOrderId ? { razorpay_order_id: razorpayOrderId } : {}),
      ...(order ? { order_id: order._id } : {}),
      amount_paise: amountPaise,
      currency,
      status,
      error: cleanNullable(args.error, 500),
      updated_at: timestamp,
    };
    if (existing) {
      await ctx.db.patch(existing._id, refundRecord);
    } else {
      await ctx.db.insert("razorpay_refunds", {
        refund_id: refundId,
        ...refundRecord,
        created_at: timestamp,
      });
    }

    const refunds = await ctx.db
      .query("razorpay_refunds")
      .withIndex("by_payment_id", (q) => q.eq("payment_id", paymentId))
      .take(100);
    const paymentAmountPaise = Math.max(
      0,
      Math.floor(
        args.payment_amount_paise ??
          (order ? Number(order.total_inr ?? order.total ?? 0) * 100 : 0),
      ),
    );
    const { refundedPaise, fullyRefunded, refundStatus } = summarizeRefundLifecycle({
      refunds,
      totalRefundedPaise: args.total_refunded_paise,
      paymentAmountPaise,
      fallbackStatus: status,
    });

    if (order) {
      await ctx.db.patch(order._id, {
        refund_status: refundStatus,
        refunded_amount_inr: Math.round(refundedPaise) / 100,
        latest_refund_id: refundId,
        refund_updated_at: timestamp,
        payment_status:
          refundedPaise > 0
            ? fullyRefunded
              ? "refunded"
              : "partially_refunded"
            : order.payment_status,
        updated_at: timestamp,
      });
    }

    return {
      linked: Boolean(order),
      refund_status: refundStatus,
      refunded_amount_inr: Math.round(refundedPaise) / 100,
    };
  },
});

export const syncRazorpayDispute = internalMutation({
  args: {
    dispute_id: v.string(),
    payment_id: v.string(),
    amount_paise: v.number(),
    currency: v.string(),
    status: v.string(),
    phase: v.optional(v.union(v.string(), v.null())),
    reason_code: v.optional(v.union(v.string(), v.null())),
    respond_by: v.optional(v.union(v.number(), v.null())),
    event_type: v.string(),
  },
  returns: v.object({ linked: v.boolean(), dispute_status: v.string() }),
  handler: async (ctx, args) => {
    const disputeId = cleanText(args.dispute_id, 120);
    const paymentId = cleanText(args.payment_id, 120);
    const amountPaise = Math.max(0, Math.floor(args.amount_paise));
    const currency = cleanText(args.currency, 12).toUpperCase() || "INR";
    const status = cleanText(args.status, 40).toLowerCase() || "open";
    if (!disputeId || !paymentId) throw new Error("Razorpay dispute payload is incomplete.");

    const order = await ctx.db
      .query("orders")
      .withIndex("by_payment_id", (q) => q.eq("payment_id", paymentId))
      .first();
    const existing = await ctx.db
      .query("razorpay_disputes")
      .withIndex("by_dispute_id", (q) => q.eq("dispute_id", disputeId))
      .first();
    const timestamp = nowIso();
    const disputeRecord = {
      payment_id: paymentId,
      ...(order ? { order_id: order._id } : {}),
      amount_paise: amountPaise,
      currency,
      status,
      phase: cleanNullable(args.phase, 40),
      reason_code: cleanNullable(args.reason_code, 120),
      respond_by:
        typeof args.respond_by === "number" && Number.isFinite(args.respond_by)
          ? Math.floor(args.respond_by)
          : null,
      event_type: cleanText(args.event_type, 80),
      updated_at: timestamp,
    };
    if (existing) await ctx.db.patch(existing._id, disputeRecord);
    else
      await ctx.db.insert("razorpay_disputes", {
        dispute_id: disputeId,
        ...disputeRecord,
        created_at: timestamp,
      });

    if (order) {
      await ctx.db.patch(order._id, {
        dispute_status: status,
        latest_dispute_id: disputeId,
        dispute_amount_inr: amountPaise / 100,
        dispute_reason: cleanNullable(args.reason_code, 120),
        dispute_phase: cleanNullable(args.phase, 40),
        dispute_respond_by:
          typeof args.respond_by === "number" && Number.isFinite(args.respond_by)
            ? Math.floor(args.respond_by)
            : null,
        dispute_updated_at: timestamp,
        updated_at: timestamp,
      });
    }
    return { linked: Boolean(order), dispute_status: status };
  },
});

export const cleanupRazorpayWebhookEvents = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("razorpay_webhook_events")
      .withIndex("by_expires_at", (q) => q.lt("expires_at", Date.now()))
      .take(250);
    for (const event of expired) await ctx.db.delete(event._id);
    return expired.length;
  },
});

export const cleanupPaymentTechnicalRecords = internalMutation({
  args: {},
  returns: v.object({ checkout_intents: v.number(), webhook_events: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - PAYMENT_TECHNICAL_RETENTION_MS;
    let deletedIntents = 0;
    for (const status of ["completed", "released", "failed"]) {
      const rows = await ctx.db
        .query("checkout_intents")
        .withIndex("by_status_expires_at", (q) => q.eq("status", status).lt("expires_at", cutoff))
        .take(250);
      for (const row of rows) await ctx.db.delete(row._id);
      deletedIntents += rows.length;
    }
    const webhookRows = await ctx.db
      .query("razorpay_webhook_events")
      .withIndex("by_expires_at", (q) => q.lt("expires_at", Date.now()))
      .take(500);
    for (const row of webhookRows) await ctx.db.delete(row._id);
    return { checkout_intents: deletedIntents, webhook_events: webhookRows.length };
  },
});

export const razorpayWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return new Response("Webhook secret is not configured.", { status: 503 });
  const rawBody = await request.text();
  const receivedSignature = request.headers.get("x-razorpay-signature") ?? "";
  const expectedSignature = await hmacSha256Hex(secret, rawBody);
  if (!timingSafeEqual(expectedSignature, receivedSignature))
    return new Response("Invalid signature.", { status: 401 });
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  if (!eventId) return new Response("Missing event ID.", { status: 400 });
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON payload.", { status: 400 });
  }
  let payment = payload?.payload?.payment?.entity;
  const refund = payload?.payload?.refund?.entity;
  const dispute = payload?.payload?.dispute?.entity;
  const order = payload?.payload?.order?.entity;
  const eventType = cleanText(payload?.event, 80);
  if (eventType === "order.paid" && !payment?.id && order?.id) {
    const result = await razorpayRequest(ctx, `/orders/${cleanText(order.id, 120)}/payments`);
    const payments = Array.isArray(result?.items) ? result.items : [];
    payment = payments.find(
      (item: any) =>
        item?.status === "captured" &&
        item?.order_id === order.id &&
        item?.currency === "INR" &&
        Number.isFinite(item?.amount),
    );
  }
  const effectiveEventType =
    eventType === "order.paid" && payment?.status === "captured" ? "payment.captured" : eventType;
  const razorpayOrderId = payment?.order_id
    ? cleanText(payment.order_id, 120)
    : order?.id
      ? cleanText(order.id, 120)
      : undefined;
  const razorpayPaymentId = payment?.id ? cleanText(payment.id, 120) : undefined;
  const razorpayRefundId = refund?.id ? cleanText(refund.id, 120) : undefined;
  const razorpayDisputeId = dispute?.id ? cleanText(dispute.id, 120) : undefined;
  const recorded = await ctx.runMutation(internal.orders.recordRazorpayWebhook, {
    event_id: eventId,
    event_type: effectiveEventType,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_refund_id: razorpayRefundId,
    razorpay_dispute_id: razorpayDisputeId,
    amount_paise: Number.isFinite(payment?.amount) ? payment.amount : undefined,
    currency: payment?.currency ? cleanText(payment.currency, 12) : undefined,
  });
  if (recorded.duplicate && ["processed", "ignored", "failed"].includes(recorded.status)) {
    return new Response("ok", { status: 200 });
  }

  try {
    if (
      effectiveEventType.startsWith("payment.dispute.") &&
      razorpayDisputeId &&
      dispute?.payment_id
    ) {
      const synced = await ctx.runMutation(internal.orders.syncRazorpayDispute, {
        dispute_id: razorpayDisputeId,
        payment_id: cleanText(dispute.payment_id, 120),
        amount_paise: Math.max(0, Math.floor(Number(dispute.amount ?? 0))),
        currency: cleanText(dispute.currency ?? payment?.currency ?? "INR", 12) || "INR",
        status: cleanText(dispute.status ?? effectiveEventType.replace("payment.dispute.", ""), 40),
        phase: cleanNullable(dispute.phase, 40),
        reason_code: cleanNullable(dispute.reason_code, 120),
        respond_by: Number.isFinite(dispute.respond_by) ? dispute.respond_by : null,
        event_type: effectiveEventType,
      });
      await ctx.runMutation(internal.orders.updateRazorpayWebhookEvent, {
        event_id: eventId,
        processing_status: synced.linked ? "processed" : "ignored",
        error: synced.linked ? null : "No store order matched this disputed payment.",
      });
    } else if (
      ["refund.created", "refund.processed", "refund.failed"].includes(effectiveEventType) &&
      razorpayRefundId &&
      refund?.payment_id
    ) {
      const refundError =
        cleanNullable(
          refund?.error_description ?? refund?.error_reason ?? refund?.error_code ?? null,
          500,
        ) ?? null;
      const synced = await ctx.runMutation(internal.orders.syncRazorpayRefund, {
        refund_id: razorpayRefundId,
        payment_id: cleanText(refund.payment_id, 120),
        razorpay_order_id: razorpayOrderId,
        amount_paise: Math.max(0, Math.floor(Number(refund.amount ?? 0))),
        total_refunded_paise: Number.isFinite(payment?.amount_refunded)
          ? Math.max(0, Math.floor(payment.amount_refunded))
          : undefined,
        payment_amount_paise: Number.isFinite(payment?.amount)
          ? Math.max(0, Math.floor(payment.amount))
          : undefined,
        currency: cleanText(refund.currency ?? payment?.currency ?? "INR", 12) || "INR",
        status: cleanText(refund.status ?? effectiveEventType.replace("refund.", ""), 40),
        error: refundError,
      });
      await ctx.runMutation(internal.orders.updateRazorpayWebhookEvent, {
        event_id: eventId,
        processing_status: synced.linked ? "processed" : "ignored",
        error: synced.linked ? null : "No store order matched this Razorpay payment.",
      });
    } else if (
      effectiveEventType === "payment.authorized" &&
      razorpayOrderId &&
      razorpayPaymentId
    ) {
      const intent = await ctx.runQuery(internal.orders.findCheckoutIntent, {
        razorpay_order_id: razorpayOrderId,
      });
      if (!intent) {
        await ctx.runMutation(internal.orders.updateRazorpayWebhookEvent, {
          event_id: eventId,
          processing_status: "ignored",
          error: "No checkout intent matched this authorised payment.",
        });
      } else {
        let captured = await razorpayRequest(ctx, `/payments/${razorpayPaymentId}`);
        if (captured?.status === "authorized") {
          try {
            captured = await razorpayRequest(ctx, `/payments/${razorpayPaymentId}/capture`, {
              method: "POST",
              body: JSON.stringify({ amount: intent.amount_paise, currency: "INR" }),
            });
          } catch {
            captured = await razorpayRequest(ctx, `/payments/${razorpayPaymentId}`);
          }
        }
        if (captured?.status !== "captured") {
          throw new Error("Authorised Razorpay payment is awaiting capture.");
        }
        await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          amount_paise: captured.amount,
          currency: captured.currency,
          payment_method: cleanNullable(captured.method, 40),
        });
        await ctx.runMutation(internal.orders.updateRazorpayWebhookEvent, {
          event_id: eventId,
          processing_status: "processed",
        });
      }
    } else if (effectiveEventType === "payment.captured" && razorpayOrderId && razorpayPaymentId) {
      await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        amount_paise: Number.isFinite(payment?.amount) ? payment.amount : undefined,
        currency: payment?.currency ? cleanText(payment.currency, 12) : undefined,
        payment_method: cleanNullable(payment?.method, 40),
      });
      await ctx.runMutation(internal.orders.updateRazorpayWebhookEvent, {
        event_id: eventId,
        processing_status: "processed",
      });
    } else if (effectiveEventType === "payment.failed" && razorpayOrderId) {
      const failure =
        cleanText(
          payment?.error_description ?? payment?.error_reason ?? payment?.error_code ?? "",
          500,
        ) || "Razorpay payment failed.";
      await ctx.runMutation(internal.orders.markCheckoutFailed, {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId ?? null,
        error: failure,
      });
      await ctx.runMutation(internal.orders.updateRazorpayWebhookEvent, {
        event_id: eventId,
        processing_status: "failed",
        error: failure,
      });
    } else {
      await ctx.runMutation(internal.orders.updateRazorpayWebhookEvent, {
        event_id: eventId,
        processing_status: "ignored",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    if (razorpayOrderId && effectiveEventType === "payment.captured") {
      await ctx.runMutation(internal.orders.markCheckoutRecovery, {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId ?? null,
        error: message,
      });
    }
    await ctx.runMutation(internal.orders.updateRazorpayWebhookEvent, {
      event_id: eventId,
      processing_status: "recovery_required",
      error: message,
    });
    return new Response("Webhook processing failed.", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});

export const listMine = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx);
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
      .order("desc")
      .take(200);
    const enriched = await Promise.all(rows.map((row) => orderWithItems(ctx, row)));
    return enriched.sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
  },
});

export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 100), 1), 500);
    const rows = await ctx.db.query("orders").take(limit);
    const enriched = await Promise.all(rows.map((row) => orderWithItems(ctx, row)));
    return enriched.sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
  },
});

export const updateStatus = mutation({
  args: { id: v.string(), status: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = cleanText(args.status, 24).toLowerCase();
    if (!ORDER_STATUSES.has(status)) throw new Error("Invalid order status.");
    const order = (await ctx.db.get(args.id as any)) as any;
    if (!order) throw new Error("Order not found.");
    const timestamp = nowIso();
    const patch: Record<string, any> = { status, updated_at: timestamp };
    if (order.payment_provider === "WHATSAPP") {
      const activatesOrder = WHATSAPP_STOCK_STATUSES.has(status);
      const closesOrder = status === "cancelled" || status === "returned";
      if (activatesOrder && order.promotion_id && !order.promotion_reserved) {
        await reservePromotionUse(ctx, order.promotion_id);
        patch.promotion_reserved = true;
      }
      if (WHATSAPP_STOCK_STATUSES.has(status) && !order.stock_adjusted_at) {
        await adjustOrderStock(ctx, order._id, -1);
        patch.stock_adjusted_at = timestamp;
        patch.stock_restored_at = null;
        patch.payment_status = status === "paid" ? "paid" : (order.payment_status ?? "unconfirmed");
      }
      if ((status === "cancelled" || status === "returned") && order.stock_adjusted_at) {
        await adjustOrderStock(ctx, order._id, 1);
        patch.stock_adjusted_at = null;
        patch.stock_restored_at = timestamp;
        patch.payment_status =
          status === "cancelled" ? "cancelled" : (order.payment_status ?? "unconfirmed");
      }
      if (closesOrder && order.promotion_id && order.promotion_reserved) {
        await releasePromotionUse(ctx, order.promotion_id);
        patch.promotion_reserved = false;
      }
    }
    if (order.payment_provider === "RAZORPAY") {
      const closesOrder = status === "cancelled" || status === "returned";
      if (closesOrder && order.payment_status !== "refunded") {
        throw new Error("Complete the full refund in Razorpay before closing this paid order.");
      }
      if (closesOrder && !order.stock_restored_at) {
        await adjustOrderStock(ctx, order._id, 1);
        patch.stock_restored_at = timestamp;
      }
      if (!closesOrder && order.stock_restored_at) {
        throw new Error("A refunded order with restored stock cannot be reopened.");
      }
    }
    await ctx.db.patch(args.id as any, patch);
    const redemptionStatus =
      status === "cancelled"
        ? "cancelled"
        : status === "returned"
          ? "returned"
          : order.payment_provider === "WHATSAPP" && !WHATSAPP_STOCK_STATUSES.has(status)
            ? "pending"
            : "awarded";
    const redemptions = await ctx.db
      .query("gift_redemptions")
      .withIndex("by_order_id", (lookup) => lookup.eq("order_id", order._id))
      .take(20);
    for (const redemption of redemptions) {
      if (redemption.status !== redemptionStatus) {
        await ctx.db.patch(redemption._id, { status: redemptionStatus });
      }
    }
    await writeAuditLog(ctx, {
      action: "order.status.update",
      entityType: "order",
      entityId: args.id,
      summary: status,
    });
    return true;
  },
});

async function adjustOrderStock(ctx: any, orderId: any, direction: -1 | 1) {
  const items = await ctx.db
    .query("order_items")
    .withIndex("by_order_id", (q: any) => q.eq("order_id", orderId))
    .take(100);
  const timestamp = nowIso();
  for (const item of items) {
    if (!item.product_id) continue;
    const product = (await ctx.db.get(item.product_id as any)) as any;
    if (!product) continue;
    const quantity = Math.max(1, Math.floor(Number(item.quantity ?? 1)));
    if (
      direction === -1 &&
      (Number(product.stock_quantity ?? 0) < quantity || product.in_stock === false)
    ) {
      throw new Error(`Not enough stock for ${product.name}.`);
    }
    const nextStock = Math.max(0, Number(product.stock_quantity ?? 0) + direction * quantity);
    await ctx.db.patch(product._id, {
      stock_quantity: nextStock,
      in_stock: nextStock > 0,
      updated_at: timestamp,
    });
  }
}

export const updateTracking = mutation({
  args: {
    id: v.string(),
    carrier: v.optional(v.union(v.string(), v.null())),
    trackingNumber: v.string(),
    trackingUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const trackingNumber = cleanText(args.trackingNumber, 120);
    if (!trackingNumber) throw new Error("Tracking number is required.");
    await ctx.db.patch(args.id as any, {
      tracking_carrier: cleanNullable(args.carrier, 80),
      tracking_number: trackingNumber,
      tracking_url: cleanTrackingUrl(args.trackingUrl),
      status: "shipped",
      updated_at: nowIso(),
    });
    await writeAuditLog(ctx, {
      action: "order.tracking.update",
      entityType: "order",
      entityId: args.id,
      summary: trackingNumber,
      metadata: { carrier: args.carrier ?? null },
    });
    const order = await ctx.db.get(args.id as any);
    return order ? await orderWithItems(ctx, order) : null;
  },
});

export const getByNumber = query({
  args: { orderNumber: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const rawOrderNumber = cleanText(args.orderNumber, 40).toUpperCase();
    const orderNumber = /^\d+$/.test(rawOrderNumber) ? `#${rawOrderNumber}` : rawOrderNumber;
    const email = cleanEmail(args.email);
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("order_number", orderNumber))
      .first();
    if (!order || order.customer_email?.trim().toLowerCase() !== email) return null;
    return await orderWithItems(ctx, order);
  },
});
