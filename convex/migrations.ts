import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const HONEY_IMAGE_URL = "https://fawzaanstore.pages.dev/homepage/mosaic-honey.webp";

export const applyAugustCatalogPolish = internalMutation({
  args: {},
  returns: v.object({
    removedOmani: v.boolean(),
    movedProducts: v.number(),
    preorderProducts: v.number(),
    honeyUpdated: v.boolean(),
  }),
  handler: async (ctx) => {
    const timestamp = new Date().toISOString();
    const omani = await ctx.db
      .query("categories")
      .withIndex("by_slug", (query) => query.eq("slug", "omani"))
      .first();
    let movedProducts = 0;

    if (omani) {
      const other = await ctx.db
        .query("categories")
        .withIndex("by_slug", (query) => query.eq("slug", "other"))
        .first();
      const products = await ctx.db.query("products").take(500);
      for (const product of products) {
        if (String(product.category_id ?? "").toLowerCase() !== "omani") continue;
        await ctx.db.patch(product._id, {
          category: other?.name ?? "Other",
          category_id: other?.slug ?? "other",
          updated_at: timestamp,
        });
        movedProducts += 1;
      }
      await ctx.db.delete(omani._id);
    }

    let preorderProducts = 0;
    for (const slug of ["yemini-shemaghs", "omani-ghutra"]) {
      const product = await ctx.db
        .query("products")
        .withIndex("by_slug", (query) => query.eq("slug", slug))
        .first();
      if (!product) continue;
      await ctx.db.patch(product._id, { badge: "Pre-order", updated_at: timestamp });
      preorderProducts += 1;
    }

    const honey = await ctx.db
      .query("products")
      .withIndex("by_slug", (query) => query.eq("slug", "kashmir-acacia-honey"))
      .first();
    if (honey) {
      await ctx.db.patch(honey._id, {
        cover_image_url: HONEY_IMAGE_URL,
        images: Array.from(new Set([HONEY_IMAGE_URL, ...(honey.images ?? [])])).slice(0, 24),
        updated_at: timestamp,
      });
    }

    return {
      removedOmani: Boolean(omani),
      movedProducts,
      preorderProducts,
      honeyUpdated: Boolean(honey),
    };
  },
});

const STORE_COLLECTIONS: Record<string, string> = {
  shemaghs: "Shemaghs",
  niqabs: "Niqabs",
  kufis: "Kufis",
  gloves: "Gloves",
  honey: "Honey",
  watches: "Watches",
  other: "Other",
};

export const repairStoreCollectionLabels = internalMutation({
  args: {},
  returns: v.object({ repaired: v.number() }),
  handler: async (ctx) => {
    const products = await ctx.db.query("products").take(500);
    const timestamp = new Date().toISOString();
    let repaired = 0;

    for (const product of products) {
      const categoryId = String(product.category_id ?? "")
        .trim()
        .toLowerCase();
      const category = STORE_COLLECTIONS[categoryId];
      if (!category || product.category === category) continue;
      await ctx.db.patch(product._id, { category, updated_at: timestamp });
      repaired += 1;
    }

    return { repaired };
  },
});
