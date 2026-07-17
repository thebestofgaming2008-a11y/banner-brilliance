import { v } from "convex/values";
import { query } from "./_generated/server";

const RETIRED_DEFAULT_FILTERS = new Set(["men", "women", "unisex", "bestseller", "new", "limited"]);

function publicDoc<T extends { _id: unknown; _creationTime: number }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

export const listActiveTaxonomy = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();
    return rows
      .filter(
        (row) =>
          (row.type === "collection" || row.type === "filter") &&
          !(row.type === "filter" && RETIRED_DEFAULT_FILTERS.has(row.slug)),
      )
      .map(publicDoc)
      .sort(
        (a, b) =>
          Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999) ||
          String(a.name).localeCompare(String(b.name)),
      );
  },
});

export const listActiveBanners = query({
  args: { placement: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = args.placement
      ? await ctx.db
          .query("storefront_banners")
          .withIndex("by_placement", (q) => q.eq("placement", args.placement!))
          .collect()
      : await ctx.db
          .query("storefront_banners")
          .withIndex("by_active", (q) => q.eq("is_active", true))
          .collect();
    return rows
      .filter((row) => row.is_active !== false)
      .map(publicDoc)
      .sort(
        (a, b) =>
          Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999) ||
          String(a.created_at).localeCompare(String(b.created_at)),
      );
  },
});
