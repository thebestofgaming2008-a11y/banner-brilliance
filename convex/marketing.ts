import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { isAdminEmail, nowIso, requireAdmin, writeAuditLog } from "./lib";

const campaignFields = {
  name: v.string(),
  subject: v.string(),
  preheader: v.optional(v.union(v.string(), v.null())),
  body: v.string(),
  buttonLabel: v.optional(v.union(v.string(), v.null())),
  buttonUrl: v.optional(v.union(v.string(), v.null())),
};

function clean(value: string | null | undefined, max: number) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function validEmail(value: string | null | undefined) {
  const email = clean(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function validateCampaign(args: {
  name: string;
  subject: string;
  preheader?: string | null;
  body: string;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
}) {
  const name = clean(args.name, 120);
  const subject = clean(args.subject, 160);
  const body = clean(args.body, 12_000);
  const preheader = clean(args.preheader, 220) || null;
  const buttonLabel = clean(args.buttonLabel, 80) || null;
  const buttonUrl = clean(args.buttonUrl, 1_000) || null;
  if (!name || !subject || !body)
    throw new Error("Campaign name, subject, and message are required.");
  if (buttonUrl && !/^https:\/\//i.test(buttonUrl)) {
    throw new Error("Campaign button links must start with https://.");
  }
  if (buttonLabel && !buttonUrl) throw new Error("Add a button link or remove the button text.");
  return { name, subject, body, preheader, buttonLabel, buttonUrl };
}

function publicCampaign(row: any) {
  const { _id, _creationTime, ...rest } = row;
  return { id: _id, ...rest };
}

async function requireActionAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || !isAdminEmail(identity.email)) throw new Error("Admin access required.");
  return identity;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function unsubscribeToken(email: string) {
  const secret = process.env.MARKETING_SECRET;
  if (!secret) throw new Error("Marketing email is not configured.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email)));
}

async function verifyUnsubscribeToken(email: string, token: string) {
  const expected = await unsubscribeToken(email);
  const left = new TextEncoder().encode(expected);
  const right = new TextEncoder().encode(token);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

function campaignEmail(
  campaign: {
    subject: string;
    preheader?: string | null;
    body: string;
    button_label?: string | null;
    button_url?: string | null;
  },
  unsubscribeUrl: string,
) {
  const paragraphs = campaign.body
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;line-height:1.7">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`,
    )
    .join("");
  const button =
    campaign.button_label && campaign.button_url
      ? `<p style="margin:28px 0"><a href="${escapeHtml(campaign.button_url)}" style="display:inline-block;background:#f4b400;color:#000;padding:14px 22px;text-decoration:none;font-weight:700;text-transform:uppercase;font-size:12px">${escapeHtml(campaign.button_label)}</a></p>`
      : "";
  const preheader = campaign.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(campaign.preheader)}</div>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f6f6f4;color:#111;font-family:Arial,sans-serif">${preheader}<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:auto;background:#fff;border-top:6px solid #f4b400"><tr><td style="padding:34px 30px 12px;text-align:center"><div style="font-family:Georgia,serif;font-size:30px">Fawzaan</div></td></tr><tr><td style="padding:20px 30px 34px"><h1 style="margin:0 0 22px;font-family:Georgia,serif;font-size:28px;line-height:1.2">${escapeHtml(campaign.subject)}</h1>${paragraphs}${button}<p style="margin:30px 0 0;border-top:1px solid #e7e7e3;padding-top:18px;color:#777;font-size:11px;line-height:1.6">You received this because you opted in to Fawzaan offers. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#555">Unsubscribe</a>.</p></td></tr></table></td></tr></table></body></html>`;
}

export const listCampaigns = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("marketing_campaigns")
      .withIndex("by_created_at")
      .order("desc")
      .take(100);
    return rows.map(publicCampaign);
  },
});

export const configuration = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const optedIn = await ctx.db
      .query("profiles")
      .withIndex("by_marketing_consent", (q) => q.eq("marketing_consent", true))
      .collect();
    return {
      ready: Boolean(
        process.env.RESEND_API_KEY &&
        (process.env.MARKETING_FROM_EMAIL || process.env.AUTH_EMAIL_FROM) &&
        process.env.MARKETING_SECRET &&
        (process.env.PUBLIC_SITE_URL || process.env.SITE_URL),
      ),
      hasApiKey: Boolean(process.env.RESEND_API_KEY),
      hasSender: Boolean(process.env.MARKETING_FROM_EMAIL || process.env.AUTH_EMAIL_FROM),
      hasPublicSiteUrl: Boolean(process.env.PUBLIC_SITE_URL || process.env.SITE_URL),
      recipientCount: new Set(optedIn.map((profile) => validEmail(profile.email)).filter(Boolean))
        .size,
    };
  },
});

export const saveCampaign = mutation({
  args: { id: v.optional(v.id("marketing_campaigns")), ...campaignFields },
  handler: async (ctx, args) => {
    const auth = await requireAdmin(ctx);
    const value = validateCampaign(args);
    const timestamp = nowIso();
    const patch = {
      name: value.name,
      subject: value.subject,
      preheader: value.preheader,
      body: value.body,
      button_label: value.buttonLabel,
      button_url: value.buttonUrl,
      updated_at: timestamp,
    };
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new Error("Campaign not found.");
      if (existing.status === "sent" || existing.status === "sending") {
        throw new Error("Sent campaigns cannot be edited. Duplicate it into a new draft instead.");
      }
      await ctx.db.patch(args.id, { ...patch, status: "draft", error: null });
      await writeAuditLog(ctx, {
        action: "marketing_campaign_updated",
        entityType: "marketing_campaign",
        entityId: String(args.id),
        summary: value.name,
      });
      return args.id;
    }
    const id = await ctx.db.insert("marketing_campaigns", {
      ...patch,
      status: "draft",
      recipient_count: 0,
      sent_count: 0,
      failed_count: 0,
      error: null,
      created_by: String((auth.user as any).email ?? ""),
      created_at: timestamp,
      sent_at: null,
    });
    await writeAuditLog(ctx, {
      action: "marketing_campaign_created",
      entityType: "marketing_campaign",
      entityId: String(id),
      summary: value.name,
    });
    return id;
  },
});

export const removeDraft = mutation({
  args: { id: v.id("marketing_campaigns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return false;
    if (campaign.status === "sent" || campaign.status === "sending") {
      throw new Error("Sent campaigns are retained for the audit history.");
    }
    await ctx.db.delete(args.id);
    return true;
  },
});

export const listOptedInRecipients = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("profiles")
      .withIndex("by_marketing_consent", (q) => q.eq("marketing_consent", true))
      .collect();
    const recipients = new Map<string, { email: string; name: string }>();
    for (const row of rows) {
      const email = validEmail(row.email);
      if (email) recipients.set(email, { email, name: clean(row.full_name, 120) });
    }
    return [...recipients.values()];
  },
});

export const beginSending = internalMutation({
  args: { id: v.id("marketing_campaigns"), recipientCount: v.number() },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.id);
    if (!campaign) throw new Error("Campaign not found.");
    if (campaign.status === "sent") throw new Error("This campaign was already sent.");
    if (campaign.status === "sending") throw new Error("This campaign is already sending.");
    if (campaign.status === "failed" && campaign.sent_count > 0) {
      throw new Error(
        "This campaign partially sent and is locked to prevent duplicate emails. Create a new campaign for any follow-up.",
      );
    }
    await ctx.db.patch(args.id, {
      status: "sending",
      recipient_count: args.recipientCount,
      sent_count: 0,
      failed_count: 0,
      error: null,
      updated_at: nowIso(),
    });
    return campaign;
  },
});

export const finishSending = internalMutation({
  args: {
    id: v.id("marketing_campaigns"),
    status: v.string(),
    sentCount: v.number(),
    failedCount: v.number(),
    error: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const timestamp = nowIso();
    await ctx.db.patch(args.id, {
      status: args.status,
      sent_count: args.sentCount,
      failed_count: args.failedCount,
      error: args.error ?? null,
      updated_at: timestamp,
      sent_at: args.status === "sent" ? timestamp : null,
    });
  },
});

export const unsubscribeEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    for (const row of rows) {
      await ctx.db.patch(row._id, { marketing_consent: false, updated_at: nowIso() });
    }
    return rows.length;
  },
});

async function sendResendBatch(payload: unknown[], idempotencyKey: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured in Convex.");
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = clean(await response.text().catch(() => ""), 1_000);
    throw new Error(`Resend rejected the campaign (${response.status}). ${detail}`.trim());
  }
  return await response.json();
}

export const sendTest = action({
  args: { email: v.string(), ...campaignFields },
  handler: async (ctx, args) => {
    await requireActionAdmin(ctx);
    const email = validEmail(args.email);
    if (!email) throw new Error("Enter a valid test email address.");
    const campaign = validateCampaign(args);
    const from = process.env.MARKETING_FROM_EMAIL || process.env.AUTH_EMAIL_FROM;
    const siteUrl = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/$/, "");
    if (!from || !siteUrl)
      throw new Error("Marketing sender and public site URL must be configured.");
    const token = await unsubscribeToken(email);
    const unsubscribeUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    await sendResendBatch(
      [
        {
          from,
          to: [email],
          subject: `[TEST] ${campaign.subject}`,
          html: campaignEmail(
            {
              subject: campaign.subject,
              preheader: campaign.preheader,
              body: campaign.body,
              button_label: campaign.buttonLabel,
              button_url: campaign.buttonUrl,
            },
            unsubscribeUrl,
          ),
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
        },
      ],
      `fawzaan-test-${Date.now()}`,
    );
    return { sent: true };
  },
});

export const sendCampaign = action({
  args: { id: v.id("marketing_campaigns") },
  handler: async (ctx, args) => {
    await requireActionAdmin(ctx);
    const from = process.env.MARKETING_FROM_EMAIL || process.env.AUTH_EMAIL_FROM;
    const siteUrl = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/$/, "");
    if (!from || !siteUrl || !process.env.MARKETING_SECRET || !process.env.RESEND_API_KEY) {
      throw new Error("Marketing email is not fully configured in Convex.");
    }
    const recipients = await ctx.runQuery(internal.marketing.listOptedInRecipients, {});
    if (!recipients.length) throw new Error("There are no opted-in customer accounts yet.");
    const campaign = await ctx.runMutation(internal.marketing.beginSending, {
      id: args.id,
      recipientCount: recipients.length,
    });
    let sentCount = 0;
    try {
      for (let offset = 0; offset < recipients.length; offset += 100) {
        const batch = recipients.slice(offset, offset + 100);
        const payload = await Promise.all(
          batch.map(async (recipient) => {
            const token = await unsubscribeToken(recipient.email);
            const unsubscribeUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=${encodeURIComponent(token)}`;
            return {
              from,
              to: [recipient.email],
              subject: campaign.subject,
              html: campaignEmail(campaign, unsubscribeUrl),
              headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
              tags: [{ name: "campaign", value: String(args.id).replace(/[^a-zA-Z0-9_-]/g, "-") }],
            };
          }),
        );
        await sendResendBatch(payload, `fawzaan-${args.id}-batch-${offset / 100}`);
        sentCount += batch.length;
      }
      await ctx.runMutation(internal.marketing.finishSending, {
        id: args.id,
        status: "sent",
        sentCount,
        failedCount: 0,
        error: null,
      });
      return { sent: sentCount };
    } catch (error) {
      const message = clean(
        error instanceof Error ? error.message : "Campaign sending failed.",
        1_000,
      );
      await ctx.runMutation(internal.marketing.finishSending, {
        id: args.id,
        status: "failed",
        sentCount,
        failedCount: recipients.length - sentCount,
        error: message,
      });
      throw new Error(message);
    }
  },
});

export const unsubscribe = action({
  args: { email: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const email = validEmail(args.email);
    if (!email || !(await verifyUnsubscribeToken(email, clean(args.token, 256)))) {
      throw new Error("This unsubscribe link is invalid or incomplete.");
    }
    await ctx.runMutation(internal.marketing.unsubscribeEmail, { email });
    return { unsubscribed: true };
  },
});
