/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { evaluateGiftCampaigns } from "./gifts";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

type TestContext = ReturnType<typeof convexTest>;

async function addProduct(t: TestContext, name: string, stock: number, category = "kufis") {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("products", {
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        price: 500,
        price_inr: 500,
        stock_quantity: stock,
        in_stock: stock > 0,
        is_active: true,
        category,
        category_id: category,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
      }),
  );
}

async function addCampaign(
  t: TestContext,
  input: {
    name: string;
    qualifierId: Id<"products">;
    giftId: Id<"products">;
    priority: number;
    combines?: boolean;
    repeatable?: boolean;
    maxAwards?: number;
    allowDiscounts?: boolean;
  },
) {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("gift_campaigns", {
        name: input.name,
        active: true,
        match_mode: "all",
        requirements: [
          {
            label: "Kufis",
            scope_type: "products",
            collection_slugs: [],
            category_ids: [],
            product_ids: [input.qualifierId],
            required_quantity: 2,
          },
        ],
        gift_product_id: input.giftId,
        gift_quantity: 1,
        gift_color: null,
        gift_size: null,
        starts_at: null,
        ends_at: null,
        sort_order: 0,
        priority: input.priority,
        combines_with_other_gifts: input.combines ?? false,
        repeatable: input.repeatable ?? false,
        max_awards_per_order: input.maxAwards ?? 1,
        allow_discount_codes: input.allowDiscounts ?? true,
        archived_at: null,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
      }),
  );
}

describe("gift campaign evaluation", () => {
  test("does not promise a gift when purchased units consume the remaining gift stock", async () => {
    const t = convexTest(schema, modules);
    const productId = await addProduct(t, "White Kufi", 2);
    await addCampaign(t, {
      name: "Buy two, get one",
      qualifierId: productId,
      giftId: productId,
      priority: 100,
    });

    const offers = await t.query(api.gifts.evaluateCart, {
      cart: [{ product_id: productId, quantity: 2 }],
      evaluation_time: Date.now(),
    });

    expect(offers[0]).toMatchObject({
      eligible: true,
      earned: false,
      gift_available: false,
      blocked_reason: "Gift stock is currently unavailable.",
    });
  });

  test("awards only the highest-priority exclusive campaign", async () => {
    const t = convexTest(schema, modules);
    const qualifierId = await addProduct(t, "Premium Kufi", 20);
    const firstGiftId = await addProduct(t, "White Ittar", 20, "other");
    const secondGiftId = await addProduct(t, "Black Ittar", 20, "other");
    await addCampaign(t, {
      name: "Primary reward",
      qualifierId,
      giftId: firstGiftId,
      priority: 100,
    });
    await addCampaign(t, {
      name: "Secondary reward",
      qualifierId,
      giftId: secondGiftId,
      priority: 10,
    });

    const offers = await t.query(api.gifts.evaluateCart, {
      cart: [{ product_id: qualifierId, quantity: 2 }],
      evaluation_time: Date.now(),
    });

    expect(offers.find((offer) => offer.name === "Primary reward")?.earned).toBe(true);
    expect(offers.find((offer) => offer.name === "Secondary reward")).toMatchObject({
      earned: false,
      eligible: true,
      blocked_reason: "Another gift offer has already been applied.",
    });
  });

  test("caps repeatable rewards at the configured per-order maximum", async () => {
    const t = convexTest(schema, modules);
    const qualifierId = await addProduct(t, "Daily Kufi", 20);
    const giftId = await addProduct(t, "Gift Ittar", 20, "other");
    await addCampaign(t, {
      name: "Repeat reward",
      qualifierId,
      giftId,
      priority: 100,
      repeatable: true,
      maxAwards: 2,
    });

    const offers = await t.query(api.gifts.evaluateCart, {
      cart: [{ product_id: qualifierId, quantity: 8 }],
      evaluation_time: Date.now(),
    });

    expect(offers[0]).toMatchObject({
      earned: true,
      award_count: 2,
      gift: { quantity: 2 },
    });
  });

  test("allocates shared gift stock by campaign priority", async () => {
    const t = convexTest(schema, modules);
    const qualifierId = await addProduct(t, "Shared Stock Kufi", 20);
    const giftId = await addProduct(t, "Last Gift Ittar", 1, "other");
    await addCampaign(t, {
      name: "First stackable reward",
      qualifierId,
      giftId,
      priority: 100,
      combines: true,
    });
    await addCampaign(t, {
      name: "Second stackable reward",
      qualifierId,
      giftId,
      priority: 10,
      combines: true,
    });

    const offers = await t.query(api.gifts.evaluateCart, {
      cart: [{ product_id: qualifierId, quantity: 2 }],
      evaluation_time: Date.now(),
    });

    expect(offers.find((offer) => offer.name === "First stackable reward")?.earned).toBe(true);
    expect(offers.find((offer) => offer.name === "Second stackable reward")).toMatchObject({
      earned: false,
      gift_available: false,
      blocked_reason: "Gift stock is currently unavailable.",
    });
  });

  test("blocks campaigns that do not combine with an applied discount", async () => {
    const t = convexTest(schema, modules);
    const qualifierId = await addProduct(t, "Offer Kufi", 20);
    const giftId = await addProduct(t, "Offer Ittar", 20, "other");
    await addCampaign(t, {
      name: "No discount reward",
      qualifierId,
      giftId,
      priority: 100,
      allowDiscounts: false,
    });

    const offers = await t.run(
      async (ctx) =>
        await evaluateGiftCampaigns(ctx, [{ productId: qualifierId, qty: 2 }], Date.now(), {
          hasDiscount: true,
        }),
    );

    expect(offers[0]).toMatchObject({
      eligible: true,
      earned: false,
      blocked_reason: "This gift cannot be combined with the applied discount.",
    });
  });

  test("uses server product prices for minimum-spend campaigns", async () => {
    const t = convexTest(schema, modules);
    const qualifierId = await addProduct(t, "Spend Qualifier", 20);
    const giftId = await addProduct(t, "Spend Gift", 20, "other");
    await t.run(
      async (ctx) =>
        await ctx.db.insert("gift_campaigns", {
          name: "Spend reward",
          active: true,
          match_mode: "all",
          requirements: [
            {
              label: "Cart subtotal",
              scope_type: "subtotal",
              collection_slugs: [],
              category_ids: [],
              product_ids: [],
              required_quantity: 1_000,
            },
          ],
          gift_product_id: giftId,
          gift_quantity: 1,
          sort_order: 0,
          priority: 100,
          combines_with_other_gifts: false,
          repeatable: false,
          max_awards_per_order: 1,
          allow_discount_codes: true,
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
        }),
    );

    const offers = await t.query(api.gifts.evaluateCart, {
      cart: [{ product_id: qualifierId, quantity: 2 }],
      evaluation_time: Date.now(),
    });

    expect(offers[0]).toMatchObject({ earned: true, progress: 100 });
  });
});
