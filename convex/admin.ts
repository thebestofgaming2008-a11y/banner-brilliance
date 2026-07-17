import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const zones = ["Local", "Regional", "National", "Remote"];
const carriers = ["DTDC", "India Post"];
const methods = ["Standard", "Express"];

function cleanText(value: string | null | undefined, max = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function publicDoc<T extends { _id: unknown; _creationTime: number }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

function slugify(value: string) {
  return cleanText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

async function ensureShippingDefaults(ctx: MutationCtx) {
  const existing = await ctx.db.query("shipping_rates").take(1);
  if (existing.length) return;
  const timestamp = nowIso();
  for (const carrier of carriers) {
    for (const zone of zones) {
      for (const method of methods) {
        await ctx.db.insert("shipping_rates", {
          carrier,
          zone,
          method,
          base_fee: method === "Express" ? 80 : 50,
          per_item_fee: 0,
          per_weight_fee: method === "Express" ? 80 : 50,
          is_active: true,
          updated_at: timestamp,
        });
      }
    }
  }
}

export const listDiscounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("discounts").collect();
    return rows
      .map(publicDoc)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  },
});

export const createDiscount = mutation({
  args: {
    code: v.string(),
    type: v.string(),
    value: v.number(),
    usage_limit: v.optional(v.union(v.number(), v.null())),
    starts_at: v.optional(v.union(v.string(), v.null())),
    ends_at: v.optional(v.union(v.string(), v.null())),
    scope_type: v.string(),
    scope_value: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const code = cleanText(args.code, 40).toUpperCase();
    if (!code) throw new Error("Discount code is required.");
    const existing = await ctx.db
      .query("discounts")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (existing) throw new Error("A discount with this code already exists.");
    const timestamp = nowIso();
    const id = await ctx.db.insert("discounts", {
      code,
      type: cleanText(args.type, 40) || "percent",
      value: Math.max(0, args.value),
      active: true,
      usage_limit: args.usage_limit ?? null,
      used_count: 0,
      starts_at: args.starts_at ?? null,
      ends_at: args.ends_at ?? null,
      scope_type: cleanText(args.scope_type, 40) || "all",
      scope_value: cleanText(args.scope_value, 120) || null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    await writeAuditLog(ctx, {
      action: "discount.create",
      entityType: "discount",
      entityId: String(id),
      summary: code,
      metadata: { type: args.type, value: args.value },
    });
    const doc = await ctx.db.get(id);
    return doc ? publicDoc(doc) : null;
  },
});

export const updateDiscount = mutation({
  args: {
    id: v.id("discounts"),
    patch: v.object({
      code: v.optional(v.string()),
      type: v.optional(v.string()),
      value: v.optional(v.number()),
      active: v.optional(v.boolean()),
      usage_limit: v.optional(v.union(v.number(), v.null())),
      starts_at: v.optional(v.union(v.string(), v.null())),
      ends_at: v.optional(v.union(v.string(), v.null())),
      scope_type: v.optional(v.string()),
      scope_value: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const patch = { ...args.patch, updated_at: nowIso() };
    if (args.patch.code !== undefined) patch.code = cleanText(args.patch.code, 40).toUpperCase();
    await ctx.db.patch(args.id, patch);
    await writeAuditLog(ctx, {
      action: "discount.update",
      entityType: "discount",
      entityId: String(args.id),
      summary: patch.code ?? null,
      metadata: { changed: Object.keys(args.patch) },
    });
    const doc = await ctx.db.get(args.id);
    return doc ? publicDoc(doc) : null;
  },
});

export const deleteDiscount = mutation({
  args: { id: v.id("discounts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    await writeAuditLog(ctx, {
      action: "discount.delete",
      entityType: "discount",
      entityId: String(args.id),
      summary: current?.code ?? null,
    });
    return true;
  },
});

export const listShippingRates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("shipping_rates").collect();
    return rows
      .map(publicDoc)
      .sort((a, b) =>
        `${a.carrier}-${a.zone}-${a.method}`.localeCompare(`${b.carrier}-${b.zone}-${b.method}`),
      );
  },
});

export const seedShippingDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await ensureShippingDefaults(ctx);
    return true;
  },
});

export const updateShippingRate = mutation({
  args: {
    id: v.id("shipping_rates"),
    patch: v.object({
      base_fee: v.optional(v.number()),
      per_item_fee: v.optional(v.number()),
      per_weight_fee: v.optional(v.number()),
      is_active: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { ...args.patch, updated_at: nowIso() });
    const doc = await ctx.db.get(args.id);
    return doc ? publicDoc(doc) : null;
  },
});

export const getStoreSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("store_settings").collect();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },
});

export const saveStoreSettings = mutation({
  args: { settings: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const timestamp = nowIso();
    for (const [key, value] of Object.entries(args.settings ?? {})) {
      const existing = await ctx.db
        .query("store_settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) await ctx.db.patch(existing._id, { value, updated_at: timestamp });
      else await ctx.db.insert("store_settings", { key, value, updated_at: timestamp });
    }
    await writeAuditLog(ctx, {
      action: "settings.update",
      entityType: "store_settings",
      summary: Object.keys(args.settings ?? {})
        .join(", ")
        .slice(0, 160),
      metadata: { keys: Object.keys(args.settings ?? {}) },
    });
    return true;
  },
});

export const listCategories = query({
  args: { type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = args.type
      ? await ctx.db
          .query("categories")
          .withIndex("by_type", (q) => q.eq("type", cleanText(args.type, 40)))
          .collect()
      : await ctx.db.query("categories").collect();
    const retiredDefaultFilters = new Set([
      "men",
      "women",
      "unisex",
      "bestseller",
      "new",
      "limited",
    ]);
    return rows
      .filter((row) => !(row.type === "filter" && retiredDefaultFilters.has(String(row.slug))))
      .map(publicDoc)
      .sort(
        (a, b) =>
          Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999) ||
          String(a.name).localeCompare(String(b.name)),
      );
  },
});

export const upsertCategory = mutation({
  args: {
    slug: v.optional(v.union(v.string(), v.null())),
    name: v.string(),
    type: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    parent_slug: v.optional(v.union(v.string(), v.null())),
    sort_order: v.optional(v.union(v.number(), v.null())),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = cleanText(args.name, 80);
    if (!name) throw new Error("Category name is required.");
    const slug = slugify(args.slug || name);
    if (!slug) throw new Error("Category slug is required.");
    const timestamp = nowIso();
    const payload = {
      slug,
      name,
      type: cleanText(args.type, 40) || "category",
      description: cleanText(args.description, 240) || null,
      parent_slug: cleanText(args.parent_slug, 80) || null,
      sort_order: args.sort_order ?? null,
      is_active: args.is_active ?? true,
      updated_at: timestamp,
    };
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    const id = existing
      ? (await ctx.db.patch(existing._id, payload), existing._id)
      : await ctx.db.insert("categories", { ...payload, created_at: timestamp });
    await writeAuditLog(ctx, {
      action: existing ? "category.update" : "category.create",
      entityType: "category",
      entityId: String(id),
      summary: name,
      metadata: { slug, type: payload.type },
    });
    const doc = await ctx.db.get(id);
    return doc ? publicDoc(doc) : null;
  },
});

export const removeCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get(args.id);
    if (!category) return { removed: false, updatedProducts: 0, slug: null };
    const slug = category.slug;
    if (slug === "other")
      throw new Error("The Other collection is required and cannot be removed.");

    const timestamp = nowIso();
    const products = await ctx.db.query("products").collect();
    let updatedProducts = 0;

    if (category.type === "filter") {
      for (const product of products) {
        const tags = Array.isArray(product.tags) ? product.tags : [];
        const nextTags = tags.filter((tag) => slugify(String(tag)) !== slug);
        if (nextTags.length === tags.length) continue;
        await ctx.db.patch(product._id, { tags: nextTags, updated_at: timestamp });
        updatedProducts += 1;
      }
    } else if (category.type === "collection") {
      const other = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", "other"))
        .first();
      const otherPayload = {
        slug: "other",
        name: "Other",
        type: "collection",
        description: "Products outside the main collections.",
        parent_slug: null,
        sort_order: 9999,
        is_active: true,
        updated_at: timestamp,
      };
      if (other) await ctx.db.patch(other._id, otherPayload);
      else await ctx.db.insert("categories", { ...otherPayload, created_at: timestamp });

      for (const product of products) {
        const productCategory = slugify(String(product.category_id ?? product.category ?? ""));
        if (productCategory !== slug) continue;
        await ctx.db.patch(product._id, {
          category: "Other",
          category_id: "other",
          updated_at: timestamp,
        });
        updatedProducts += 1;
      }
    }

    await ctx.db.delete(category._id);
    await writeAuditLog(ctx, {
      action: "category.delete",
      entityType: "category",
      entityId: String(category._id),
      summary: category.name,
      metadata: { slug, type: category.type, updatedProducts },
    });
    return { removed: true, updatedProducts, slug };
  },
});

export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const defaults = [
      { slug: "shemaghs", name: "Shemaghs", type: "collection", sort_order: 10 },
      { slug: "niqabs", name: "Niqabs", type: "collection", sort_order: 20 },
      { slug: "kufis", name: "Kufis", type: "collection", sort_order: 30 },
      { slug: "honey", name: "Honey", type: "collection", sort_order: 40 },
      { slug: "watches", name: "Watches", type: "collection", sort_order: 50 },
      { slug: "gloves", name: "Gloves", type: "collection", sort_order: 60 },
      { slug: "other", name: "Other", type: "collection", sort_order: 9999 },
    ];
    const timestamp = nowIso();
    const existingRows = await ctx.db.query("categories").collect();
    for (const row of existingRows) {
      await ctx.db.patch(row._id, { is_active: false, updated_at: timestamp });
    }
    for (const item of defaults) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", item.slug))
        .first();
      const payload = {
        ...item,
        description: null,
        parent_slug: null,
        is_active: true,
        updated_at: timestamp,
      };
      if (existing) await ctx.db.patch(existing._id, payload);
      else await ctx.db.insert("categories", { ...payload, created_at: timestamp });
    }
    await writeAuditLog(ctx, {
      action: "category.seed_defaults",
      entityType: "category",
      summary: "Reset Fawzaan collections and filters",
      metadata: { count: defaults.length },
    });
    return true;
  },
});

export const listStorefrontBanners = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("storefront_banners").collect();
    return rows
      .map(publicDoc)
      .sort(
        (a, b) =>
          Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999) ||
          String(b.created_at).localeCompare(String(a.created_at)),
      );
  },
});

export const upsertStorefrontBanner = mutation({
  args: {
    id: v.optional(v.string()),
    placement: v.string(),
    eyebrow: v.optional(v.union(v.string(), v.null())),
    title: v.string(),
    body: v.optional(v.union(v.string(), v.null())),
    button_label: v.optional(v.union(v.string(), v.null())),
    button_url: v.optional(v.union(v.string(), v.null())),
    image_url: v.string(),
    sort_order: v.optional(v.union(v.number(), v.null())),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const title = cleanText(args.title, 100);
    const placement = cleanText(args.placement, 40);
    const imageUrl = cleanText(args.image_url, 1000);
    const buttonUrl = cleanText(args.button_url, 500) || null;
    if (!title) throw new Error("Banner title is required.");
    if (!placement) throw new Error("Banner placement is required.");
    if (!/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith("/")) {
      throw new Error("Banner image must be an HTTPS or site-relative URL.");
    }
    if (buttonUrl && !/^https?:\/\//i.test(buttonUrl) && !buttonUrl.startsWith("/")) {
      throw new Error("Banner link must be an HTTPS or site-relative URL.");
    }
    const timestamp = nowIso();
    const payload = {
      placement,
      eyebrow: cleanText(args.eyebrow, 60) || null,
      title,
      body: cleanText(args.body, 320) || null,
      button_label: cleanText(args.button_label, 50) || null,
      button_url: buttonUrl,
      image_url: imageUrl,
      sort_order: args.sort_order ?? null,
      is_active: args.is_active ?? true,
      updated_at: timestamp,
    };
    const bannerId = args.id ? ctx.db.normalizeId("storefront_banners", args.id) : null;
    if (args.id && !bannerId) throw new Error("Invalid banner ID.");
    const existing = bannerId ? await ctx.db.get(bannerId) : null;
    const id = existing
      ? (await ctx.db.patch(existing._id, payload), existing._id)
      : await ctx.db.insert("storefront_banners", { ...payload, created_at: timestamp });
    await writeAuditLog(ctx, {
      action: existing ? "banner.update" : "banner.create",
      entityType: "storefront_banner",
      entityId: String(id),
      summary: title,
      metadata: { placement },
    });
    const doc = await ctx.db.get(id);
    return doc ? publicDoc(doc) : null;
  },
});

export const archiveStorefrontBanner = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const bannerId = ctx.db.normalizeId("storefront_banners", args.id);
    if (!bannerId) throw new Error("Invalid banner ID.");
    const doc = await ctx.db.get(bannerId);
    if (!doc) return false;
    await ctx.db.patch(doc._id, { is_active: false, updated_at: nowIso() });
    await writeAuditLog(ctx, {
      action: "banner.archive",
      entityType: "storefront_banner",
      entityId: args.id,
      summary: doc.title,
    });
    return true;
  },
});

export const listAuditLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("audit_logs")
      .withIndex("by_created_at")
      .order("desc")
      .take(Math.min(args.limit ?? 100, 500));
    return rows.map(publicDoc);
  },
});

export const launchReadiness = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [products, orders, recoveries, pendingReviews, categories, settingsRows] =
      await Promise.all([
        ctx.db.query("products").collect(),
        ctx.db.query("orders").collect(),
        ctx.db
          .query("checkout_intents")
          .withIndex("by_status", (q) => q.eq("status", "recovery_required"))
          .collect(),
        ctx.db
          .query("reviews")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .collect(),
        ctx.db.query("categories").collect(),
        ctx.db.query("store_settings").collect(),
      ]);
    const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
    const checkoutMode = String(settings.checkout_mode ?? "whatsapp").toLowerCase();
    const usesRazorpay = checkoutMode !== "whatsapp";
    const active = products.filter((product) => product.is_active !== false);
    const missingCover = active
      .filter((product) => !product.cover_image_url)
      .map((product) => product.name);
    const missingCategory = active
      .filter((product) => !product.category && !product.category_id)
      .map((product) => product.name);
    const missingDescription = active
      .filter((product) => !product.description && !product.short_description)
      .map((product) => product.name);
    const outOfStockActive = active
      .filter((product) => (product.stock_quantity ?? 0) <= 0 || product.in_stock === false)
      .map((product) => product.name);
    const env = {
      adminEmail: Boolean(process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS),
      razorpayKeyId: Boolean(process.env.RAZORPAY_KEY_ID),
      razorpaySecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
      razorpayWebhookSecret: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      authKeys: Boolean(process.env.JWT_PRIVATE_KEY && process.env.JWKS),
      adminUploadToken: Boolean(process.env.ADMIN_UPLOAD_TOKEN),
    };
    const blockers = [
      ...(!env.adminEmail ? ["ADMIN_EMAIL/ADMIN_EMAILS is not configured."] : []),
      ...(!env.authKeys ? ["Convex Auth JWT keys are not configured."] : []),
      ...(usesRazorpay && (!env.razorpayKeyId || !env.razorpaySecret)
        ? ["Razorpay live keys are not configured."]
        : []),
      ...(usesRazorpay && !env.razorpayWebhookSecret
        ? ["Razorpay webhook secret is not configured."]
        : []),
      ...(!env.adminUploadToken ? ["ADMIN_UPLOAD_TOKEN is not configured for product media."] : []),
      ...(recoveries.length
        ? [`${recoveries.length} paid checkout recovery item(s) need manual attention.`]
        : []),
      ...(missingCover.length
        ? [`${missingCover.length} active product(s) are missing cover images.`]
        : []),
      ...(missingCategory.length
        ? [`${missingCategory.length} active product(s) are missing categories.`]
        : []),
      ...(missingDescription.length
        ? [`${missingDescription.length} active product(s) are missing descriptions.`]
        : []),
    ];
    return {
      ready: blockers.length === 0,
      blockers,
      warnings: [
        ...(outOfStockActive.length
          ? [`${outOfStockActive.length} active product(s) are out of stock.`]
          : []),
        ...(pendingReviews.length
          ? [`${pendingReviews.length} review(s) are waiting for approval.`]
          : []),
        ...(categories.length === 0 ? ["Default categories/subjects have not been seeded."] : []),
      ],
      counts: {
        activeProducts: active.length,
        orders: orders.length,
        recoveries: recoveries.length,
        pendingReviews: pendingReviews.length,
        categories: categories.length,
      },
      checkoutMode,
      samples: {
        missingCover: missingCover.slice(0, 8),
        missingCategory: missingCategory.slice(0, 8),
        missingDescription: missingDescription.slice(0, 8),
        outOfStockActive: outOfStockActive.slice(0, 8),
      },
      env,
    };
  },
});

export const notifications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [orders, products, reviews, rates, recoveries, lowStockSetting] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("reviews").collect(),
      ctx.db.query("shipping_rates").collect(),
      ctx.db
        .query("checkout_intents")
        .withIndex("by_status", (q) => q.eq("status", "recovery_required"))
        .collect(),
      ctx.db
        .query("store_settings")
        .withIndex("by_key", (q) => q.eq("key", "lowStock"))
        .first(),
    ]);
    const lowStockThreshold = Math.max(0, Number(lowStockSetting?.value ?? 5) || 0);
    const now = Date.now();
    const rateTimes = rates
      .map((rate) => Date.parse(rate.updated_at))
      .filter((time) => Number.isFinite(time));
    const oldestRate = rateTimes.length ? Math.min(...rateTimes) : 0;
    const shippingDue =
      rates.length === 0 || !oldestRate || now - oldestRate >= 30 * 24 * 60 * 60 * 1000;
    const notices = [
      {
        id: "unshipped",
        count: orders.filter((o) => o.status === "processing").length,
        title: "Orders need fulfillment",
        body: "orders are processing",
        section: "orders",
      },
      {
        id: "tracking",
        count: orders.filter((o) => o.status === "shipped" && !o.tracking_number).length,
        title: "Missing tracking",
        body: "shipped orders need tracking",
        section: "orders",
      },
      {
        id: "low-stock",
        count: products.filter((p) => (p.stock_quantity ?? 0) <= lowStockThreshold).length,
        title: "Low stock",
        body: "products need inventory review",
        section: "products",
      },
      {
        id: "missing-covers",
        count: products.filter((p) => p.is_active !== false && !p.cover_image_url).length,
        title: "Product covers missing",
        body: "active products need a cover image",
        section: "products",
      },
      {
        id: "missing-descriptions",
        count: products.filter(
          (p) => p.is_active !== false && !p.description && !p.short_description,
        ).length,
        title: "Product descriptions missing",
        body: "active products need product copy",
        section: "products",
      },
      {
        id: "reviews",
        count: reviews.filter((r) => r.status === "pending").length,
        title: "Reviews pending",
        body: "reviews waiting",
        section: "reviews",
      },
      {
        id: "payment-recovery",
        count: recoveries.length,
        title: "Paid orders need recovery",
        body: "captured payments need manual attention",
        section: "orders",
      },
      {
        id: "shipping-review",
        count: shippingDue ? 1 : 0,
        title: "Shipping rates due",
        body: "monthly carrier review is due",
        section: "shipping",
      },
    ];
    return notices
      .filter((notice) => notice.count > 0)
      .map((notice) => ({
        id: notice.id,
        title: notice.title,
        body: `${notice.count} ${notice.body}`,
        section: notice.section,
      }));
  },
});
