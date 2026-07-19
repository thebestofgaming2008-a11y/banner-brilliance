"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const ALLOWED_PATH = /^\/(?:orders|payments)(?:[/?][A-Za-z0-9_?&=./-]*)?$/;

export const request = internalAction({
  args: {
    path: v.string(),
    method: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret) {
      return {
        ok: false,
        status: 503,
        error: { code: "CONFIGURATION_ERROR", description: "Payment keys are not configured." },
      };
    }
    if (!ALLOWED_PATH.test(args.path)) {
      return {
        ok: false,
        status: 400,
        error: { code: "INVALID_PATH", description: "Invalid payment API path." },
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`https://api.razorpay.com/v1${args.path}`, {
        method: args.method ?? "GET",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`, "utf8").toString("base64")}`,
          "user-agent": "FawzaanStore/1.0",
        },
        body: args.body,
        signal: controller.signal,
      });
      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!response.ok) {
        const providerError = data?.error ?? {};
        console.error(
          JSON.stringify({
            event: "razorpay_api_error",
            status: response.status,
            code: providerError.code ?? null,
            reason: providerError.reason ?? null,
            source: providerError.source ?? null,
            step: providerError.step ?? null,
          }),
        );
        return {
          ok: false,
          status: response.status,
          error: {
            code: String(providerError.code ?? "PROVIDER_ERROR"),
            description: String(providerError.description ?? "Payment provider request failed."),
            reason: providerError.reason ? String(providerError.reason) : undefined,
            source: providerError.source ? String(providerError.source) : undefined,
            step: providerError.step ? String(providerError.step) : undefined,
          },
        };
      }
      return { ok: true, status: response.status, data };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      console.error(
        JSON.stringify({
          event: "razorpay_network_error",
          kind: timedOut ? "timeout" : "network",
          message: error instanceof Error ? error.message : "Unknown network error",
        }),
      );
      return {
        ok: false,
        status: 503,
        error: {
          code: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
          description: timedOut
            ? "Payment provider request timed out."
            : "Payment provider is temporarily unavailable.",
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  },
});
