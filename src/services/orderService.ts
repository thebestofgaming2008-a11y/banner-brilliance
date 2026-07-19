import type { CartItem } from "@/lib/cart";
import type { Product } from "@/lib/products";
import { listActiveProducts } from "@/services/productService";
import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";
import { whatsappUrl } from "@/lib/store-config";

type CheckoutCustomer = {
  email: string;
  phone: string;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
};

type BackendCheckoutItem = {
  cartKey: string;
  productId: string;
  qty: number;
  name: string;
  price: number;
  priceInr: number;
  image?: string | null;
  slug?: string | null;
  selectedColor?: string | null;
  selectedSize?: string | null;
};

type BackendCheckoutPayload = {
  cart: BackendCheckoutItem[];
  customer: CheckoutCustomer;
  subtotal: number;
  shipping: number;
  total: number;
};

type WhatsAppOrderResult = {
  order: Record<string, unknown> | null;
  whatsappUrl: string;
};

function optionValue(variant: string | undefined, index: number) {
  return variant
    ?.split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean)[index];
}

function productSlugFromCartItem(item: CartItem) {
  return item.slug || item.id.split("__")[0] || item.id;
}

function normalizeMatchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(red|white|ivory|embroidered|woven|multi|flora|wild|black|acacia|500g|standard|one|size|long)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function isBackendProduct(product: Product | undefined) {
  return Boolean(product?.id && product.id !== product.slug);
}

function resolveCheckoutProduct(item: CartItem, products: Product[]) {
  const slug = productSlugFromCartItem(item);
  const liveProducts = products.filter(isBackendProduct);
  const byId = liveProducts.find(
    (product) => product.id === item.productId || product.id === item.id,
  );
  if (byId) return byId;

  const bySlug = liveProducts.find(
    (product) => product.slug === slug || product.slug === item.slug,
  );
  if (bySlug) return bySlug;

  const itemText = normalizeMatchText(`${item.name} ${slug}`);
  const itemTokens = new Set(itemText.split(" ").filter((token) => token.length > 2));
  return liveProducts.find((product) => {
    const productText = normalizeMatchText(`${product.name} ${product.slug} ${product.collection}`);
    const productTokens = productText.split(" ").filter((token) => token.length > 2);
    if (!productTokens.length) return false;
    const shared = productTokens.filter((token) => itemTokens.has(token)).length;
    return shared >= Math.min(2, productTokens.length);
  });
}

async function buildBackendCheckoutPayload(args: {
  cart: CartItem[];
  customer: CheckoutCustomer;
  subtotal: number;
  shipping: number;
  total: number;
}): Promise<BackendCheckoutPayload> {
  const products = await listActiveProducts();
  const cart = args.cart.map((item) => {
    const slug = productSlugFromCartItem(item);
    const product = resolveCheckoutProduct(item, products);
    const productId = product?.id;
    if (!productId || productId === product.slug) {
      throw new Error(
        `${item.name} is not connected to the live catalog yet. Please remove it and add it again from the shop.`,
      );
    }
    const selectedColor = optionValue(item.variant, 0) ?? product?.colors?.[0]?.name ?? null;
    const selectedSize = optionValue(item.variant, 1) ?? product?.sizes?.[0] ?? null;
    return {
      cartKey: item.id,
      productId,
      qty: item.qty,
      name: item.name,
      price: item.price,
      priceInr: item.price,
      image: item.img,
      slug,
      selectedColor,
      selectedSize,
    };
  });

  return {
    cart,
    customer: args.customer,
    subtotal: args.subtotal,
    shipping: args.shipping,
    total: args.total,
  };
}

function productPageUrl(item: CartItem) {
  const slug = productSlugFromCartItem(item);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : String(import.meta.env.VITE_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  return origin ? `${origin}/products/${encodeURIComponent(slug)}` : `/products/${slug}`;
}

function buildWhatsAppMessage(cart: CartItem[], customer: CheckoutCustomer, total: number) {
  const lines = [
    `Assalamu alaikum. I would like to order to ${customer.country}.`,
    "",
    `Name: ${customer.name}`,
    `Email: ${customer.email}`,
    `WhatsApp number: ${customer.phone}`,
    "",
    `Country: ${customer.country}`,
    `Address: ${customer.address_line_1}${customer.address_line_2 ? `, ${customer.address_line_2}` : ""}`,
    `City: ${customer.city}`,
    `State / province / region: ${customer.state ?? ""}`,
    `Postal code: ${customer.postal_code}`,
    "",
    ...cart.flatMap((item, index) => [
      `${index + 1}. ${item.name}`,
      `   Quantity: ${item.qty}`,
      `   Variant/options: ${item.variant || "None"}`,
      `   Product page: ${productPageUrl(item)}`,
      "",
    ]),
    `Product subtotal: INR ${total.toLocaleString("en-IN")}`,
    "Please confirm availability, international shipping, and payment details.",
  ];
  return lines.join("\n");
}

function configuredWhatsAppUrl(message: string) {
  return whatsappUrl(message);
}

export async function createBackendWhatsAppOrder(args: {
  cart: CartItem[];
  customer: CheckoutCustomer;
  total: number;
  requestId: string;
}): Promise<WhatsAppOrderResult> {
  const payload = await buildBackendCheckoutPayload({
    cart: args.cart,
    customer: args.customer,
    subtotal: args.total,
    shipping: 0,
    total: args.total,
  });
  const order = (await convex.mutation(api.orders.createWhatsAppOrder, {
    cart: payload.cart,
    customer: payload.customer,
    client_request_id: args.requestId,
  })) as Record<string, unknown> | null;
  if (!order) throw new Error("The international order could not be saved.");
  const savedMessage = String(
    order.whatsapp_message ?? buildWhatsAppMessage(args.cart, args.customer, args.total),
  );
  return {
    order,
    whatsappUrl: configuredWhatsAppUrl(savedMessage),
  };
}

export async function createRazorpayOrder(args: {
  cart: CartItem[];
  customer: CheckoutCustomer;
  subtotal: number;
  shipping: number;
  total: number;
}) {
  const payload = await buildBackendCheckoutPayload(args);
  const response = await fetch("/api/create-order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error ?? "Could not create Razorpay order.");
  return { ...body, payload } as {
    order_id: string;
    orderId: string;
    amount: number;
    currency: string;
    key_id: string;
    payload: BackendCheckoutPayload;
  };
}

export async function verifyRazorpayPayment(args: {
  payload: BackendCheckoutPayload;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) {
  const response = await fetch("/api/verify-payment", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error ?? "Could not verify Razorpay payment.");
  return body.order;
}

export async function getRazorpayCheckoutStatus(razorpayOrderId: string, email: string) {
  return await convex.query(api.orders.getCheckoutStatus, {
    razorpay_order_id: razorpayOrderId,
    email,
  });
}
