import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  CreditCard,
  ExternalLink,
  Gift,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import type { AdminOrder } from "@/services/adminService";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { normalizeOrderStatus, ORDER_STATUS_OPTIONS, orderStatusLabel } from "@/lib/order-status";

function formatPrice(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleCase(value: string | null | undefined, fallback = "Not recorded") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

function statusClasses(value: string | null | undefined) {
  const status = String(value ?? "").toLowerCase();
  if (status === "paid" || status === "delivered")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "partially_refunded" || status === "pending")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (["open", "action_required", "under_review"].includes(status))
    return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "won" || status === "closed")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "lost") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "refunded") return "border-violet-200 bg-violet-50 text-violet-800";
  if (status === "cancelled" || status === "returned" || status === "failed")
    return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "shipped" || status === "booked" || status === "processing")
    return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-[#D1D5DB] bg-[#F9FAFB] text-[#4B5563]";
}

function StatusPill({ value, label }: { value: string | null | undefined; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase",
        statusClasses(value),
      )}
    >
      {label ?? titleCase(value)}
    </span>
  );
}

function DetailHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-semibold uppercase text-[#6B7280]">{children}</h3>;
}

export function OrderDetailsSheet({
  order,
  open,
  onOpenChange,
  onStatusChange,
  onSendWhatsApp,
}: {
  order: AdminOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onSendWhatsApp: (
    order: AdminOrder,
    payload: { carrier: string; trackingNumber: string; trackingUrl: string },
  ) => Promise<void>;
}) {
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  useEffect(() => {
    setCarrier(order?.tracking_carrier ?? "");
    setTrackingNumber(order?.tracking_number ?? "");
    setTrackingUrl(order?.tracking_url ?? "");
  }, [order?.id, order?.tracking_carrier, order?.tracking_number, order?.tracking_url]);

  const addressLines = useMemo(() => {
    const address = order?.shipping_address;
    if (!address) return [];
    return [
      address.address_line_1,
      address.address_line_2,
      [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
      address.country,
    ].filter((line): line is string => Boolean(line));
  }, [order?.shipping_address]);

  if (!order) return null;

  const orderNumber = order.order_number ?? order.id.slice(0, 8);
  const phone = order.customer_phone ?? order.shipping_address?.phone ?? "";
  const email = order.customer_email ?? order.shipping_address?.email ?? "";
  const whatsappPhone = normalizePhone(phone);
  const items = order.items ?? [];
  const subtotal = order.subtotal ?? items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = Number(order.discount ?? 0);
  const shipping = Number(order.shipping_cost ?? 0);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`${label} could not be copied.`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]"
        data-testid="admin-order-details"
      >
        <SheetHeader className="shrink-0 border-b border-[#E5E7EB] px-5 py-5 pr-14 text-left sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-[#6B7280]">{orderNumber}</p>
              <SheetTitle className="mt-1 text-xl text-[#111827]">Order details</SheetTitle>
              <SheetDescription className="mt-1 text-xs text-[#6B7280]">
                Placed {formatDate(order.created_at)}
              </SheetDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill value={order.status} label={orderStatusLabel(order.status)} />
              <StatusPill value={order.payment_status} />
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="px-5 py-5 sm:px-6" aria-labelledby="order-items-heading">
            <div className="flex items-center justify-between gap-4">
              <DetailHeading>Items</DetailHeading>
              <span className="text-xs text-[#6B7280]">
                {items.reduce((sum, item) => sum + item.quantity, 0)} total
              </span>
            </div>
            <div className="mt-3 divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
              {items.map((item) => (
                <article
                  key={item.id}
                  className={cn("flex gap-3 py-4", item.is_gift && "bg-amber-50/50")}
                >
                  <div className="grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded border border-[#E5E7EB] bg-[#F3F4F6]">
                    {item.product_image_url ? (
                      <img
                        src={item.product_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : item.is_gift ? (
                      <Gift className="h-5 w-5 text-[#C94D2B]" />
                    ) : (
                      <Package className="h-5 w-5 text-[#9CA3AF]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {item.is_gift ? (
                          <span className="mb-1 inline-flex rounded-full bg-[#C94D2B] px-2 py-0.5 text-[9px] font-semibold uppercase text-white">
                            Free gift
                          </span>
                        ) : null}
                        <p className="text-sm font-semibold leading-5 text-[#111827]">
                          {item.product_name ?? "Product"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-[#111827]">
                        {item.is_gift ? "FREE" : formatPrice(item.subtotal)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      Qty {item.quantity}
                      {[item.selected_color, item.selected_size].filter(Boolean).length
                        ? ` | ${[item.selected_color, item.selected_size].filter(Boolean).join(" / ")}`
                        : ""}
                    </p>
                    {item.is_gift && item.gift_campaign_name ? (
                      <p className="mt-1 text-[11px] text-[#9A5A22]">
                        Awarded by {item.gift_campaign_name}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
              {!items.length ? (
                <p className="py-5 text-sm text-[#6B7280]">No item details were recorded.</p>
              ) : null}
            </div>

            <dl className="ml-auto mt-4 max-w-xs space-y-2 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-[#6B7280]">Subtotal</dt>
                <dd className="font-medium tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between gap-6 text-emerald-700">
                  <dt>Discount{order.promotion_code ? ` (${order.promotion_code})` : ""}</dt>
                  <dd className="font-medium tabular-nums">-{formatPrice(discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-6">
                <dt className="text-[#6B7280]">Shipping</dt>
                <dd className="font-medium tabular-nums">
                  {shipping > 0 ? formatPrice(shipping) : "To confirm / free"}
                </dd>
              </div>
              <div className="flex justify-between gap-6 border-t border-[#E5E7EB] pt-3 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-bold tabular-nums">
                  {formatPrice(order.total_inr ?? order.total)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="border-t border-[#E5E7EB] px-5 py-5 sm:px-6">
            <DetailHeading>Customer and delivery</DetailHeading>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#111827]">
                  {order.customer_name ?? order.shipping_address?.name ?? "Customer"}
                </p>
                {email ? (
                  <div className="flex min-w-0 items-center gap-2 text-sm text-[#4B5563]">
                    <Mail className="h-4 w-4 shrink-0" />
                    <a href={`mailto:${email}`} className="min-w-0 truncate hover:underline">
                      {email}
                    </a>
                    <button
                      type="button"
                      aria-label="Copy customer email"
                      title="Copy email"
                      onClick={() => void copyText(email, "Email")}
                      className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-[#F3F4F6]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
                {phone ? (
                  <div className="flex items-center gap-2 text-sm text-[#4B5563]">
                    <Phone className="h-4 w-4 shrink-0" />
                    <a href={`tel:${phone}`} className="hover:underline">
                      {phone}
                    </a>
                    <button
                      type="button"
                      aria-label="Copy customer phone"
                      title="Copy phone"
                      onClick={() => void copyText(phone, "Phone")}
                      className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-[#F3F4F6]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
                {whatsappPhone ? (
                  <a
                    href={`https://wa.me/${whatsappPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[#111827] px-3 text-xs font-semibold text-white"
                  >
                    <MessageCircle className="h-4 w-4" /> Contact on WhatsApp
                  </a>
                ) : null}
              </div>
              <div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" />
                  <div className="min-w-0 flex-1">
                    {addressLines.length ? (
                      <address className="not-italic text-sm leading-6 text-[#4B5563]">
                        {addressLines.map((line) => (
                          <span key={line} className="block">
                            {line}
                          </span>
                        ))}
                      </address>
                    ) : (
                      <p className="text-sm text-[#6B7280]">No delivery address recorded.</p>
                    )}
                  </div>
                  {addressLines.length ? (
                    <button
                      type="button"
                      aria-label="Copy delivery address"
                      title="Copy address"
                      onClick={() => void copyText(addressLines.join("\n"), "Address")}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-[#F3F4F6]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                {order.shipping_payment_note ? (
                  <p className="mt-3 text-xs leading-5 text-[#6B7280]">
                    {order.shipping_payment_note}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="border-t border-[#E5E7EB] px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#6B7280]" />
              <DetailHeading>Payment</DetailHeading>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[#6B7280]">Provider</dt>
                <dd className="mt-1 font-medium text-[#111827]">
                  {titleCase(order.payment_provider)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280]">Method</dt>
                <dd className="mt-1 font-medium text-[#111827]">
                  {titleCase(order.payment_method)}
                </dd>
              </div>
              {order.payment_order_id ? (
                <div className="min-w-0">
                  <dt className="text-xs text-[#6B7280]">Payment order ID</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="min-w-0 break-all font-mono text-xs">
                      {order.payment_order_id}
                    </span>
                    <button
                      type="button"
                      aria-label="Copy payment order ID"
                      title="Copy payment order ID"
                      onClick={() => void copyText(order.payment_order_id!, "Payment order ID")}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-[#F3F4F6]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </dd>
                </div>
              ) : null}
              {order.payment_id ? (
                <div className="min-w-0">
                  <dt className="text-xs text-[#6B7280]">Payment ID</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="min-w-0 break-all font-mono text-xs">{order.payment_id}</span>
                    <button
                      type="button"
                      aria-label="Copy payment ID"
                      title="Copy payment ID"
                      onClick={() => void copyText(order.payment_id!, "Payment ID")}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-[#F3F4F6]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </dd>
                </div>
              ) : null}
              {order.refund_status ? (
                <div>
                  <dt className="text-xs text-[#6B7280]">Refund status</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusPill value={order.refund_status} />
                    {Number(order.refunded_amount_inr ?? 0) > 0 ? (
                      <span className="text-xs font-medium text-[#111827]">
                        {formatPrice(order.refunded_amount_inr)} refunded
                      </span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              {order.latest_refund_id ? (
                <div className="min-w-0">
                  <dt className="text-xs text-[#6B7280]">Latest refund ID</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="min-w-0 break-all font-mono text-xs">
                      {order.latest_refund_id}
                    </span>
                    <button
                      type="button"
                      aria-label="Copy refund ID"
                      title="Copy refund ID"
                      onClick={() => void copyText(order.latest_refund_id!, "Refund ID")}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-[#F3F4F6]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </dd>
                </div>
              ) : null}
              {order.dispute_status ? (
                <div>
                  <dt className="text-xs text-[#6B7280]">Dispute status</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusPill value={order.dispute_status} />
                    {Number(order.dispute_amount_inr ?? 0) > 0 ? (
                      <span className="text-xs font-medium text-[#111827]">
                        {formatPrice(order.dispute_amount_inr)} disputed
                      </span>
                    ) : null}
                  </dd>
                  {order.dispute_reason ? (
                    <p className="mt-2 text-xs text-[#6B7280]">
                      {titleCase(order.dispute_reason)}
                      {order.dispute_phase ? ` · ${titleCase(order.dispute_phase)}` : ""}
                    </p>
                  ) : null}
                  {order.dispute_respond_by ? (
                    <p className="mt-1 text-xs font-semibold text-rose-700">
                      Respond in Razorpay by{" "}
                      {formatDate(new Date(order.dispute_respond_by * 1000).toISOString())}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {order.latest_dispute_id ? (
                <div className="min-w-0">
                  <dt className="text-xs text-[#6B7280]">Latest dispute ID</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="min-w-0 break-all font-mono text-xs">
                      {order.latest_dispute_id}
                    </span>
                    <button
                      type="button"
                      aria-label="Copy dispute ID"
                      title="Copy dispute ID"
                      onClick={() => void copyText(order.latest_dispute_id!, "Dispute ID")}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-[#F3F4F6]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="border-t border-[#E5E7EB] px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#6B7280]" />
              <DetailHeading>Status and tracking</DetailHeading>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-medium text-[#4B5563]">
                  Order status
                </span>
                <select
                  value={normalizeOrderStatus(order.status)}
                  onChange={(event) => void onStatusChange(order.id, event.target.value)}
                  className="h-10 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-sm outline-none focus:border-[#111827]"
                >
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {orderStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-medium text-[#4B5563]">Carrier</span>
                <input
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  placeholder="India Post, Delhivery..."
                  className="h-10 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-sm outline-none focus:border-[#111827]"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-medium text-[#4B5563]">
                  Tracking number
                </span>
                <input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="Paste tracking number"
                  className="h-10 w-full rounded-md border border-[#D1D5DB] bg-white px-3 font-mono text-sm outline-none focus:border-[#111827]"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-medium text-[#4B5563]">
                  Tracking URL
                </span>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(event) => setTrackingUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-10 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-sm outline-none focus:border-[#111827]"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!phone}
                onClick={() => void onSendWhatsApp(order, { carrier, trackingNumber, trackingUrl })}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MessageCircle className="h-4 w-4" /> Save and send WhatsApp
              </button>
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D1D5DB] px-4 text-sm font-medium"
                >
                  Open tracking <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </section>

          {order.whatsapp_message ? (
            <section className="border-t border-[#E5E7EB] px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <DetailHeading>WhatsApp order message</DetailHeading>
                <button
                  type="button"
                  onClick={() => void copyText(order.whatsapp_message!, "WhatsApp message")}
                  className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium hover:bg-[#F3F4F6]"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-md bg-[#F7F7F5] p-3 font-sans text-xs leading-5 text-[#4B5563]">
                {order.whatsapp_message}
              </pre>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
