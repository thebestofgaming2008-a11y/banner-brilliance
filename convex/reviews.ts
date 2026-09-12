import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowIso, requireAdmin, requireIdentity, writeAuditLog } from "./lib";

const reviewStatus = new Set(["pending", "published", "hidden"]);

const homepageTestimonialValidator = v.object({
  id: v.id("reviews"),
  productId: v.string(),
  customerName: v.string(),
  rating: v.number(),
  title: v.union(v.string(), v.null()),
  body: v.union(v.string(), v.null()),
  createdAt: v.union(v.string(), v.null()),
});

function cleanText(value: string | null | undefined, max = 1000) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 1000) {
  const next = cleanText(value, max);
  return next.length ? next : null;
}

async function recalculateProductRating(ctx: any, productId: string) {
  const product = await ctx.db.get(productId as any);
  if (!product) return;
  const rows = await ctx.db
    .query("reviews")
    .withIndex("by_product_id", (q: any) => q.eq("product_id", productId))
    .take(1_001);
  if (rows.length > 1_000) {
    throw new Error("This product has too many reviews to recalculate in one operation.");
  }
  const published = rows.filter((row: any) => row.status === "published");
  const count = published.length;
  const rating = count
    ? published.reduce((sum: number, row: any) => sum + row.rating, 0) / count
    : null;
  await ctx.db.patch(productId as any, {
    rating,
    reviews_count: count,
    updated_at: nowIso(),
  });
}

async function hasVerifiedPurchase(ctx: any, userId: string, productId: string) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_user_id", (q: any) => q.eq("user_id", userId))
    .order("desc")
    .take(200);
  const paidOrders = orders.filter((order: any) => order.payment_status === "paid");
  for (const order of paidOrders) {
    const items = await ctx.db
      .query("order_items")
      .withIndex("by_order_id", (q: any) => q.eq("order_id", order._id))
      .take(100);
    if (items.some((item: any) => String(item.product_id) === productId)) return true;
  }
  return false;
}

function publicReview(doc: Record<string, any>): Record<string, any> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

function cleanEmail(value: string | null | undefined) {
  return cleanText(value, 180).toLowerCase();
}

function normalizeOrderNumber(value: string) {
  const raw = cleanText(value, 40).toUpperCase();
  return /^\d+$/.test(raw) ? `#${raw}` : raw;
}

function publicCustomerName(value: string | null | undefined) {
  const parts = cleanText(value, 120).split(" ").filter(Boolean);
  if (!parts.length) return "Verified customer";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts.at(-1)?.charAt(0)}.`;
}

async function hasReviewedByEmail(ctx: any, email: string, productId: string) {
  const rows = await ctx.db
    .query("reviews")
    .withIndex("by_product_id", (q: any) => q.eq("product_id", productId))
    .take(1_001);
  if (rows.length > 1_000) {
    throw new Error("This product has too many reviews to check in one operation.");
  }
  return rows.some((row: any) => cleanEmail(row.customer_email) === email);
}

export const listPublishedForProduct = query({
  args: { productId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.productId))
      .take(200);
    return rows
      .filter((row) => row.status === "published")
      .map(publicReview)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const listHomepageTestimonials = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(homepageTestimonialValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 3), 1), 6);
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(limit * 4);

    return rows
      .filter((row) => Boolean(cleanNullable(row.body, 1600) || cleanNullable(row.title, 120)))
      .slice(0, limit)
      .map((row) => ({
        id: row._id,
        productId: row.product_id,
        customerName: publicCustomerName(row.customer_name),
        rating: Math.max(1, Math.min(5, row.rating)),
        title: cleanNullable(row.title, 120),
        body: cleanNullable(row.body, 420),
        createdAt: cleanNullable(row.created_at, 40),
      }));
  },
});

export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 200), 1), 500);
    const rows = await ctx.db.query("reviews").take(limit);
    return rows
      .map(publicReview)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const submit = mutation({
  args: {
    productId: v.string(),
    rating: v.number(),
    title: v.optional(v.union(v.string(), v.null())),
    body: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const product = (await ctx.db.get(args.productId as any)) as any;
    if (!product || product.is_active === false) throw new Error("Product not found.");
    const rating = Math.max(1, Math.min(5, Math.round(args.rating * 10) / 10));
    const user = auth.user as any;
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", auth.userId).eq("product_id", args.productId),
      )
      .first();
    if (existing) throw new Error("You already reviewed this product.");
    if (!(await hasVerifiedPurchase(ctx, auth.userId, args.productId))) {
      throw new Error("Only verified customers can review this product.");
    }
    const timestamp = nowIso();
    const id = await ctx.db.insert("reviews", {
      product_id: args.productId,
      user_id: auth.userId,
      customer_name: user.name ?? null,
      customer_email: user.email ?? null,
      rating,
      title: cleanNullable(args.title, 100),
      body: cleanNullable(args.body, 1600),
      media_urls: [],
      status: "pending",
      admin_note: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const doc = await ctx.db.get(id);
    return doc ? publicReview(doc) : null;
  },
});

export const submitForOrder = mutation({
  args: {
    orderNumber: v.string(),
    email: v.string(),
    productId: v.string(),
    rating: v.number(),
    title: v.optional(v.union(v.string(), v.null())),
    body: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const orderNumber = normalizeOrderNumber(args.orderNumber);
    const email = cleanEmail(args.email);
    if (!orderNumber || !email) throw new Error("Order number and email are required.");
    const product = (await ctx.db.get(args.productId as any)) as any;
    if (!product || product.is_active === false) throw new Error("Product not found.");
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q: any) => q.eq("order_number", orderNumber))
      .first();
    if (!order || cleanEmail(order.customer_email) !== email)
      throw new Error("Order not found for this email.");
    if (order.payment_status !== "paid") throw new Error("Only paid orders can be reviewed.");
    const items = await ctx.db
      .query("order_items")
      .withIndex("by_order_id", (q: any) => q.eq("order_id", order._id))
      .take(100);
    if (!items.some((item: any) => String(item.product_id) === args.productId))
      throw new Error("This product was not in that order.");
    if (await hasReviewedByEmail(ctx, email, args.productId))
      throw new Error("You already reviewed this product.");
    const timestamp = nowIso();
    const id = await ctx.db.insert("reviews", {
      product_id: args.productId,
      user_id: order.user_id ?? null,
      customer_name: cleanNullable(order.customer_name, 120),
      customer_email: email,
      rating: Math.max(1, Math.min(5, Math.round(args.rating * 10) / 10)),
      title: cleanNullable(args.title, 120),
      body: cleanNullable(args.body, 1600),
      media_urls: [],
      status: "pending",
      admin_note: `Submitted from order ${orderNumber}`,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const doc = await ctx.db.get(id);
    return doc ? publicReview(doc) : null;
  },
});

export const canReviewProduct = query({
  args: { productId: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx).catch(() => null);
    if (!auth) return { canReview: false };
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", auth.userId).eq("product_id", args.productId),
      )
      .first();
    return {
      canReview: !existing && (await hasVerifiedPurchase(ctx, auth.userId, args.productId)),
    };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.string(),
    status: v.string(),
    adminNote: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = cleanText(args.status, 24).toLowerCase();
    if (!reviewStatus.has(status)) throw new Error("Invalid review status.");
    const current = (await ctx.db.get(args.id as any)) as any;
    if (!current) throw new Error("Review not found.");
    await ctx.db.patch(args.id as any, {
      status,
      admin_note: cleanNullable(args.adminNote, 400),
      updated_at: nowIso(),
    });
    await recalculateProductRating(ctx, current.product_id);
    await writeAuditLog(ctx, {
      action: "review.status.update",
      entityType: "review",
      entityId: args.id,
      summary: status,
      metadata: { productId: current.product_id },
    });
    return true;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = (await ctx.db.get(args.id as any)) as any;
    if (!current) return false;
    await ctx.db.delete(args.id as any);
    await recalculateProductRating(ctx, current.product_id);
    await writeAuditLog(ctx, {
      action: "review.delete",
      entityType: "review",
      entityId: args.id,
      summary: "Review permanently deleted",
      metadata: { productId: current.product_id, status: current.status },
    });
    return true;
  },
});

export const recalculateAllProductRatings = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const products = await ctx.db.query("products").take(2_001);
    if (products.length > 2_000) {
      throw new Error("Too many products to recalculate safely in one operation.");
    }
    for (const product of products) {
      await recalculateProductRating(ctx, String(product._id));
    }
    await writeAuditLog(ctx, {
      action: "review.summary.recalculate_all",
      entityType: "product",
      summary: `Recalculated review summaries for ${products.length} products`,
    });
    return { updated: products.length };
  },
});
