import "./lib/error-capture";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { localBackendProducts } from "./lib/catalogBackend";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RuntimeEnv = Record<string, unknown>;
type R2ObjectBody = {
  body: ReadableStream<Uint8Array> | null;
  httpMetadata?: { contentType?: string };
  writeHttpMetadata?: (headers: Headers) => void;
};
type R2BucketLike = {
  put: (
    key: string,
    value: ReadableStream<Uint8Array> | ArrayBuffer,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
    },
  ) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectBody | null>;
};

const PUBLIC_SITE_URL = "https://fawzaanstore.pages.dev";
const SITEMAP_LASTMOD = "2026-07-18";
const CATALOG_CACHE_HEADERS = {
  "cache-control": "no-store",
};
const CURRENCY_CACHE_HEADERS = {
  "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
};
const FALLBACK_TAXONOMY = [
  { slug: "shemaghs", name: "Shemaghs", type: "collection", sort_order: 10 },
  { slug: "niqabs", name: "Niqabs", type: "collection", sort_order: 20 },
  { slug: "kufis", name: "Kufis", type: "collection", sort_order: 30 },
  { slug: "honey", name: "Honey", type: "collection", sort_order: 40 },
  { slug: "watches", name: "Watches", type: "collection", sort_order: 50 },
  { slug: "gloves", name: "Gloves", type: "collection", sort_order: 60 },
  { slug: "other", name: "Other", type: "collection", sort_order: 9999 },
];
const EURO_COUNTRIES = new Set([
  "AT",
  "BE",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
]);

function runtimeEnvCandidates(env: unknown, request?: Request): RuntimeEnv[] {
  const direct = (env ?? {}) as RuntimeEnv;
  const requestRuntime = (request as unknown as RuntimeEnv | undefined)?.runtime as
    RuntimeEnv | undefined;
  const requestCloudflare = requestRuntime?.cloudflare as RuntimeEnv | undefined;
  const globalRecord = globalThis as unknown as RuntimeEnv;
  return [
    direct,
    requestCloudflare?.env as RuntimeEnv,
    requestCloudflare,
    requestRuntime,
    (direct.cloudflare as RuntimeEnv | undefined)?.env as RuntimeEnv,
    (direct.context as RuntimeEnv | undefined)?.cloudflare as RuntimeEnv,
    ((direct.context as RuntimeEnv | undefined)?.cloudflare as RuntimeEnv | undefined)
      ?.env as RuntimeEnv,
    (globalRecord.cloudflare as RuntimeEnv | undefined)?.env as RuntimeEnv,
    globalRecord,
  ].filter((candidate): candidate is RuntimeEnv => Boolean(candidate));
}

function envString(env: unknown, name: string, request?: Request) {
  const value =
    runtimeEnvCandidates(env, request)
      .map((candidate) => candidate?.[name])
      .find((candidate) => typeof candidate === "string" && candidate.trim()) ?? process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function jsonResponse(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function withSecurityHeaders(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  const url = new URL(request.url);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=()",
  );
  const privatePath =
    /^(?:\/admin(?:\/|$)|\/account(?:\/|$)|\/cart(?:\/|$)|\/checkout(?:\/|$)|\/order(?:\/|$)|\/search(?:\/|$)|\/track-order(?:\/|$)|\/unsubscribe(?:\/|$)|\/wishlist(?:\/|$))/i.test(
      url.pathname,
    );
  const isPreviewHostname =
    url.hostname.endsWith(".fawzaanstore.pages.dev") && url.hostname !== "fawzaanstore.pages.dev";
  if (privatePath || isPreviewHostname) headers.set("x-robots-tag", "noindex, nofollow");
  if (response.headers.get("content-type")?.includes("text/html")) {
    headers.set("cache-control", privatePath ? "no-store" : "no-cache");
  }
  if (url.protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function convexClient(env: unknown, request?: Request) {
  const url =
    envString(env, "VITE_CONVEX_URL", request) ||
    envString(env, "CONVEX_URL", request) ||
    import.meta.env.VITE_CONVEX_URL;
  return url ? new ConvexHttpClient(url) : null;
}

function r2Bucket(env: unknown, request?: Request): R2BucketLike | null {
  const candidates = runtimeEnvCandidates(env, request).map(
    (runtime) => runtime?.PRODUCT_MEDIA_BUCKET,
  );
  return (candidates.find(
    (candidate) =>
      candidate &&
      typeof (candidate as R2BucketLike).put === "function" &&
      typeof (candidate as R2BucketLike).get === "function",
  ) ?? null) as R2BucketLike | null;
}

function trustedCorsHeaders(request: Request, env: unknown) {
  const origin = request.headers.get("origin") ?? "";
  if (!origin) return undefined;
  const requestOrigin = new URL(request.url).origin;
  const publicOrigin = envString(env, "VITE_PUBLIC_SITE_URL", request) || PUBLIC_SITE_URL;
  if (origin !== requestOrigin && origin !== publicOrigin) return undefined;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-admin-upload-token, x-file-name",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function safeFileName(value: string | null) {
  return (
    String(value ?? "product-media")
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "product-media"
  );
}

function extensionForContentType(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/avif") return "avif";
  if (contentType === "image/gif") return "gif";
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "video/webm") return "webm";
  return "bin";
}

function mediaUrlForKey(request: Request, env: unknown, key: string) {
  const publicBase = envString(env, "PUBLIC_MEDIA_URL", request).replace(/\/+$/, "");
  if (publicBase) return `${publicBase}/${key}`;
  return `${new URL(request.url).origin}/api/media/file/${encodeURIComponent(key)}`;
}

async function liveCatalogProducts(env: unknown, request: Request) {
  try {
    const client = convexClient(env, request);
    if (!client) return null;
    return await client.query(api.products.listActiveProducts, {});
  } catch (error) {
    console.error("Live catalog products unavailable", error);
    return null;
  }
}

async function liveCatalogProduct(
  env: unknown,
  request: Request,
  id: string | null,
  slug: string | null,
) {
  try {
    const client = convexClient(env, request);
    if (!client) return null;
    if (id) return await client.query(api.products.getProductById, { id });
    if (slug) return await client.query(api.products.getProductBySlug, { slug });
    return null;
  } catch (error) {
    console.error("Live catalog product unavailable", error);
    return null;
  }
}

function mergeLocalCatalogProducts(liveProducts: unknown[] | null | undefined) {
  if (!Array.isArray(liveProducts) || liveProducts.length === 0) return localBackendProducts;
  return liveProducts;
}

async function handleCatalogRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== "GET") return null;
  if (
    url.pathname !== "/api/catalog/products" &&
    url.pathname !== "/api/catalog/product" &&
    url.pathname !== "/api/catalog/presentation"
  ) {
    return null;
  }

  if (url.pathname === "/api/catalog/presentation") {
    const client = convexClient(env, request);
    if (!client)
      return jsonResponse({ taxonomy: FALLBACK_TAXONOMY, banners: [] }, 200, CATALOG_CACHE_HEADERS);
    const [taxonomy, banners, homepage] = await Promise.all([
      client.query(api.catalog.listActiveTaxonomy, {}),
      client.query(api.catalog.listActiveBanners, {}),
      client.query(api.homepage.getPublished, {}),
    ]);
    return jsonResponse(
      { taxonomy: taxonomy.length ? taxonomy : FALLBACK_TAXONOMY, banners, homepage },
      200,
      CATALOG_CACHE_HEADERS,
    );
  }

  if (url.pathname === "/api/catalog/products") {
    const products = mergeLocalCatalogProducts(
      (await liveCatalogProducts(env, request)) as unknown[],
    );
    return jsonResponse(products, 200, CATALOG_CACHE_HEADERS);
  }

  const id = url.searchParams.get("id")?.trim() || null;
  const slug = url.searchParams.get("slug")?.trim() || null;
  if (!id && !slug) return jsonResponse({ error: "Product id or slug is required." }, 400);
  const product = await liveCatalogProduct(env, request, id, slug);
  if (!product && convexClient(env, request)) return jsonResponse(null, 404, CATALOG_CACHE_HEADERS);
  const fallback =
    product ?? localBackendProducts.find((item) => (id ? item.id === id : item.slug === slug));
  return jsonResponse(fallback, fallback ? 200 : 404, CATALOG_CACHE_HEADERS);
}

async function handleMediaRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  const bucket = r2Bucket(env, request);

  if (url.pathname === "/api/media/upload") {
    const corsHeaders = trustedCorsHeaders(request, env);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "POST")
      return jsonResponse({ error: "Method not allowed." }, 405, corsHeaders);

    const expectedToken = envString(env, "ADMIN_UPLOAD_TOKEN", request);
    const receivedToken = request.headers.get("x-admin-upload-token")?.trim() ?? "";
    if (!expectedToken || receivedToken !== expectedToken) {
      return jsonResponse({ error: "Upload is not configured or authorized." }, 403, corsHeaders);
    }
    if (!bucket)
      return jsonResponse({ error: "R2 media bucket is not configured." }, 500, corsHeaders);
    if (!request.body)
      return jsonResponse({ error: "No upload body was received." }, 400, corsHeaders);

    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const fileName = safeFileName(request.headers.get("x-file-name"));
    const extension = fileName.includes(".")
      ? fileName.split(".").pop()?.toLowerCase() || extensionForContentType(contentType)
      : extensionForContentType(contentType);
    const key = `products/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    await bucket.put(key, request.body, {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { originalName: fileName },
    });

    return jsonResponse({ key, url: mediaUrlForKey(request, env, key) }, 200, {
      "cache-control": "no-store",
      ...corsHeaders,
    });
  }

  const mediaPrefix = "/api/media/file/";
  if (url.pathname.startsWith(mediaPrefix)) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }
    if (!bucket) return jsonResponse({ error: "R2 media bucket is not configured." }, 500);
    const key = decodeURIComponent(url.pathname.slice(mediaPrefix.length));
    if (!key || key.includes("..")) return jsonResponse({ error: "Invalid media key." }, 400);
    const object = await bucket.get(key);
    if (!object) return jsonResponse({ error: "Media not found." }, 404);
    const headers = new Headers();
    object.writeHttpMetadata?.(headers);
    if (!headers.has("content-type") && object.httpMetadata?.contentType) {
      headers.set("content-type", object.httpMetadata.contentType);
    }
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  }

  return null;
}

function detectedCurrencyForRequest(request: Request): string {
  const country = String(
    (request as unknown as { cf?: { country?: string } }).cf?.country ??
      request.headers.get("cf-ipcountry") ??
      "",
  ).toUpperCase();
  if (country === "IN") return "INR";
  if (country === "GB" || country === "GG" || country === "IM" || country === "JE") return "GBP";
  if (country === "CA") return "CAD";
  if (country === "AU") return "AUD";
  if (country === "AE") return "AED";
  if (country === "SA") return "SAR";
  if (country === "QA") return "QAR";
  if (country === "KW") return "KWD";
  if (country === "MY") return "MYR";
  if (country === "SG") return "SGD";
  if (country === "ZA") return "ZAR";
  if (EURO_COUNTRIES.has(country)) return "EUR";
  return "USD";
}

function normalizeCurrencyRates(payload: unknown): Record<string, number> | null {
  const source = payload as { conversion_rates?: unknown; rates?: unknown } | null;
  const rates = source?.conversion_rates ?? source?.rates;
  if (!rates || typeof rates !== "object") return null;
  const sourceRates = rates as Record<string, unknown>;
  const inrPerBase = Number(sourceRates.INR);
  if (!Number.isFinite(inrPerBase) || inrPerBase <= 0) return null;
  const next: Record<string, number> = { INR: 1 };
  for (const [code, rawRate] of Object.entries(sourceRates)) {
    if (code === "INR" || !/^[A-Z]{3}$/.test(code)) continue;
    const perBase = Number(rawRate);
    if (Number.isFinite(perBase) && perBase > 0) next[code] = perBase / inrPerBase;
  }
  return next;
}

async function handleCurrencyRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    (url.pathname !== "/api/rates" && url.pathname !== "/api/currency/rates")
  ) {
    return null;
  }
  const fallback = {
    base: "INR",
    rates: { INR: 1 },
    detected_currency: detectedCurrencyForRequest(request),
    source: "fallback",
    fetchedAt: new Date().toISOString(),
    error: "EXCHANGE_RATE_API_KEY is not configured.",
  };
  const apiKey =
    envString(env, "EXCHANGE_RATE_API_KEY", request) || envString(env, "CURRENCY_API_KEY", request);
  const source = apiKey ? "exchangerate-api.com" : "open.er-api.com";
  const ratesUrl = apiKey
    ? `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/INR`
    : "https://open.er-api.com/v6/latest/INR";

  try {
    const response = await fetch(ratesUrl, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Currency API returned ${response.status}`);
    const payload = await response.json();
    if (payload?.result === "error") {
      throw new Error(`Currency API error: ${String(payload?.["error-type"] ?? "unknown")}`);
    }
    const rates = payload?.conversion_rates ?? payload?.rates;
    if (!rates) throw new Error("Currency API response did not include usable rates.");
    return jsonResponse(
      {
        ...fallback,
        rates: { INR: 1, ...(rates as Record<string, number>) },
        updated_at: payload?.time_last_update_utc ?? null,
        fetchedAt: new Date().toISOString(),
        source,
        error: null,
      },
      200,
      CURRENCY_CACHE_HEADERS,
    );
  } catch (error) {
    console.error("Currency rates unavailable", error);
    return jsonResponse(
      {
        ...fallback,
        error: error instanceof Error ? error.message : "ExchangeRate-API request failed.",
      },
      200,
      CURRENCY_CACHE_HEADERS,
    );
  }
}

function handleGeoRequest(request: Request): Response | null {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/api/geo") return null;
  const country = String(
    (request as unknown as { cf?: { country?: string } }).cf?.country ??
      request.headers.get("cf-ipcountry") ??
      "IN",
  ).toUpperCase();
  return jsonResponse({ country, currency: detectedCurrencyForRequest(request) }, 200, {
    "cache-control": "public, max-age=86400",
  });
}

function cleanApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Payment request failed.";
  const uncaught = [...message.matchAll(/Uncaught Error:\s*([^\n]+)/gi)].at(-1)?.[1]?.trim();
  const clean = (uncaught ?? message)
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/\s+at\s+handler[\s\S]*$/i, "")
    .replace(/\s*\n[\s\S]*$/, "")
    .trim();
  if (/payment provider error \((401|403)\//i.test(clean)) {
    return "Secure payment setup needs attention. Please contact support before retrying.";
  }
  if (
    /provider_(timeout|unavailable)|provider request timed out|temporarily unavailable/i.test(clean)
  ) {
    return "The secure payment provider did not respond. Please retry shortly.";
  }
  if (/^\[Request ID:.*\]\s*Server Error$/i.test(clean)) {
    return "Secure payment is temporarily unavailable. Please contact support before retrying.";
  }
  return clean;
}

function paymentErrorStatus(message: string, fallback = 500) {
  if (/payment provider|secure payment|temporarily unavailable|did not respond/i.test(message))
    return 503;
  if (/missing|required|invalid|mismatch|signature|amount/i.test(message)) return 400;
  return fallback;
}

async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleRazorpayApiRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/create-order" && url.pathname !== "/api/verify-payment") {
    return null;
  }
  const corsHeaders = trustedCorsHeaders(request, env);
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, corsHeaders);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 128 * 1024) {
    return jsonResponse({ error: "Checkout request is too large." }, 413, corsHeaders);
  }

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "JSON request body is required." }, 400, corsHeaders);
  }

  try {
    if (url.pathname === "/api/create-order") {
      const checkoutBody = body as { cart?: unknown; customer?: unknown };
      if (!Array.isArray(checkoutBody.cart) || !checkoutBody.customer) {
        return jsonResponse(
          { error: "A complete server-validated checkout payload is required." },
          400,
          corsHeaders,
        );
      }
      const client = convexClient(env, request);
      if (!client)
        return jsonResponse({ error: "Convex backend is not configured." }, 500, corsHeaders);
      const order = await client.action(api.orders.createRazorpayCheckoutOrder, body as never);
      return jsonResponse(
        {
          order_id: order.orderId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          key_id: order.keyId,
        },
        200,
        { "cache-control": "no-store", ...corsHeaders },
      );
    }

    const verifyBody = body as {
      payload?: unknown;
      razorpay_payment_id?: unknown;
      razorpay_order_id?: unknown;
      razorpay_signature?: unknown;
    };
    if (
      typeof verifyBody.razorpay_payment_id !== "string" ||
      typeof verifyBody.razorpay_order_id !== "string" ||
      typeof verifyBody.razorpay_signature !== "string"
    ) {
      return jsonResponse({ error: "Missing Razorpay verification fields." }, 400, corsHeaders);
    }
    if (!verifyBody.payload || typeof verifyBody.payload !== "object") {
      return jsonResponse(
        { error: "The original server-validated checkout payload is required." },
        400,
        { "cache-control": "no-store", ...corsHeaders },
      );
    }
    const client = convexClient(env, request);
    if (!client)
      return jsonResponse({ error: "Convex backend is not configured." }, 500, corsHeaders);
    const order = await client.action(api.orders.verifyRazorpayPayment, {
      ...(verifyBody.payload as Record<string, unknown>),
      razorpay_payment_id: verifyBody.razorpay_payment_id,
      razorpay_order_id: verifyBody.razorpay_order_id,
      razorpay_signature: verifyBody.razorpay_signature,
    } as never);
    return jsonResponse({ success: true, order }, 200, {
      "cache-control": "no-store",
      ...corsHeaders,
    });
  } catch (error) {
    const message = cleanApiError(error);
    console.error(
      JSON.stringify({
        event: "checkout_api_error",
        route: url.pathname,
        status: paymentErrorStatus(message),
        message,
      }),
    );
    return jsonResponse(
      { error: message || "Payment request failed." },
      paymentErrorStatus(message),
      {
        "cache-control": "no-store",
        ...corsHeaders,
      },
    );
  }
}

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function publicSiteUrl(env: unknown, request: Request) {
  return (envString(env, "VITE_PUBLIC_SITE_URL", request) || PUBLIC_SITE_URL).replace(/\/+$/, "");
}

function handleRobotsRequest(request: Request, env: unknown): Response | null {
  const url = new URL(request.url);
  if ((request.method !== "GET" && request.method !== "HEAD") || url.pathname !== "/robots.txt") {
    return null;
  }
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /cart
Disallow: /checkout
Disallow: /search

Sitemap: ${publicSiteUrl(env, request)}/sitemap.xml
`;
  return new Response(request.method === "HEAD" ? null : body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function sitemapUrlNode(
  baseUrl: string,
  path: string,
  priority: string,
  image?: string,
  imageTitle?: string,
  lastModified = SITEMAP_LASTMOD,
) {
  const loc = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const parts = [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${xmlEscape(lastModified)}</lastmod>`,
    "    <changefreq>weekly</changefreq>",
    `    <priority>${priority}</priority>`,
  ];
  if (image) {
    parts.push(
      "    <image:image>",
      `      <image:loc>${xmlEscape(new URL(image, baseUrl).href)}</image:loc>`,
      `      <image:title>${xmlEscape(imageTitle)}</image:title>`,
      "    </image:image>",
    );
  }
  parts.push("  </url>");
  return parts.join("\n");
}

async function handleSitemapRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if ((request.method !== "GET" && request.method !== "HEAD") || url.pathname !== "/sitemap.xml") {
    return null;
  }
  const baseUrl = publicSiteUrl(env, request);
  const staticPaths = [
    "/",
    "/shop",
    "/about",
    "/faq",
    "/pages/contact",
    "/pages/shipping",
    "/pages/returns",
    "/pages/privacy",
    "/terms",
  ];
  const products = mergeLocalCatalogProducts(await liveCatalogProducts(env, request)) as Array<
    Record<string, unknown>
  >;
  const nodes = [
    ...staticPaths.map((path) => sitemapUrlNode(baseUrl, path, path === "/" ? "1.0" : "0.7")),
    ...products
      .filter((product) => product.is_active !== false && String(product.slug ?? "").trim())
      .map((product) =>
        sitemapUrlNode(
          baseUrl,
          `/products/${encodeURIComponent(String(product.slug ?? ""))}`,
          product.is_featured || product.is_bestseller || product.is_new_arrival ? "0.85" : "0.8",
          typeof product.cover_image_url === "string" ? product.cover_image_url : undefined,
          String(product.name ?? "Product"),
          String(product.updated_at ?? product.created_at ?? SITEMAP_LASTMOD),
        ),
      ),
  ];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...nodes,
    "</urlset>",
    "",
  ].join("\n");
  return new Response(request.method === "HEAD" ? null : body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"'))
    return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const finish = (response: Response) => withSecurityHeaders(response, request);
    try {
      const robotsResponse = handleRobotsRequest(request, env);
      if (robotsResponse) return finish(robotsResponse);

      const sitemapResponse = await handleSitemapRequest(request, env);
      if (sitemapResponse) return finish(sitemapResponse);

      const mediaResponse = await handleMediaRequest(request, env);
      if (mediaResponse) return finish(mediaResponse);

      const catalogResponse = await handleCatalogRequest(request, env);
      if (catalogResponse) return finish(catalogResponse);

      const razorpayResponse = await handleRazorpayApiRequest(request, env);
      if (razorpayResponse) return finish(razorpayResponse);

      const geoResponse = handleGeoRequest(request);
      if (geoResponse) return finish(geoResponse);

      const currencyResponse = await handleCurrencyRequest(request, env);
      if (currencyResponse) return finish(currencyResponse);

      const handler = await getServerEntry();
      const response = await normalizeCatastrophicSsrResponse(
        await handler.fetch(request, env, ctx),
      );
      return finish(response);
    } catch (error) {
      console.error(error);
      return finish(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
