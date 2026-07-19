import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StorePage } from "@/components/store/store-chrome";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/track-order")({
  head: () =>
    seo({
      title: "Track Your Order | Fawzaan Store",
      description: "Check a Fawzaan order securely using the order number and checkout email.",
      path: "/track-order",
      noIndex: true,
    }),
  component: TrackOrderPage,
});

function TrackOrderPage() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");

  return (
    <StorePage>
      <main className="mx-auto max-w-5xl px-[22px] py-12 md:px-8 md:py-20">
        <div className="grid overflow-hidden border border-black/10 md:grid-cols-[1.05fr_0.95fr]">
          <section className="bg-[#f4b400] p-8 md:p-12">
            <p className="section-kicker text-black/55">Order tracking</p>
            <h1 className="section-heading mt-3 text-[46px] leading-[0.95] md:text-[64px]">
              WHERE IS MY ORDER?
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-black/70">
              Enter the order number from your confirmation and the same email address used at
              checkout. No customer account is required.
            </p>
            <div className="mt-9 grid gap-4 text-[12px] sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <div className="flex gap-3 border-t border-black/20 pt-4">
                <ShieldCheck size={19} className="shrink-0" />
                <p>Order details are protected by an email match.</p>
              </div>
              <div className="flex gap-3 border-t border-black/20 pt-4">
                <Truck size={19} className="shrink-0" />
                <p>Carrier tracking appears as soon as your parcel ships.</p>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 md:p-12">
            <div className="flex items-center gap-3">
              <PackageSearch size={22} />
              <h2 className="text-[20px] font-bold uppercase">Find your order</h2>
            </div>
            <form
              className="mt-7 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const cleanOrderNumber = orderNumber.trim().replace(/^order\s*/i, "");
                const cleanEmail = email.trim().toLowerCase();
                if (!cleanOrderNumber) return toast.error("Enter your order number.");
                if (!/^\S+@\S+\.\S+$/.test(cleanEmail))
                  return toast.error("Enter the email used at checkout.");
                await navigate({
                  to: "/order/$id",
                  params: { id: cleanOrderNumber },
                  search: { email: cleanEmail },
                });
              }}
            >
              <label className="block text-[11px] font-bold uppercase text-black/55">
                Order number
                <input
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  autoComplete="off"
                  inputMode="text"
                  placeholder="For example: FZ-12345"
                  className="mt-1 h-12 w-full border border-black/15 px-3 text-sm font-normal normal-case text-black outline-none placeholder:text-black/35 focus:border-black"
                  required
                />
              </label>
              <label className="block text-[11px] font-bold uppercase text-black/55">
                Checkout email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-1 h-12 w-full border border-black/15 px-3 text-sm font-normal normal-case text-black outline-none placeholder:text-black/35 focus:border-black"
                  required
                />
              </label>
              <button className="inline-flex h-12 w-full items-center justify-center gap-2 bg-black text-[11px] font-bold uppercase text-white transition hover:bg-black/80">
                <PackageSearch size={16} /> Track order
              </button>
            </form>
            <p className="mt-6 text-[11px] leading-5 text-black/45">
              You can find your order number in the confirmation shown after payment. If you need
              help, contact support with your checkout email and payment reference.
            </p>
          </section>
        </div>
      </main>
    </StorePage>
  );
}
