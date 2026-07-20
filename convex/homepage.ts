import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const PAGE_KEY = "home";
const MAX_DOCUMENT_BYTES = 750_000;
const MAX_COMPONENTS = 40;
const MAX_VERSIONS = 30;
const ALLOWED_COMPONENTS = new Set([
  "Hero",
  "CollectionBanners",
  "ProductGrid",
  "SplitEditorial",
  "CollectionFeature",
  "PromoBanner",
  "TextSection",
  "Spacer",
  "FeatureStrip",
  "ImageGallery",
]);

function validateValue(value: unknown, path: string, depth = 0): void {
  if (depth > 8) throw new Error("Homepage content is nested too deeply.");
  if (value == null || typeof value === "boolean" || typeof value === "number") return;
  if (typeof value === "string") {
    if (value.length > 4_000) throw new Error(`${path} is too long.`);
    const field = path.split(".").at(-1)?.toLowerCase() ?? "";
    const isMediaOrLink = field === "image" || field.endsWith("image") || field.endsWith("url");
    if (isMediaOrLink && value) {
      const safe = value.startsWith("/") || value.startsWith("#") || /^https:\/\//i.test(value);
      if (!safe) throw new Error(`${path} must use HTTPS or a site-relative URL.`);
    }
    if (field.includes("color") && value && !/^#[0-9a-f]{6}$/i.test(value)) {
      throw new Error(`${path} must be a six-digit hex colour.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 50) throw new Error(`${path} has too many items.`);
    value.forEach((item, index) => validateValue(item, `${path}.${index}`, depth + 1));
    return;
  }
  if (typeof value !== "object") throw new Error(`${path} contains unsupported data.`);
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) {
      throw new Error("Homepage content contains an unsafe property.");
    }
    validateValue(nested, `${path}.${key}`, depth + 1);
  }
}

function validateHomepageData(data: unknown) {
  const encoded = JSON.stringify(data);
  if (encoded.length > MAX_DOCUMENT_BYTES) {
    throw new Error("Homepage content is too large. Remove unused sections or oversized text.");
  }
  const document = data as {
    root?: unknown;
    content?: Array<{ type?: unknown; props?: { id?: unknown } }>;
  };
  if (!document || typeof document !== "object" || !Array.isArray(document.content)) {
    throw new Error("Homepage document is invalid.");
  }
  if (document.content.length > MAX_COMPONENTS) {
    throw new Error(`A homepage can contain at most ${MAX_COMPONENTS} sections.`);
  }
  const ids = new Set<string>();
  for (const [index, component] of document.content.entries()) {
    if (!component || !ALLOWED_COMPONENTS.has(String(component.type))) {
      throw new Error(`Homepage section ${index + 1} is not supported.`);
    }
    const id = String(component.props?.id ?? "").trim();
    if (!id || id.length > 120 || ids.has(id)) {
      throw new Error(`Homepage section ${index + 1} needs a unique ID.`);
    }
    ids.add(id);
  }
  validateValue(data, "homepage");
  return data;
}

async function trimVersions(ctx: MutationCtx) {
  const versions = await ctx.db
    .query("homepage_versions")
    .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
    .order("desc")
    .collect();
  await Promise.all(versions.slice(MAX_VERSIONS).map((version) => ctx.db.delete(version._id)));
}

export const getEditorState = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const document = await ctx.db
      .query("homepage_documents")
      .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
      .unique();
    const versions = await ctx.db
      .query("homepage_versions")
      .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
      .order("desc")
      .take(MAX_VERSIONS);
    return {
      draft: document?.draft_data ?? null,
      published: document?.published_data ?? null,
      draft_revision: document?.draft_revision ?? 0,
      published_version: document?.published_version ?? 0,
      updated_at: document?.updated_at ?? null,
      published_at: document?.published_at ?? null,
      versions: versions.map((version) => ({
        id: String(version._id),
        version: version.version,
        summary: version.summary ?? null,
        created_by: version.created_by ?? null,
        created_at: version.created_at,
      })),
    };
  },
});

export const getPublished = query({
  args: {},
  handler: async (ctx) => {
    const document = await ctx.db
      .query("homepage_documents")
      .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
      .unique();
    return document?.published_data ?? null;
  },
});

export const saveDraft = mutation({
  args: { data: v.any(), base_revision: v.number() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const adminEmail = String((admin.user as { email?: string }).email ?? "") || null;
    const data = validateHomepageData(args.data);
    const existing = await ctx.db
      .query("homepage_documents")
      .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
      .unique();
    if (existing && args.base_revision !== existing.draft_revision) {
      throw new Error("This homepage changed in another session. Reload before saving again.");
    }
    const timestamp = nowIso();
    const revision = (existing?.draft_revision ?? 0) + 1;
    if (existing) {
      await ctx.db.patch(existing._id, {
        draft_data: data,
        draft_revision: revision,
        updated_by: adminEmail,
        updated_at: timestamp,
      });
    } else {
      await ctx.db.insert("homepage_documents", {
        page_key: PAGE_KEY,
        draft_data: data,
        draft_revision: revision,
        published_version: 0,
        updated_by: adminEmail,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
    return { revision, updated_at: timestamp };
  },
});

export const publish = mutation({
  args: {
    data: v.any(),
    base_revision: v.number(),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const adminEmail = String((admin.user as { email?: string }).email ?? "") || null;
    const data = validateHomepageData(args.data);
    const existing = await ctx.db
      .query("homepage_documents")
      .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
      .unique();
    if (existing && args.base_revision !== existing.draft_revision) {
      throw new Error("This homepage changed in another session. Reload before publishing.");
    }
    const timestamp = nowIso();
    const version = (existing?.published_version ?? 0) + 1;
    const revision = (existing?.draft_revision ?? 0) + 1;
    if (existing) {
      await ctx.db.patch(existing._id, {
        draft_data: data,
        published_data: data,
        draft_revision: revision,
        published_version: version,
        updated_by: adminEmail,
        updated_at: timestamp,
        published_at: timestamp,
      });
    } else {
      await ctx.db.insert("homepage_documents", {
        page_key: PAGE_KEY,
        draft_data: data,
        published_data: data,
        draft_revision: revision,
        published_version: version,
        updated_by: adminEmail,
        created_at: timestamp,
        updated_at: timestamp,
        published_at: timestamp,
      });
    }
    await ctx.db.insert("homepage_versions", {
      page_key: PAGE_KEY,
      version,
      data,
      summary:
        String(args.summary ?? "")
          .trim()
          .slice(0, 160) || null,
      created_by: adminEmail,
      created_at: timestamp,
    });
    await trimVersions(ctx);
    await writeAuditLog(ctx, {
      action: "homepage.publish",
      entityType: "homepage",
      entityId: PAGE_KEY,
      summary: `Published homepage version ${version}`,
      metadata: { version, sections: (data as { content: unknown[] }).content.length },
    });
    return { version, revision, published_at: timestamp };
  },
});

export const restoreVersion = mutation({
  args: { id: v.id("homepage_versions") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const adminEmail = String((admin.user as { email?: string }).email ?? "") || null;
    const selected = await ctx.db.get(args.id);
    if (!selected || selected.page_key !== PAGE_KEY) throw new Error("Homepage version not found.");
    const data = validateHomepageData(selected.data);
    const existing = await ctx.db
      .query("homepage_documents")
      .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
      .unique();
    if (!existing) throw new Error("Homepage document not found.");
    const timestamp = nowIso();
    const version = existing.published_version + 1;
    const revision = existing.draft_revision + 1;
    await ctx.db.patch(existing._id, {
      draft_data: data,
      published_data: data,
      draft_revision: revision,
      published_version: version,
      updated_by: adminEmail,
      updated_at: timestamp,
      published_at: timestamp,
    });
    await ctx.db.insert("homepage_versions", {
      page_key: PAGE_KEY,
      version,
      data,
      summary: `Restored version ${selected.version}`,
      created_by: adminEmail,
      created_at: timestamp,
    });
    await trimVersions(ctx);
    await writeAuditLog(ctx, {
      action: "homepage.restore",
      entityType: "homepage",
      entityId: PAGE_KEY,
      summary: `Restored homepage version ${selected.version} as version ${version}`,
    });
    return { data, version, revision, published_at: timestamp };
  },
});

export const discardDraft = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    const adminEmail = String((admin.user as { email?: string }).email ?? "") || null;
    const existing = await ctx.db
      .query("homepage_documents")
      .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
      .unique();
    if (!existing?.published_data) return null;
    const timestamp = nowIso();
    const revision = existing.draft_revision + 1;
    await ctx.db.patch(existing._id, {
      draft_data: existing.published_data,
      draft_revision: revision,
      updated_by: adminEmail,
      updated_at: timestamp,
    });
    return { data: existing.published_data, revision, updated_at: timestamp };
  },
});
