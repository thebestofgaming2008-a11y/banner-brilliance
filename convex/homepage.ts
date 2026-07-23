import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const PAGE_KEY = "home";
const MAX_DOCUMENT_BYTES = 750_000;
const MAX_COMPONENTS = 40;
const MAX_VERSIONS = 15;
const ALLOWED_COMPONENTS = new Set(["Hero", "CollectionFeature", "PromoBanner"]);

function isVersion2Homepage(data: unknown): data is {
  schemaVersion: 2;
  content: Array<{ type: string; props: { id: string } }>;
} {
  if (!data || typeof data !== "object") return false;
  const document = data as {
    schemaVersion?: unknown;
    content?: Array<{ type?: unknown; props?: { id?: unknown } }>;
  };
  if (document.schemaVersion !== 2 || !Array.isArray(document.content)) return false;
  if (document.content.length < 1 || document.content[0]?.type !== "Hero") return false;
  return document.content.every(
    (component, index) =>
      (index === 0 && component?.type === "Hero") ||
      (index > 0 && (component?.type === "CollectionFeature" || component?.type === "PromoBanner")),
  );
}

function validateValue(value: unknown, path: string, depth = 0): void {
  if (depth > 12) throw new Error("Homepage content is nested too deeply.");
  if (value == null || typeof value === "boolean" || typeof value === "number") return;
  if (typeof value === "string") {
    if (value.length > 4_000) throw new Error(`${path} is too long.`);
    const field = path.split(".").at(-1)?.toLowerCase() ?? "";
    const isMediaOrLink =
      field === "image" ||
      field === "src" ||
      field === "href" ||
      field.endsWith("image") ||
      field.endsWith("url");
    if (isMediaOrLink && value) {
      const safe = value.startsWith("/") || value.startsWith("#") || /^https:\/\//i.test(value);
      if (!safe) throw new Error(`${path} must use HTTPS or a site-relative URL.`);
    }
    if (field.includes("color") && value && !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) {
      throw new Error(`${path} must be a six- or eight-digit hex colour.`);
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
  if (!isVersion2Homepage(data))
    throw new Error("Homepage document must use the focused editor schema version 2.");
  const document = data;
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
      draft: isVersion2Homepage(document?.draft_data) ? document?.draft_data : null,
      published: null,
      has_published: isVersion2Homepage(document?.published_data),
      is_draft_published: document
        ? document.published_revision != null
          ? document.published_revision === document.draft_revision
          : JSON.stringify(document.draft_data) === JSON.stringify(document.published_data)
        : true,
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
    return isVersion2Homepage(document?.published_data) ? document.published_data : null;
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
        published_revision: revision,
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
        published_revision: revision,
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
      published_revision: revision,
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
      published_revision: revision,
      updated_by: adminEmail,
      updated_at: timestamp,
    });
    return { data: existing.published_data, revision, updated_at: timestamp };
  },
});

export const resetToOriginalHomepage = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const setupToken = process.env.ADMIN_UPLOAD_TOKEN;
    if (!setupToken || args.token !== setupToken) await requireAdmin(ctx);

    const documents = await ctx.db
      .query("homepage_documents")
      .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
      .collect();
    const versions = await ctx.db
      .query("homepage_versions")
      .withIndex("by_page_key", (q) => q.eq("page_key", PAGE_KEY))
      .collect();

    await Promise.all([
      ...documents.map((document) => ctx.db.delete(document._id)),
      ...versions.map((version) => ctx.db.delete(version._id)),
    ]);
    await writeAuditLog(ctx, {
      action: "homepage.reset_original",
      entityType: "homepage",
      entityId: PAGE_KEY,
      summary: "Removed visual editor drafts and restored the original coded homepage",
      metadata: { documentsDeleted: documents.length, versionsDeleted: versions.length },
    });

    return { documentsDeleted: documents.length, versionsDeleted: versions.length };
  },
});
