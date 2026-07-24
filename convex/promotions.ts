import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";
import { normalizePromotionCode, promotionAvailability } from "./promotionRules";

const nullableString = v.optional(v.union(v.string(), v.null()));
const nullableNumber = v.optional(v.union(v.number(), v.null()));

const promotionInput = {
  name: v.string(),
  code: v.string(),
  type: v.union(v.literal("percent"), v.literal("fixed")),
  value: v.number(),
  active: v.boolean(),
  usage_limit: nullableNumber,
  starts_at: nullableString,
  ends_at: nullableString,
  minimum_subtotal: nullableNumber,
  maximum_discount: nullableNumber,
  scope_type: v.union(v.literal("all"), v.literal("products")),
  product_ids: v.array(v.id("products")),
  storefront_enabled: v.boolean(),
  storefront_title: nullableString,
  storefront_message: nullableString,
  storefront_badge: nullableString,
  storefront_button_label: nullableString,
  storefront_button_url: nullableString,
};

const publicPromotionValidator = v.object({
  id: v.id("discounts"),
  code: v.string(),
  name: v.string(),
  type: v.union(v.literal("percent"), v.literal("fixed")),
  value: v.number(),
  active: v.boolean(),
  usage_limit: v.union(v.number(), v.null()),
  used_count: v.number(),
  starts_at: v.union(v.string(), v.null()),
  ends_at: v.union(v.string(), v.null()),
  minimum_subtotal: v.union(v.number(), v.null()),
  maximum_discount: v.union(v.number(), v.null()),
  scope_type: v.union(v.literal("all"), v.literal("products")),
  product_ids: v.array(v.id("products")),
  storefront_enabled: v.boolean(),
  storefront_title: v.union(v.string(), v.null()),
  storefront_message: v.union(v.string(), v.null()),
  storefront_badge: v.union(v.string(), v.null()),
  storefront_button_label: v.union(v.string(), v.null()),
  storefront_button_url: v.union(v.string(), v.null()),
  created_at: v.string(),
  updated_at: v.string(),
});

function cleanText(value: string | null | undefined, max = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 160) {
  const cleaned = cleanText(value, max);
  return cleaned || null;
}

function cleanStorefrontUrl(value: string | null | undefined) {
  const cleaned = cleanNullable(value, 300);
  if (!cleaned) return null;
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return cleaned;
  try {
    const url = new URL(cleaned);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // The validation error below gives the admin a useful correction.
  }
  throw new ConvexError("Storefront button destination must be a site path or HTTPS URL.");
}

function publicPromotion(doc: Doc<"discounts">) {
  return {
    id: doc._id,
    code: doc.code,
    name: doc.name ?? doc.code,
    type: doc.type === "fixed" ? ("fixed" as const) : ("percent" as const),
    value: doc.value,
    active: doc.active,
    usage_limit: doc.usage_limit ?? null,
    used_count: doc.used_count,
    starts_at: doc.starts_at ?? null,
    ends_at: doc.ends_at ?? null,
    minimum_subtotal: doc.minimum_subtotal ?? null,
    maximum_discount: doc.maximum_discount ?? null,
    scope_type: doc.scope_type === "products" ? ("products" as const) : ("all" as const),
    product_ids: doc.product_ids ?? [],
    storefront_enabled: doc.storefront_enabled ?? false,
    storefront_title: doc.storefront_title ?? null,
    storefront_message: doc.storefront_message ?? null,
    storefront_badge: doc.storefront_badge ?? null,
    storefront_button_label: doc.storefront_button_label ?? null,
    storefront_button_url: doc.storefront_button_url ?? null,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

function validateInput(args: {
  code: string;
  type: "percent" | "fixed";
  value: number;
  usage_limit?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  minimum_subtotal?: number | null;
  maximum_discount?: number | null;
  scope_type: "all" | "products";
  product_ids: unknown[];
}) {
  const code = normalizePromotionCode(args.code);
  if (code.length < 3) throw new ConvexError("Promotion code must contain at least 3 characters.");
  if (!Number.isFinite(args.value) || args.value <= 0)
    throw new ConvexError("Discount value must be greater than zero.");
  if (args.type === "percent" && args.value > 100)
    throw new ConvexError("Percentage discounts cannot exceed 100%.");
  if (args.usage_limit != null && (!Number.isInteger(args.usage_limit) || args.usage_limit < 1))
    throw new ConvexError("Usage limit must be a whole number greater than zero.");
  if (args.minimum_subtotal != null && args.minimum_subtotal < 0)
    throw new ConvexError("Minimum subtotal cannot be negative.");
  if (args.maximum_discount != null && args.maximum_discount < 0)
    throw new ConvexError("Maximum discount cannot be negative.");
  if (args.scope_type === "products" && args.product_ids.length === 0)
    throw new ConvexError("Choose at least one eligible product.");
  const startsAt = args.starts_at ? Date.parse(args.starts_at) : null;
  const endsAt = args.ends_at ? Date.parse(args.ends_at) : null;
  if (startsAt !== null && !Number.isFinite(startsAt))
    throw new ConvexError("Promotion start date is invalid.");
  if (endsAt !== null && !Number.isFinite(endsAt))
    throw new ConvexError("Promotion end date is invalid.");
  if (startsAt !== null && endsAt !== null && endsAt <= startsAt)
    throw new ConvexError("Promotion end date must be after its start date.");
  return code;
}

export const listAdmin = query({
  args: {},
  returns: v.array(publicPromotionValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("discounts").order("desc").take(200);
    return rows.map(publicPromotion);
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("discounts")),
    ...promotionInput,
  },
  returns: publicPromotionValidator,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const code = validateInput(args);
    const existingCode = await ctx.db
      .query("discounts")
      .withIndex("by_code", (lookup) => lookup.eq("code", code))
      .first();
    if (existingCode && existingCode._id !== args.id)
      throw new ConvexError("A promotion with this code already exists.");

    const timestamp = nowIso();
    const values = {
      code,
      name: cleanText(args.name, 100) || code,
      description: null,
      type: args.type,
      value: Math.round(args.value * 100) / 100,
      active: args.active,
      usage_limit: args.usage_limit ?? null,
      starts_at: args.starts_at ?? null,
      ends_at: args.ends_at ?? null,
      minimum_subtotal: args.minimum_subtotal ?? null,
      maximum_discount: args.maximum_discount ?? null,
      scope_type: args.scope_type,
      scope_value: null,
      product_ids: args.scope_type === "products" ? args.product_ids : [],
      storefront_enabled: args.storefront_enabled,
      storefront_title: cleanNullable(args.storefront_title, 100),
      storefront_message: cleanNullable(args.storefront_message, 260),
      storefront_badge: cleanNullable(args.storefront_badge, 18),
      storefront_button_label: cleanNullable(args.storefront_button_label, 40),
      storefront_button_url: cleanStorefrontUrl(args.storefront_button_url),
      updated_at: timestamp,
    };

    if (args.active && args.storefront_enabled) {
      const currentlyFeatured = await ctx.db
        .query("discounts")
        .withIndex("by_active", (lookup) => lookup.eq("active", true))
        .take(200);
      for (const promotion of currentlyFeatured) {
        if (promotion._id !== args.id && promotion.storefront_enabled)
          await ctx.db.patch(promotion._id, {
            storefront_enabled: false,
            updated_at: timestamp,
          });
      }
    }

    let id = args.id;
    if (id) {
      const current = await ctx.db.get(id);
      if (!current) throw new ConvexError("Promotion no longer exists.");
      await ctx.db.patch(id, values);
    } else {
      id = await ctx.db.insert("discounts", {
        ...values,
        used_count: 0,
        created_at: timestamp,
      });
    }
    await writeAuditLog(ctx, {
      action: args.id ? "promotion.update" : "promotion.create",
      entityType: "discount",
      entityId: String(id),
      summary: code,
      metadata: {
        type: args.type,
        value: args.value,
        scope: args.scope_type,
        products: args.product_ids.length,
        featured: args.storefront_enabled,
      },
    });
    const saved = await ctx.db.get(id);
    if (!saved) throw new ConvexError("Promotion could not be saved.");
    return publicPromotion(saved);
  },
});

export const remove = mutation({
  args: { id: v.id("discounts") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const promotion = await ctx.db.get(args.id);
    if (!promotion) return false;
    await ctx.db.delete(args.id);
    await writeAuditLog(ctx, {
      action: "promotion.delete",
      entityType: "discount",
      entityId: String(args.id),
      summary: promotion.code,
    });
    return true;
  },
});

export const getFeatured = query({
  args: { now: v.number() },
  returns: v.union(
    v.object({
      id: v.id("discounts"),
      code: v.string(),
      title: v.string(),
      message: v.string(),
      badge: v.string(),
      buttonLabel: v.string(),
      buttonUrl: v.string(),
      type: v.union(v.literal("percent"), v.literal("fixed")),
      value: v.number(),
      endsAt: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const active = await ctx.db
      .query("discounts")
      .withIndex("by_storefront_enabled", (lookup) => lookup.eq("storefront_enabled", true))
      .order("desc")
      .take(10);
    const promotion = active.find((entry) => promotionAvailability(entry, args.now).available);
    if (!promotion) return null;
    return {
      id: promotion._id,
      code: promotion.code,
      title: cleanText(promotion.storefront_title, 100) || promotion.name || "Special offer",
      message:
        cleanText(promotion.storefront_message, 260) ||
        `Use code ${promotion.code} at checkout while this offer is active.`,
      badge: cleanText(promotion.storefront_badge, 18) || "OFFER",
      buttonLabel: cleanText(promotion.storefront_button_label, 40) || "Shop the offer",
      buttonUrl: cleanText(promotion.storefront_button_url, 300) || "/shop",
      type: promotion.type === "fixed" ? ("fixed" as const) : ("percent" as const),
      value: promotion.value,
      endsAt: promotion.ends_at ?? null,
    };
  },
});
