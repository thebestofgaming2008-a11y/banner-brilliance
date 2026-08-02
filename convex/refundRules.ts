export function summarizeRefundLifecycle({
  refunds,
  totalRefundedPaise = 0,
  paymentAmountPaise = 0,
  fallbackStatus = "pending",
}: {
  refunds: Array<{ status: string; amount_paise: number }>;
  totalRefundedPaise?: number;
  paymentAmountPaise?: number;
  fallbackStatus?: string;
}) {
  const processedTotal = refunds
    .filter((refund) => refund.status === "processed")
    .reduce((sum, refund) => sum + Math.max(0, refund.amount_paise), 0);
  const refundedPaise = Math.max(processedTotal, Math.max(0, Math.floor(totalRefundedPaise)));
  const fullyRefunded = paymentAmountPaise > 0 && refundedPaise >= paymentAmountPaise;
  const hasPending = refunds.some((refund) => ["created", "pending"].includes(refund.status));
  const hasFailed = refunds.some((refund) => refund.status === "failed");
  const refundStatus = fullyRefunded
    ? "refunded"
    : refundedPaise > 0
      ? "partially_refunded"
      : hasPending
        ? "pending"
        : hasFailed
          ? "failed"
          : fallbackStatus;

  return { refundedPaise, fullyRefunded, refundStatus };
}
