export const ORDER_STATUS_OPTIONS = [
  "processing",
  "booked",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_OPTIONS)[number];

export function normalizeOrderStatus(value: string | null | undefined): OrderStatus {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();
  if (status === "dispatch" || status === "dispatched") return "shipped";
  return ORDER_STATUS_OPTIONS.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : "processing";
}

export function orderStatusLabel(value: string | null | undefined) {
  const status = normalizeOrderStatus(value);
  if (status === "processing") return "Processing / In Fulfillment";
  if (status === "shipped") return "Dispatch";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
