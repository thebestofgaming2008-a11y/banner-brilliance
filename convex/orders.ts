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
import {
  isAdminEmail,
  nowIso,
  publicOrder,
  requireAdmin,
  requireIdentity,
  writeAuditLog,
} from "./lib";
import { checkoutShippingForCountry } from "./shipping";

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

async function nextOrderNumber(ctx: any) {
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
    .collect();
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

async function checkoutQuote(ctx: any, cart: Array<any>) {
  if (!cart.length) throw new Error("Cart is empty.");
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
  const total = subtotal + shipping;
  return {
    subtotal,
    shipping,
    total,
    amountPaise: Math.round(total * 100),
    itemCount,
    validatedCart,
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
    .collect();
  for (const intent of expired) {
    if (intent.stock_reserved !== false) await restoreReservedStock(ctx, intent.cart);
    await ctx.db.patch(intent._id, {
      status: "released",
      stock_reserved: false,
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
  await ctx.db.patch(intent._id, {
    status: "failed",
    stock_reserved: false,
    payment_id: args.razorpay_payment_id ?? null,
    error: cleanNullable(args.error, 500),
    updated_at: nowIso(),
  });
  return true;
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
    locked_amount_paise?: number;
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
    return publicOrder(existingByPayment);
  }
  const existingByRazorpayOrder = await ctx.db
    .query("orders")
    .withIndex("by_payment_order_id", (q: any) => q.eq("payment_order_id", args.razorpay_order_id))
    .first();
  if (existingByRazorpayOrder) {
    if (existingByRazorpayOrder.payment_id !== args.razorpay_payment_id)
      throw new Error("This Razorpay order is already linked to another payment.");
    return publicOrder(existingByRazorpayOrder);
  }
  if (!args.cart.length) throw new Error("Cart is empty.");
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

  const normalizedItems = [];
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
    const unitPrice =
      args.locked_amount_paise !== undefined
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
    normalizedItems.push({ product, qty, unitPrice, selectedColor, selectedSize });
  }

  const shippingMeta = requireIndiaShipping(customer.country);
  const computedShipping = shippingMeta.amount;
  const computedTotal = computedSubtotal + computedShipping;
  if (
    args.locked_amount_paise !== undefined &&
    Math.round(computedTotal * 100) !== args.locked_amount_paise
  ) {
    throw new Error("Reserved checkout total does not match the captured Razorpay amount.");
  }
  const timestamp = nowIso();
  const orderNumber = await nextOrderNumber(ctx);
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
    discount: 0,
    total: computedTotal,
    total_inr: computedTotal,
    currency: "INR",
    shipping_address: customer,
    payment_provider: "RAZORPAY",
    payment_order_id: cleanText(args.razorpay_order_id, 120),
    payment_id: cleanText(args.razorpay_payment_id, 120),
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
    });
    if (!args.stock_already_reserved) {
      const nextStock = Math.max(0, (item.product.stock_quantity ?? 0) - item.qty);
      await ctx.db.patch(item.product._id, {
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
  args: { cart: v.array(cartItem) },
  handler: async (ctx, args) => {
    return await checkoutQuote(ctx, args.cart);
  },
});

function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay keys are not configured.");
  return { keyId, keySecret };
}

function basicAuth(keyId: string, keySecret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = Array.from(new TextEncoder().encode(`${keyId}:${keySecret}`));
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    encoded += second === undefined ? "=" : alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)];
    encoded += third === undefined ? "=" : alphabet[third & 63];
  }
  return `Basic ${encoded}`;
}

async function razorpayRequest(path: string, init: RequestInit = {}) {
  const { keyId, keySecret } = razorpayKeys();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: basicAuth(keyId, keySecret),
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.description ?? "Razorpay request failed.");
  return body;
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
  args: checkoutPayload,
  handler: async (ctx, args) => {
    validateCheckoutCustomer(args.customer);
    const quote = await ctx.runQuery(api.orders.quoteCheckout, { cart: args.cart });
    if (quote.amountPaise < 100) throw new Error("Order total must be at least INR 1.");
    const { keyId } = razorpayKeys();
    const receipt = `FZ-${Date.now().toString().slice(-8)}`;
    const order = await razorpayRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: quote.amountPaise,
        currency: "INR",
        receipt,
        notes: {
          customer: cleanText(args.customer.name, 80),
          email: cleanText(args.customer.email, 120),
        },
      }),
    });
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getAuthUserId(ctx) : null;
    await ctx.runMutation(internal.orders.reserveCheckoutIntent, {
      razorpay_order_id: order.id,
      user_id: userId,
      cart: args.cart,
      customer: args.customer,
      amount_paise: quote.amountPaise,
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
  },
  handler: async (ctx, args) => {
    await releaseExpiredReservations(ctx);
    const existing = await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q: any) =>
        q.eq("razorpay_order_id", args.razorpay_order_id),
      )
      .first();
    if (existing) return existing._id;
    const quote = await checkoutQuote(ctx, args.cart);
    if (quote.amountPaise !== args.amount_paise)
      throw new Error("Checkout total changed. Please try again.");
    const timestamp = nowIso();
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
    return await ctx.db.insert("checkout_intents", {
      razorpay_order_id: args.razorpay_order_id,
      user_id: args.user_id ?? null,
      payment_id: null,
      status: "pending",
      cart: quote.validatedCart,
      customer: args.customer,
      amount_paise: args.amount_paise,
      error: null,
      stock_reserved: true,
      reconciliation_attempts: 0,
      last_reconciled_at: null,
      expires_at: Date.now() + CHECKOUT_RESERVATION_MS,
      created_at: timestamp,
      updated_at: timestamp,
    });
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
    return await ctx.db
      .query("orders")
      .withIndex("by_payment_order_id", (q: any) =>
        q.eq("payment_order_id", args.razorpay_order_id),
      )
      .first();
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
    locked_amount_paise: hasServerSnapshot ? intent.amount_paise : undefined,
    stock_already_reserved: stockAlreadyReserved,
  });
  await ctx.db.patch(intent._id, {
    status: "completed",
    payment_id: args.razorpay_payment_id,
    error: null,
    stock_reserved: false,
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
  },
  handler: async (ctx, args) => {
    return await savePaidOrder(ctx, args);
  },
});

export const verifyRazorpayPayment = action({
  args: {
    ...checkoutPayload,
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    razorpay_signature: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
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
      (await ctx.runQuery(api.orders.quoteCheckout, { cart: args.cart })).amountPaise;

    const [razorpayOrder, fetchedPayment] = await Promise.all([
      razorpayRequest(`/orders/${args.razorpay_order_id}`),
      razorpayRequest(`/payments/${args.razorpay_payment_id}`),
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
        payment = await razorpayRequest(`/payments/${args.razorpay_payment_id}/capture`, {
          method: "POST",
          body: JSON.stringify({ amount: expectedAmountPaise, currency: "INR" }),
        });
      } catch {
        // A repeated callback can race with capture. Refetch before treating it as a failed paid order.
        payment = await razorpayRequest(`/payments/${args.razorpay_payment_id}`);
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
      user_id: userId,
      razorpay_order_id: args.razorpay_order_id,
      razorpay_payment_id: args.razorpay_payment_id,
      razorpay_signature: args.razorpay_signature,
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

export const recordReconciliationAttempt = internalMutation({
  args: { razorpay_order_id: v.string() },
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
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const statuses = ["pending", "released", "recovery_required"];
    const rows = [];
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    for (const status of statuses) {
      const matches = await ctx.db
        .query("checkout_intents")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(100);
      rows.push(
        ...matches.filter(
          (intent) =>
            intent.expires_at >= cutoff && Number(intent.reconciliation_attempts ?? 0) < 12,
        ),
      );
    }
    return rows.sort((a, b) => b._creationTime - a._creationTime).slice(0, limit);
  },
});

async function capturedPaymentForIntent(intent: any) {
  const result = await razorpayRequest(`/orders/${intent.razorpay_order_id}/payments`);
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
      payment = await razorpayRequest(`/payments/${payment.id}/capture`, {
        method: "POST",
        body: JSON.stringify({ amount: intent.amount_paise, currency: "INR" }),
      });
    } catch {
      payment = await razorpayRequest(`/payments/${payment.id}`);
    }
  }
  return payment?.status === "captured" ? payment : null;
}

export const reconcileCapturedPayments = internalAction({
  args: {},
  handler: async (ctx) => {
    const intents: any[] = await ctx.runQuery(internal.orders.listUnresolvedCheckoutIntents, {
      limit: 75,
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
        const captured = await capturedPaymentForIntent(intent);
        if (!captured?.id) continue;
        let order;
        try {
          order = await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
            razorpay_order_id: intent.razorpay_order_id,
            razorpay_payment_id: cleanText(captured.id, 120),
            amount_paise: captured.amount,
            currency: captured.currency,
          });
        } catch (error) {
          await ctx.runMutation(internal.orders.markCheckoutRecovery, {
            razorpay_order_id: intent.razorpay_order_id,
            razorpay_payment_id: cleanText(captured.id, 120),
            error: error instanceof Error ? error.message : "Reconciliation failed.",
          });
          throw error;
        }
        if (order) finalized += 1;
      } catch (error) {
        errors.push(
          `${intent.razorpay_order_id}: ${
            error instanceof Error ? cleanText(error.message, 160) : "Unknown reconciliation error"
          }`,
        );
      }
    }
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
    const payment = await capturedPaymentForIntent(intent);
    if (!payment?.id) {
      return { status: "not_captured", order: null };
    }
    try {
      const order = await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
        razorpay_order_id: intent.razorpay_order_id,
        razorpay_payment_id: cleanText(payment.id, 120),
        amount_paise: payment.amount,
        currency: payment.currency,
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

export const listPaymentRecoveries = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("checkout_intents")
      .withIndex("by_status", (q) => q.eq("status", "recovery_required"))
      .collect();
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
    amount_paise: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
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
      processing_status: "received",
      created_at: nowIso(),
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

export const razorpayWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
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
  const order = payload?.payload?.order?.entity;
  const eventType = cleanText(payload?.event, 80);
  if (eventType === "order.paid" && !payment?.id && order?.id) {
    const result = await razorpayRequest(`/orders/${cleanText(order.id, 120)}/payments`);
    const payments = Array.isArray(result?.items) ? result.items : [];
    payment = payments.find(
      (item: any) =>
        item?.status === "captured" &&
        item?.order_id === order.id &&
        item?.currency === "INR" &&
        Number.isFinite(item?.amount),
    );
  }
  const effectiveEventType = payment?.status === "captured" ? "payment.captured" : eventType;
  const razorpayOrderId = payment?.order_id
    ? cleanText(payment.order_id, 120)
    : order?.id
      ? cleanText(order.id, 120)
      : undefined;
  const razorpayPaymentId = payment?.id ? cleanText(payment.id, 120) : undefined;
  await ctx.runMutation(internal.orders.recordRazorpayWebhook, {
    event_id: eventId,
    event_type: effectiveEventType,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    amount_paise: Number.isFinite(payment?.amount) ? payment.amount : undefined,
    currency: payment?.currency ? cleanText(payment.currency, 12) : undefined,
  });

  try {
    if (effectiveEventType === "payment.captured" && razorpayOrderId && razorpayPaymentId) {
      await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        amount_paise: Number.isFinite(payment?.amount) ? payment.amount : undefined,
        currency: payment?.currency ? cleanText(payment.currency, 12) : undefined,
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
  }
  return new Response("ok", { status: 200 });
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx);
    const byUser = await ctx.db
      .query("orders")
      .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
      .collect();
    const email = String((auth.user as any).email ?? "")
      .trim()
      .toLowerCase();
    const byEmail = email
      ? await ctx.db
          .query("orders")
          .withIndex("by_customer_email", (q) => q.eq("customer_email", email))
          .collect()
      : [];
    const rows = Array.from(
      new Map([...byUser, ...byEmail].map((row) => [String(row._id), row])).values(),
    );
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
    const rows = await ctx.db.query("orders").take(args.limit ?? 100);
    const enriched = await Promise.all(rows.map((row) => orderWithItems(ctx, row)));
    return enriched.sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
  },
});

export const updateStatus = mutation({
  args: { id: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = cleanText(args.status, 24).toLowerCase();
    if (!ORDER_STATUSES.has(status)) throw new Error("Invalid order status.");
    const order = (await ctx.db.get(args.id as any)) as any;
    if (!order) throw new Error("Order not found.");
    const timestamp = nowIso();
    const patch: Record<string, any> = { status, updated_at: timestamp };
    if (order.payment_provider === "WHATSAPP") {
      if (WHATSAPP_STOCK_STATUSES.has(status) && !order.stock_adjusted_at) {
        await adjustWhatsAppOrderStock(ctx, order._id, -1);
        patch.stock_adjusted_at = timestamp;
        patch.stock_restored_at = null;
        patch.payment_status = status === "paid" ? "paid" : (order.payment_status ?? "unconfirmed");
      }
      if ((status === "cancelled" || status === "returned") && order.stock_adjusted_at) {
        await adjustWhatsAppOrderStock(ctx, order._id, 1);
        patch.stock_adjusted_at = null;
        patch.stock_restored_at = timestamp;
        patch.payment_status =
          status === "cancelled" ? "cancelled" : (order.payment_status ?? "unconfirmed");
      }
    }
    await ctx.db.patch(args.id as any, patch);
    await writeAuditLog(ctx, {
      action: "order.status.update",
      entityType: "order",
      entityId: args.id,
      summary: status,
    });
    return true;
  },
});

async function adjustWhatsAppOrderStock(ctx: any, orderId: any, direction: -1 | 1) {
  const items = await ctx.db
    .query("order_items")
    .withIndex("by_order_id", (q: any) => q.eq("order_id", orderId))
    .collect();
  const timestamp = nowIso();
  for (const item of items) {
    if (!item.product_id) continue;
    const product = (await ctx.db.get(item.product_id as any)) as any;
    if (!product) continue;
    const quantity = Math.max(1, Math.floor(Number(item.quantity ?? 1)));
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
