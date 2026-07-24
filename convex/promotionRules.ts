import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ConvexError } from "convex/values";

type PromotionContext = Pick<QueryCtx | MutationCtx, "db">;

type PromotionCartLine = {
  productId: string;
  qty: number;
  priceInr: number;
};

export type PromotionResult = {
  promotionId: Id<"discounts">;
  code: string;
  name: string;
  discount: number;
  eligibleSubtotal: number;
  type: "percent" | "fixed";
  value: number;
};

export function normalizePromotionCode(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, 40);
}

function dateValue(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function promotionAvailability(
  promotion: Doc<"discounts">,
  now = Date.now(),
): { available: boolean; reason: string | null } {
  if (!promotion.active) return { available: false, reason: "This promotion is not active." };
  const startsAt = dateValue(promotion.starts_at);
  if (startsAt !== null && startsAt > now)
    return { available: false, reason: "This promotion has not started yet." };
  const endsAt = dateValue(promotion.ends_at);
  if (endsAt !== null && endsAt <= now)
    return { available: false, reason: "This promotion has ended." };
  const usageLimit = Number(promotion.usage_limit ?? 0);
  if (usageLimit > 0 && promotion.used_count >= usageLimit)
    return { available: false, reason: "This promotion has reached its usage limit." };
  return { available: true, reason: null };
}

function selectedProductIds(promotion: Doc<"discounts">) {
  if (Array.isArray(promotion.product_ids) && promotion.product_ids.length)
    return new Set(promotion.product_ids.map(String));
  if (promotion.scope_type === "product" && promotion.scope_value)
    return new Set([promotion.scope_value]);
  if (promotion.scope_type === "products" && promotion.scope_value)
    return new Set(
      promotion.scope_value
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
  return null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function promotionError(message: string): never {
  throw new ConvexError(message);
}

export async function evaluatePromotion(
  ctx: PromotionContext,
  codeValue: string | null | undefined,
  cart: PromotionCartLine[],
  subtotal: number,
): Promise<PromotionResult | null> {
  const code = normalizePromotionCode(codeValue);
  if (!code) return null;
  const promotion = await ctx.db
    .query("discounts")
    .withIndex("by_code", (query) => query.eq("code", code))
    .first();
  if (!promotion) promotionError("Promotion code not found.");

  const availability = promotionAvailability(promotion);
  if (!availability.available) promotionError(availability.reason ?? "Promotion is unavailable.");

  const minimumSubtotal = Math.max(0, Number(promotion.minimum_subtotal ?? 0));
  if (subtotal < minimumSubtotal) {
    promotionError(
      `This promotion requires a minimum product subtotal of INR ${minimumSubtotal.toLocaleString("en-IN")}.`,
    );
  }

  const selectedIds = selectedProductIds(promotion);
  const eligibleSubtotal = roundCurrency(
    cart.reduce((sum, line) => {
      if (selectedIds && !selectedIds.has(String(line.productId))) return sum;
      return sum + Math.max(0, line.priceInr) * Math.max(1, Math.floor(line.qty));
    }, 0),
  );
  if (eligibleSubtotal <= 0)
    promotionError("This promotion does not apply to the products in your cart.");

  const type = promotion.type === "fixed" ? "fixed" : "percent";
  const value =
    type === "percent"
      ? Math.min(100, Math.max(0, Number(promotion.value)))
      : Math.max(0, Number(promotion.value));
  let discount = type === "percent" ? eligibleSubtotal * (value / 100) : value;
  const maximumDiscount = Math.max(0, Number(promotion.maximum_discount ?? 0));
  if (maximumDiscount > 0) discount = Math.min(discount, maximumDiscount);
  discount = roundCurrency(Math.min(eligibleSubtotal, discount));
  if (discount <= 0) promotionError("This promotion does not provide a discount.");

  return {
    promotionId: promotion._id,
    code: promotion.code,
    name: String(promotion.name || promotion.code),
    discount,
    eligibleSubtotal,
    type,
    value,
  };
}

export async function reservePromotionUse(ctx: MutationCtx, promotionId: Id<"discounts">) {
  const promotion = await ctx.db.get(promotionId);
  if (!promotion) promotionError("Promotion is no longer available.");
  const availability = promotionAvailability(promotion);
  if (!availability.available) promotionError(availability.reason ?? "Promotion is unavailable.");
  await ctx.db.patch(promotionId, {
    used_count: Math.max(0, promotion.used_count) + 1,
    updated_at: new Date().toISOString(),
  });
}

export async function releasePromotionUse(
  ctx: MutationCtx,
  promotionId: Id<"discounts"> | null | undefined,
) {
  if (!promotionId) return;
  const promotion = await ctx.db.get(promotionId);
  if (!promotion) return;
  await ctx.db.patch(promotionId, {
    used_count: Math.max(0, promotion.used_count - 1),
    updated_at: new Date().toISOString(),
  });
}
