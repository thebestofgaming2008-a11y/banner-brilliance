import { describe, expect, it } from "vitest";

import { summarizeRefundLifecycle } from "./refundRules";

describe("Razorpay refund lifecycle", () => {
  it("keeps a newly created refund pending", () => {
    expect(
      summarizeRefundLifecycle({
        refunds: [{ status: "created", amount_paise: 5_000 }],
        paymentAmountPaise: 65_000,
      }),
    ).toEqual({ refundedPaise: 0, fullyRefunded: false, refundStatus: "pending" });
  });

  it("records a processed partial refund", () => {
    expect(
      summarizeRefundLifecycle({
        refunds: [{ status: "processed", amount_paise: 5_000 }],
        paymentAmountPaise: 65_000,
      }),
    ).toEqual({
      refundedPaise: 5_000,
      fullyRefunded: false,
      refundStatus: "partially_refunded",
    });
  });

  it("recognizes a full refund across multiple processed refunds", () => {
    expect(
      summarizeRefundLifecycle({
        refunds: [
          { status: "processed", amount_paise: 20_000 },
          { status: "processed", amount_paise: 45_000 },
        ],
        paymentAmountPaise: 65_000,
      }),
    ).toEqual({ refundedPaise: 65_000, fullyRefunded: true, refundStatus: "refunded" });
  });

  it("uses Razorpay's cumulative refunded amount when it is higher", () => {
    expect(
      summarizeRefundLifecycle({
        refunds: [{ status: "processed", amount_paise: 20_000 }],
        totalRefundedPaise: 65_000,
        paymentAmountPaise: 65_000,
      }),
    ).toEqual({ refundedPaise: 65_000, fullyRefunded: true, refundStatus: "refunded" });
  });

  it("surfaces a failed refund when no money was processed", () => {
    expect(
      summarizeRefundLifecycle({
        refunds: [{ status: "failed", amount_paise: 65_000 }],
        paymentAmountPaise: 65_000,
      }),
    ).toEqual({ refundedPaise: 0, fullyRefunded: false, refundStatus: "failed" });
  });
});
