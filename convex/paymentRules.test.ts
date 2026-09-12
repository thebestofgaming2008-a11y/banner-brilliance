import { describe, expect, it } from "vitest";

import {
  CHECKOUT_RECONCILIATION_INITIAL_DELAY_MS,
  CHECKOUT_RECONCILIATION_RETRY_DELAYS_MS,
  PAYMENT_TECHNICAL_RETENTION_MS,
  isActiveDisputeStatus,
} from "./paymentRules";

describe("payment reliability rules", () => {
  it("checks a checkout at 5 minutes, 30 minutes, 2 hours, and 24 hours", () => {
    const elapsed = [CHECKOUT_RECONCILIATION_INITIAL_DELAY_MS];
    for (const delay of CHECKOUT_RECONCILIATION_RETRY_DELAYS_MS) {
      elapsed.push(elapsed.at(-1)! + delay);
    }
    expect(elapsed).toEqual([
      5 * 60 * 1000,
      30 * 60 * 1000,
      2 * 60 * 60 * 1000,
      24 * 60 * 60 * 1000,
    ]);
  });

  it("keeps only temporary payment records for 30 days", () => {
    expect(PAYMENT_TECHNICAL_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it.each(["open", "action_required", "under_review"])("treats %s as an active dispute", (status) =>
    expect(isActiveDisputeStatus(status)).toBe(true),
  );

  it.each(["won", "lost", "closed", null])("does not flag %s as active", (status) => {
    expect(isActiveDisputeStatus(status)).toBe(false);
  });
});
