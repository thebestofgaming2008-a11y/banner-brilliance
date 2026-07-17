import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Package, Star, Truck } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import { StorePage } from "@/components/store/store-chrome";
import { useCurrency } from "@/hooks/use-currency";
import { convex } from "@/lib/backend";

type OrderSearch = { email?: string };

type TrackedItem = {
  id: string;
  product_id?: string;
  product_name?: string;
  product_image_url?: string;
  selected_color?: string | null;
  selected_size?: string | null;
  quantity?: number;
  subtotal?: number;
};

type TrackedAddress = {
  full_name?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

type TrackedOrder = {
  order_number: string;
  created_at?: string;
  status?: string;
  payment_status?: string;
  total_inr?: number;
  total?: number;
  shipping_address?: TrackedAddress;
  items?: TrackedItem[];
  tracking_number?: string;
  tracking_carrier?: string;
  carrier?: string;
  tracking_url?: string;
};

export const Route = createFileRoute("/order/$id")({
  validateSearch: (search: Record<string, unknown>): OrderSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () => ({ meta: [{ title: "Track order | Fawzaan" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { email } = Route.useSearch();
  if (!convex)
    return (
      <StorePage>
        <StateMessage title="Tracking unavailable" copy="The order service is not configured." />
      </StorePage>
    );
  return <OrderLookup orderNumber={id} email={email ?? ""} />;
}

function OrderLookup({ orderNumber, email }: { orderNumber: string; email: string }) {
  const [lookupEmail, setLookupEmail] = useState(email);
  const order = useQuery(api.orders.getByNumber, email ? { orderNumber, email } : "skip");
  const { formatPrice } = useCurrency();

  if (!email) {
    return (
      <StorePage>
        <main className="mx-auto max-w-md px-[22px] py-20 text-center">
          <p className="section-kicker text-black/45">Secure order lookup</p>
          <h1 className="section-heading mt-3 text-[42px]">TRACK {orderNumber}</h1>
          <p className="mt-4 text-sm text-black/55">Enter the email used at checkout.</p>
          <form
            className="mt-7"
            onSubmit={(event) => {
              event.preventDefault();
              window.location.href = `/order/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(lookupEmail.trim())}`;
            }}
          >
            <input
              type="email"
              required
              value={lookupEmail}
              onChange={(event) => setLookupEmail(event.target.value)}
              autoComplete="email"
              className="h-12 w-full border border-black/15 px-3 text-sm outline-none focus:border-black"
              placeholder="Email address"
            />
            <button className="mt-3 h-12 w-full bg-[#f4b400] text-[11px] font-bold uppercase">
              View order
            </button>
          </form>
        </main>
      </StorePage>
    );
  }
  if (order === undefined)
    return (
      <StorePage>
        <StateMessage title="Loading order" copy="Checking your order details..." />
      </StorePage>
    );
  if (!order)
    return (
      <StorePage>
        <StateMessage
          title="Order not found"
          copy="Check the order number and email, then try again."
        />
      </StorePage>
    );

  const trackedOrder = order as unknown as TrackedOrder;
  const address = trackedOrder.shipping_address ?? {};
  const paid =
    trackedOrder.payment_status === "paid" || trackedOrder.payment_status === "MOCKED_PAID";
  return (
    <StorePage>
      <main className="mx-auto max-w-4xl px-[22px] py-10 md:px-8 md:py-16">
        <div className="border-b border-black/10 pb-7">
          <p className="section-kicker text-black/45">Order status</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className="section-heading text-[42px] md:text-[58px]">
              ORDER {trackedOrder.order_number}
            </h1>
            <span className="bg-[#f4b400] px-3 py-2 text-[10px] font-bold uppercase">
              {trackedOrder.status ?? "Processing"}
            </span>
          </div>
          <p className="mt-2 text-sm text-black/50">
            Placed{" "}
            {trackedOrder.created_at
              ? new Date(trackedOrder.created_at).toLocaleString()
              : "recently"}
          </p>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
          <section>
            <h2 className="text-[18px] font-bold uppercase">Items</h2>
            <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
              {(trackedOrder.items ?? []).map((item) => (
                <article key={item.id} className="grid grid-cols-[76px_1fr_auto] gap-3 py-4">
                  {item.product_image_url ? (
                    <img
                      src={item.product_image_url}
                      alt=""
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-[3/4] bg-black/5" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">{item.product_name}</p>
                    <p className="mt-1 text-[11px] text-black/50">
                      {[item.selected_color, item.selected_size].filter(Boolean).join(" / ") ||
                        "Standard"}{" "}
                      · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(Number(item.subtotal ?? 0))}</p>
                </article>
              ))}
            </div>
            {paid ? <ReviewOrderItems order={trackedOrder} email={email} /> : null}
          </section>

          <aside className="space-y-5">
            <div className="border border-black/10 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <h2 className="text-[14px] font-bold uppercase">Payment</h2>
              </div>
              <p className="mt-3 text-sm capitalize text-black/60">
                {trackedOrder.payment_status ?? "Pending"}
              </p>
              <p className="mt-1 text-lg font-bold">
                {formatPrice(Number(trackedOrder.total_inr ?? trackedOrder.total ?? 0))}
              </p>
            </div>
            <div className="border border-black/10 p-5">
              <div className="flex items-center gap-2">
                <Package size={16} />
                <h2 className="text-[14px] font-bold uppercase">Delivery address</h2>
              </div>
              <p className="mt-3 text-[13px] leading-5 text-black/60">
                {address.full_name}
                <br />
                {address.address_line_1}
                {address.address_line_2 ? `, ${address.address_line_2}` : ""}
                <br />
                {address.city}
                {address.state ? `, ${address.state}` : ""} {address.postal_code}
                <br />
                {address.country}
              </p>
            </div>
            {trackedOrder.tracking_number ? (
              <div className="border border-black/10 p-5">
                <div className="flex items-center gap-2">
                  <Truck size={16} />
                  <h2 className="text-[14px] font-bold uppercase">Tracking</h2>
                </div>
                <p className="mt-3 text-sm font-semibold">
                  {trackedOrder.tracking_carrier || trackedOrder.carrier || "Carrier"}
                </p>
                <p className="mt-1 text-[12px] text-black/60">{trackedOrder.tracking_number}</p>
                {trackedOrder.tracking_url ? (
                  <a
                    href={trackedOrder.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-[11px] font-bold uppercase underline"
                  >
                    Track parcel
                  </a>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </main>
    </StorePage>
  );
}

function ReviewOrderItems({ order, email }: { order: TrackedOrder; email: string }) {
  const submitReview = useMutation(api.reviews.submitForOrder);
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const reviewable = (order.items ?? []).filter((item) => item.product_id);
  if (!reviewable.length) return null;

  return (
    <div className="mt-10">
      <h2 className="text-[18px] font-bold uppercase">Review your purchase</h2>
      <div className="mt-4 space-y-3">
        {reviewable.map((item) => (
          <div key={item.id} className="border border-black/10 p-4">
            <button
              type="button"
              onClick={() =>
                setOpenProduct(openProduct === item.product_id ? null : item.product_id)
              }
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold"
            >
              <span>{item.product_name}</span>
              <span className="text-[10px] uppercase underline">Write review</span>
            </button>
            {openProduct === item.product_id ? (
              <form
                className="mt-5 space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    await submitReview({
                      orderNumber: order.order_number,
                      email,
                      productId: item.product_id,
                      rating,
                      title: title || null,
                      body: body || null,
                    });
                    toast.success("Review submitted for approval");
                    setOpenProduct(null);
                    setTitle("");
                    setBody("");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Could not submit review.",
                    );
                  }
                }}
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-label={`${value} stars`}
                      onClick={() => setRating(value)}
                    >
                      <Star size={20} fill={value <= rating ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder="Review title (optional)"
                  className="h-11 w-full border border-black/15 px-3 text-sm outline-none"
                />
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={1600}
                  required
                  placeholder="Tell us about the product"
                  className="min-h-28 w-full border border-black/15 p-3 text-sm outline-none"
                />
                <button className="h-11 bg-black px-5 text-[10px] font-bold uppercase text-white">
                  Submit review
                </button>
              </form>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function StateMessage({ title, copy }: { title: string; copy: string }) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="section-heading text-[40px]">{title}</h1>
      <p className="mt-3 text-sm text-black/55">{copy}</p>
      <a
        href="/shop"
        className="mt-7 inline-flex bg-[#f4b400] px-6 py-3 text-[11px] font-bold uppercase"
      >
        Back to shop
      </a>
    </main>
  );
}
