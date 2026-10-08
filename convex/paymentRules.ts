export const PAYMENT_TECHNICAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const CHECKOUT_RECONCILIATION_INITIAL_DELAY_MS = 5 * 60 * 1000;

// Checks run approximately 5 minutes, 30 minutes, 2 hours, and 24 hours after checkout creation.
export const CHECKOUT_RECONCILIATION_RETRY_DELAYS_MS = [
  25 * 60 * 1000,
  90 * 60 * 1000,
  22 * 60 * 60 * 1000,
] as const;

const ACTIVE_DISPUTE_STATUSES = new Set(["open", "action_required", "under_review"]);

export function isActiveDisputeStatus(status: string | null | undefined) {
  return ACTIVE_DISPUTE_STATUSES.has(
    String(status ?? "")
      .trim()
      .toLowerCase(),
  );
}
