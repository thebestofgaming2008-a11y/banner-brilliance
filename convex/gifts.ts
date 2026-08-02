import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const nullableString = v.optional(v.union(v.string(), v.null()));
const matchMode = v.union(v.literal("all"), v.literal("any"));
const scopeType = v.union(v.literal("collection"), v.literal("products"));

const requirementValidator = v.object({
  label: v.string(),
  scope_type: scopeType,
  collection_slugs: v.array(v.string()),
  product_ids: v.array(v.id("products")),
  required_quantity: v.number(),
});

const campaignValidator = v.object({
  id: v.id("gift_campaigns"),
  name: v.string(),
  active: v.boolean(),
  match_mode: matchMode,
  requirements: v.array(requirementValidator),
  gift_product_id: v.id("products"),
  gift_quantity: v.number(),
  gift_color: v.union(v.string(), v.null()),
  gift_size: v.union(v.string(), v.null()),
  starts_at: v.union(v.string(), v.null()),
  ends_at: v.union(v.string(), v.null()),
  sort_order: v.number(),
  created_at: v.string(),
  updated_at: v.string(),
});

const evaluatedCampaignValidator = v.object({
  ...campaignValidator.fields,
  earned: v.boolean(),
  progress: v.number(),
  gift_available: v.boolean(),
  requirements: v.array(
    v.object({
      ...requirementValidator.fields,
      current_quantity: v.number(),
      complete: v.boolean(),
    }),
  ),
  gift: v.object({
    id: v.id("products"),
    name: v.string(),
    slug: v.union(v.string(), v.null()),
    image: v.union(v.string(), v.null()),
    quantity: v.number(),
    color: v.union(v.string(), v.null()),
    size: v.union(v.string(), v.null()),
  }),
});

const campaignInput = {
  name: v.string(),
  active: v.boolean(),
  match_mode: matchMode,
  requirements: v.array(requirementValidator),
  gift_product_id: v.id("products"),
  gift_quantity: v.number(),
  gift_color: nullableString,
  gift_size: nullableString,
  starts_at: nullableString,
  ends_at: nullableString,
  sort_order: v.number(),
};

function cleanText(value: string | null | undefined, max = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 160) {
  return cleanText(value, max) || null;
}

function normalize(value: string | null | undefined) {
  return cleanText(value, 100)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicCampaign(campaign: Doc<"gift_campaigns">) {
  return {
    id: campaign._id,
    name: campaign.name,
    active: campaign.active,
    match_mode: campaign.match_mode,
    requirements: campaign.requirements,
    gift_product_id: campaign.gift_product_id,
    gift_quantity: campaign.gift_quantity,
    gift_color: campaign.gift_color ?? null,
    gift_size: campaign.gift_size ?? null,
    starts_at: campaign.starts_at ?? null,
    ends_at: campaign.ends_at ?? null,
    sort_order: campaign.sort_order,
    created_at: campaign.created_at,
    updated_at: campaign.updated_at,
  };
}

function campaignIsLive(campaign: Doc<"gift_campaigns">, now: number) {
  if (!campaign.active) return false;
  const startsAt = campaign.starts_at ? Date.parse(campaign.starts_at) : null;
  const endsAt = campaign.ends_at ? Date.parse(campaign.ends_at) : null;
  return !(startsAt !== null && startsAt > now) && !(endsAt !== null && endsAt <= now);
}

function validateDateRange(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  const start = startsAt ? Date.parse(startsAt) : null;
  const end = endsAt ? Date.parse(endsAt) : null;
  if (start !== null && !Number.isFinite(start)) throw new ConvexError("Start date is invalid.");
  if (end !== null && !Number.isFinite(end)) throw new ConvexError("End date is invalid.");
  if (start !== null && end !== null && end <= start)
    throw new ConvexError("End date must be after the start date.");
}

async function validatedValues(
  ctx: MutationCtx,
  args: Omit<Doc<"gift_campaigns">, "_id" | "_creationTime" | "created_at" | "updated_at">,
) {
  const name = cleanText(args.name, 100);
  if (!name) throw new ConvexError("Add a campaign name.");
  if (!Number.isInteger(args.gift_quantity) || args.gift_quantity < 1 || args.gift_quantity > 10)
    throw new ConvexError("Gift quantity must be between 1 and 10.");
  if (!Number.isFinite(args.sort_order)) throw new ConvexError("Sort order is invalid.");
  if (!args.requirements.length || args.requirements.length > 6)
    throw new ConvexError("Add between 1 and 6 requirements.");
  validateDateRange(args.starts_at, args.ends_at);

  const gift = await ctx.db.get(args.gift_product_id);
  if (!gift) throw new ConvexError("Choose a valid gift product.");
  const giftColor = cleanNullable(args.gift_color, 60);
  const giftSize = cleanNullable(args.gift_size, 60);
  if (
    giftColor &&
    !(gift.color_options ?? []).some((option) => option.toLowerCase() === giftColor.toLowerCase())
  )
    throw new ConvexError("Choose a colour available on the gift product.");
  if (
    giftSize &&
    !(gift.size_options ?? []).some((option) => option.toLowerCase() === giftSize.toLowerCase())
  )
    throw new ConvexError("Choose a size available on the gift product.");

  const requirements = [];
  for (const requirement of args.requirements) {
    const quantity = Math.floor(requirement.required_quantity);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99)
      throw new ConvexError("Each required quantity must be between 1 and 99.");
    const collections = Array.from(
      new Set(requirement.collection_slugs.map(normalize).filter(Boolean)),
    ).slice(0, 12);
    const productIds = Array.from(new Set(requirement.product_ids)).slice(0, 50);
    if (requirement.scope_type === "collection" && !collections.length)
      throw new ConvexError("Choose a collection for every collection requirement.");
    if (requirement.scope_type === "products" && !productIds.length)
      throw new ConvexError("Choose at least one product for every product requirement.");
    for (const productId of productIds) {
      if (!(await ctx.db.get(productId)))
        throw new ConvexError("A selected qualifying product no longer exists.");
    }
    requirements.push({
      label:
        cleanText(requirement.label, 100) ||
        (requirement.scope_type === "collection" ? "Selected collection" : "Selected products"),
      scope_type: requirement.scope_type,
      collection_slugs: requirement.scope_type === "collection" ? collections : [],
      product_ids: requirement.scope_type === "products" ? productIds : [],
      required_quantity: quantity,
    });
  }

  return {
    name,
    active: args.active,
    match_mode: args.match_mode,
    requirements,
    gift_product_id: args.gift_product_id,
    gift_quantity: args.gift_quantity,
    gift_color: giftColor,
    gift_size: giftSize,
    starts_at: cleanNullable(args.starts_at, 40),
    ends_at: cleanNullable(args.ends_at, 40),
    sort_order: Math.max(0, Math.floor(args.sort_order)),
  };
}

type CartLine = { productId: string; qty: number };

export async function evaluateGiftCampaigns(
  ctx: QueryCtx | MutationCtx,
  cart: CartLine[],
  evaluationTime = Date.now(),
) {
  const campaigns = await ctx.db
    .query("gift_campaigns")
    .withIndex("by_active", (lookup) => lookup.eq("active", true))
    .take(50);
  const liveCampaigns = campaigns.filter((campaign) => campaignIsLive(campaign, evaluationTime));
  if (!liveCampaigns.length) return [];

  const productMap = new Map<string, Doc<"products">>();
  for (const line of cart.slice(0, 100)) {
    const productId = ctx.db.normalizeId("products", cleanText(line.productId, 200));
    if (!productId || productMap.has(String(productId))) continue;
    const product = await ctx.db.get(productId);
    if (product) productMap.set(String(productId), product);
  }

  const results = [];
  for (const campaign of liveCampaigns) {
    const giftProduct = await ctx.db.get(campaign.gift_product_id);
    if (!giftProduct || giftProduct.is_active === false) continue;
    const requirements = campaign.requirements.map((requirement) => {
      const productIds = new Set(requirement.product_ids.map(String));
      const collections = new Set(requirement.collection_slugs.map(normalize));
      const currentQuantity = cart.reduce((sum, line) => {
        const product = productMap.get(String(line.productId));
        if (!product) return sum;
        const matches =
          requirement.scope_type === "products"
            ? productIds.has(String(product._id))
            : collections.has(normalize(product.category_id)) ||
              collections.has(normalize(product.category));
        return matches ? sum + Math.max(0, Math.floor(line.qty)) : sum;
      }, 0);
      return {
        ...requirement,
        current_quantity: currentQuantity,
        complete: currentQuantity >= requirement.required_quantity,
      };
    });
    const earned =
      campaign.match_mode === "all"
        ? requirements.every((requirement) => requirement.complete)
        : requirements.some((requirement) => requirement.complete);
    const ratios = requirements.map((requirement) =>
      Math.min(1, requirement.current_quantity / requirement.required_quantity),
    );
    const progress = Math.round(
      100 *
        (campaign.match_mode === "all"
          ? ratios.reduce((sum, ratio) => sum + ratio, 0) / Math.max(1, ratios.length)
          : Math.max(0, ...ratios)),
    );
    const giftAvailable =
      giftProduct.in_stock !== false &&
      Number(giftProduct.stock_quantity ?? 0) >= campaign.gift_quantity;
    results.push({
      ...publicCampaign(campaign),
      earned: earned && giftAvailable,
      progress,
      gift_available: giftAvailable,
      requirements,
      gift: {
        id: giftProduct._id,
        name: giftProduct.name,
        slug: giftProduct.slug ?? null,
        image: giftProduct.cover_image_url ?? null,
        quantity: campaign.gift_quantity,
        color: campaign.gift_color ?? (giftProduct.color_options ?? [])[0] ?? null,
        size: campaign.gift_size ?? (giftProduct.size_options ?? [])[0] ?? null,
      },
    });
  }
  return results.sort((left, right) => left.sort_order - right.sort_order);
}

export const listAdmin = query({
  args: {},
  returns: v.array(campaignValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("gift_campaigns").withIndex("by_sort_order").take(100);
    return rows.map(publicCampaign);
  },
});

export const evaluateCart = query({
  args: {
    cart: v.array(v.object({ product_id: v.string(), quantity: v.number() })),
    evaluation_time: v.number(),
  },
  returns: v.array(evaluatedCampaignValidator),
  handler: async (ctx, args) =>
    await evaluateGiftCampaigns(
      ctx,
      args.cart.slice(0, 100).map((line) => ({
        productId: cleanText(line.product_id, 200),
        qty: Math.min(99, Math.max(0, Math.floor(line.quantity))),
      })),
      args.evaluation_time,
    ),
});

export const save = mutation({
  args: { id: v.optional(v.id("gift_campaigns")), ...campaignInput },
  returns: campaignValidator,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const values = await validatedValues(ctx, args);
    const timestamp = nowIso();
    let id: Id<"gift_campaigns">;
    if (args.id) {
      if (!(await ctx.db.get(args.id))) throw new ConvexError("Gift campaign not found.");
      await ctx.db.patch(args.id, { ...values, updated_at: timestamp });
      id = args.id;
    } else {
      id = await ctx.db.insert("gift_campaigns", {
        ...values,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
    await writeAuditLog(ctx, {
      action: args.id ? "gift_campaign.update" : "gift_campaign.create",
      entityType: "gift_campaign",
      entityId: String(id),
      summary: values.name,
    });
    const saved = await ctx.db.get(id);
    if (!saved) throw new ConvexError("Gift campaign could not be saved.");
    return publicCampaign(saved);
  },
});

export const remove = mutation({
  args: { id: v.id("gift_campaigns") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return false;
    await ctx.db.delete(args.id);
    await writeAuditLog(ctx, {
      action: "gift_campaign.delete",
      entityType: "gift_campaign",
      entityId: String(args.id),
      summary: campaign.name,
    });
    return true;
  },
});
