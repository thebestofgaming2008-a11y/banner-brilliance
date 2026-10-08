import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowIso, requireIdentity } from "./lib";

export const listMine = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx);
    const rows = await ctx.db
      .query("wishlist_items")
      .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
      .take(500);
    return rows.map((row) => row.product_id);
  },
});

export const toggle = mutation({
  args: { productId: v.string() },
  returns: v.object({ saved: v.boolean() }),
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const productId = ctx.db.normalizeId("products", args.productId);
    if (!productId) throw new Error("Product not found.");
    const existing = await ctx.db
      .query("wishlist_items")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", auth.userId).eq("product_id", String(productId)),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }

    const product = await ctx.db.get(productId);
    if (!product || product.is_active === false)
      throw new Error("This product is no longer available.");
    const savedItems = await ctx.db
      .query("wishlist_items")
      .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
      .take(500);
    if (savedItems.length >= 500) throw new Error("Your wishlist has reached its item limit.");

    await ctx.db.insert("wishlist_items", {
      user_id: auth.userId,
      product_id: String(productId),
      created_at: nowIso(),
    });
    return { saved: true };
  },
});
