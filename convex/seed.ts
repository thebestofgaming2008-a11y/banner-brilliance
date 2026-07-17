import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { nowIso, requireAdmin } from "./lib";

const starterCategories = [
  { slug: "shemaghs", name: "Shemaghs", type: "collection", sort_order: 10 },
  { slug: "niqabs", name: "Niqabs", type: "collection", sort_order: 20 },
  { slug: "kufis", name: "Kufis", type: "collection", sort_order: 30 },
  { slug: "gloves", name: "Gloves", type: "collection", sort_order: 40 },
  { slug: "honey", name: "Honey", type: "collection", sort_order: 50 },
  { slug: "watches", name: "Watches", type: "collection", sort_order: 60 },
  { slug: "men", name: "Men", type: "audience", sort_order: 70 },
  { slug: "women", name: "Women", type: "audience", sort_order: 80 },
  { slug: "unisex", name: "Unisex", type: "audience", sort_order: 90 },
];

const starterSettings = [
  { key: "store_name", value: "Fawzaan Store" },
  { key: "checkout_mode", value: "whatsapp" },
  { key: "currency", value: "INR" },
  { key: "whatsapp_order_phone", value: "" },
  { key: "instagram_url", value: "" },
];

const starterProducts = [
  {
    slug: "yemeni-shemagh",
    name: "Yemeni Shemagh",
    short_description: "Hand-loomed Yemeni keffiyeh, the heritage wrap.",
    description:
      "Hand-loomed in 100% long-staple cotton with a tight herringbone weave and knotted tassels. A generous 130 x 130 cm cut wraps without slipping.",
    price_inr: 2800,
    sale_price_inr: 2200,
    category: "Shemaghs",
    category_id: "shemaghs",
    tags: ["men", "bestseller"],
    color_options: ["Red / White", "Black / White", "Ivory"],
    size_options: ["Standard 130 x 130 cm"],
    badge: "Bestseller",
    rating: 4.9,
    reviews_count: 1240,
    stock_quantity: 50,
  },
  {
    slug: "khadija-niqab",
    name: "Khadija Niqab",
    short_description: "Two-layer chiffon niqab with long draping veil.",
    description:
      "Featherlight two-layer chiffon niqab with an extended draping veil. Breathable, opaque, and cut generously to layer over any abaya.",
    price_inr: 650,
    category: "Niqabs",
    category_id: "niqabs",
    tags: ["women", "bestseller"],
    color_options: ["Onyx Black"],
    size_options: ["One Size"],
    badge: "Bestseller",
    rating: 4.9,
    reviews_count: 986,
    stock_quantity: 50,
  },
  {
    slug: "rouge-niqab",
    name: "Rouge Niqab",
    short_description: "A quiet colour statement in premium chiffon.",
    description:
      "Premium chiffon build in a rich rouge dye. Layered, breathable, and drapes softly.",
    price_inr: 720,
    category: "Niqabs",
    category_id: "niqabs",
    tags: ["women", "new"],
    color_options: ["Rouge", "Wine"],
    size_options: ["One Size", "Long"],
    badge: "New",
    rating: 4.8,
    reviews_count: 214,
    stock_quantity: 50,
  },
  {
    slug: "white-kufi",
    name: "White Woven Kufi",
    short_description: "Breathable openwork kufi for daily wear.",
    description: "Openwork cotton kufi, hand-finished. Sits softly and holds shape all day.",
    price_inr: 450,
    category: "Kufis",
    category_id: "kufis",
    tags: ["men"],
    color_options: ["Ivory White"],
    size_options: ["S", "M", "L"],
    rating: 4.7,
    reviews_count: 148,
    stock_quantity: 50,
  },
  {
    slug: "kashmir-multiflora-honey",
    name: "Kashmir Multi-Flora Honey 500g",
    short_description: "Pure Kashmiri highland honey, no adulteration.",
    description:
      "Premium multi-flora honey from the highlands of Kashmir. Cold-extracted, unfiltered, and free from adulteration.",
    price_inr: 850,
    category: "Honey",
    category_id: "honey",
    tags: ["unisex", "bestseller"],
    size_options: ["500g"],
    badge: "Bestseller",
    rating: 4.9,
    reviews_count: 621,
    stock_quantity: 50,
  },
  {
    slug: "kashmir-acacia-honey",
    name: "Kashmir Acacia Honey 500g",
    short_description: "Light, floral Kashmiri acacia. Slow to crystallise.",
    description:
      "Delicate acacia honey from Kashmir, light golden in colour, gentle on the palate, and slow to crystallise.",
    price_inr: 900,
    category: "Honey",
    category_id: "honey",
    tags: ["unisex", "new"],
    size_options: ["500g"],
    badge: "New",
    rating: 4.8,
    reviews_count: 187,
    stock_quantity: 50,
  },
  {
    slug: "kashmir-black-honey",
    name: "Kashmir Wild Black Honey 500g",
    short_description: "Rare dark-forest honey, intense, minerally, wild.",
    description:
      "Deep near-black honey harvested from wild Kashmiri forest blooms. Intense, minerally, and available in limited seasonal batches.",
    price_inr: 1200,
    category: "Honey",
    category_id: "honey",
    tags: ["unisex", "limited"],
    size_options: ["500g"],
    badge: "Limited",
    rating: 4.9,
    reviews_count: 92,
    stock_quantity: 50,
  },
  {
    slug: "sabr-watch-green",
    name: "SABR Green Dial Watch",
    short_description: "A brushed steel everyday watch with a deep green Arabic numeral dial.",
    description:
      "A brushed steel everyday watch with a deep green dial, Eastern Arabic numerals, and a compact square case.",
    price_inr: 3500,
    category: "Watches",
    category_id: "watches",
    tags: ["unisex", "sabr"],
    color_options: ["Green Dial"],
    size_options: ["Standard"],
    badge: null,
    rating: 0,
    reviews_count: 0,
    stock_quantity: 50,
  },
  {
    slug: "sabr-watch-blue",
    name: "SABR Blue Dial Watch",
    short_description: "A brushed steel everyday watch with a blue Arabic numeral dial.",
    description:
      "A brushed steel everyday watch with a muted blue dial, Eastern Arabic numerals, and a compact square case.",
    price_inr: 3500,
    category: "Watches",
    category_id: "watches",
    tags: ["unisex", "sabr", "new"],
    color_options: ["Blue Dial"],
    size_options: ["Standard"],
    badge: "New",
    rating: 0,
    reviews_count: 0,
    stock_quantity: 50,
  },
  {
    slug: "sabr-watch-black",
    name: "SABR Black Dial Watch",
    short_description: "A brushed steel everyday watch with a black Arabic numeral dial.",
    description:
      "A brushed steel everyday watch with a black dial, Eastern Arabic numerals, and a compact square case.",
    price_inr: 3500,
    category: "Watches",
    category_id: "watches",
    tags: ["unisex", "sabr", "bestseller"],
    color_options: ["Black Dial"],
    size_options: ["Standard"],
    badge: "Bestseller",
    rating: 0,
    reviews_count: 0,
    stock_quantity: 50,
  },
  {
    slug: "sabr-watch-white",
    name: "SABR White Dial Watch",
    short_description: "A brushed steel everyday watch with a white Arabic numeral dial.",
    description:
      "A brushed steel everyday watch with a clean white dial, Eastern Arabic numerals, and a compact square case.",
    price_inr: 3500,
    category: "Watches",
    category_id: "watches",
    tags: ["unisex", "sabr", "new"],
    color_options: ["White Dial"],
    size_options: ["Standard"],
    badge: "New",
    rating: 0,
    reviews_count: 0,
    stock_quantity: 50,
  },
];

function optionTypes(product: (typeof starterProducts)[number]) {
  return [
    ...(product.color_options?.length ? [{ name: "Colour", values: product.color_options }] : []),
    ...(product.size_options?.length ? [{ name: "Size", values: product.size_options }] : []),
  ];
}

export const seedStarterStore = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const setupToken = process.env.ADMIN_UPLOAD_TOKEN;
    if (!setupToken || args.token !== setupToken) await requireAdmin(ctx);
    const timestamp = nowIso();
    let categoriesInserted = 0;
    let settingsUpserted = 0;
    let productsUpserted = 0;

    for (const category of starterCategories) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", category.slug))
        .first();
      if (!existing) {
        await ctx.db.insert("categories", {
          ...category,
          is_active: true,
          created_at: timestamp,
          updated_at: timestamp,
        });
        categoriesInserted += 1;
      }
    }

    for (const setting of starterSettings) {
      const existing = await ctx.db
        .query("store_settings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .first();
      if (existing)
        await ctx.db.patch(existing._id, { value: setting.value, updated_at: timestamp });
      else
        await ctx.db.insert("store_settings", {
          key: setting.key,
          value: setting.value,
          updated_at: timestamp,
        });
      settingsUpserted += 1;
    }

    for (const product of starterProducts) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", product.slug))
        .first();
      const payload = {
        ...product,
        price: product.price_inr,
        sale_price: product.sale_price_inr ?? null,
        sku: `FZ-${product.slug.toUpperCase()}`,
        cover_image_url: null,
        images: [],
        linked_product_ids: [],
        cross_sell_product_ids: [],
        upsell_product_ids: [],
        variant_label: null,
        option_types: optionTypes(product),
        variants: [],
        is_active: true,
        is_featured: product.tags.includes("bestseller"),
        show_in_category_section: true,
        is_new_arrival: product.tags.includes("new"),
        is_bestseller: product.tags.includes("bestseller"),
        is_on_sale: Boolean(product.sale_price_inr),
        in_stock: true,
        updated_at: timestamp,
      };
      if (existing) await ctx.db.patch(existing._id, payload);
      else await ctx.db.insert("products", { ...payload, created_at: timestamp });
      productsUpserted += 1;
    }

    return { categoriesInserted, settingsUpserted, productsUpserted };
  },
});

export const seedWatchCollection = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const setupToken = process.env.ADMIN_UPLOAD_TOKEN;
    if (!setupToken || args.token !== setupToken) await requireAdmin(ctx);
    const timestamp = nowIso();
    const category = starterCategories.find((item) => item.slug === "watches")!;
    const existingCategory = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", category.slug))
      .first();

    if (existingCategory) {
      await ctx.db.patch(existingCategory._id, {
        ...category,
        is_active: true,
        updated_at: timestamp,
      });
    } else {
      await ctx.db.insert("categories", {
        ...category,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }

    let inserted = 0;
    let updated = 0;
    for (const product of starterProducts.filter((item) => item.category_id === "watches")) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", product.slug))
        .first();
      const payload = {
        ...product,
        price: product.price_inr,
        sale_price: null,
        sale_price_inr: null,
        sku: `FZ-${product.slug.toUpperCase()}`,
        variant_label: null,
        option_types: optionTypes(product),
        is_active: true,
        is_featured: product.tags.includes("bestseller"),
        show_in_category_section: true,
        is_new_arrival: product.tags.includes("new"),
        is_bestseller: product.tags.includes("bestseller"),
        is_on_sale: false,
        in_stock: true,
        updated_at: timestamp,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
        updated += 1;
      } else {
        await ctx.db.insert("products", {
          ...payload,
          cover_image_url: null,
          images: [],
          linked_product_ids: [],
          cross_sell_product_ids: [],
          upsell_product_ids: [],
          variants: [],
          created_at: timestamp,
        });
        inserted += 1;
      }
    }

    return { inserted, updated };
  },
});

export const retireLegacyLeatherGloves = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const setupToken = process.env.ADMIN_UPLOAD_TOKEN;
    if (!setupToken || args.token !== setupToken) await requireAdmin(ctx);

    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", "leather-gloves"))
      .first();

    if (!product) return { archived: false, reason: "not_found" };

    await ctx.db.patch(product._id, {
      is_active: false,
      in_stock: false,
      stock_quantity: 0,
      updated_at: nowIso(),
    });

    return { archived: true, productId: product._id };
  },
});
