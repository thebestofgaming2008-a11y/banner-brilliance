import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { StorePage } from "@/components/store/store-chrome";
import { useCurrency } from "@/hooks/use-currency";
import { useCart } from "@/lib/cart";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/cart")({
  head: () => seo({ title: "Shopping Cart | Fawzaan Store", path: "/cart", noIndex: true }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, setQty, remove } = useCart();
  const { formatPrice } = useCurrency();

  return (
    <StorePage>
      <section className="px-[22px] py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <p className="section-kicker text-black/45">Your selection</p>
          <h1 className="section-heading mt-3 text-[44px] md:text-[64px]">SHOPPING CART</h1>
          {items.length ? (
            <div className="mt-10 grid gap-10 md:grid-cols-[1fr_360px]">
              <div className="divide-y divide-black/10 border-y border-black/10">
                {items.map((line) => {
                  const slug = line.slug ?? line.id.split("__")[0];
                  return (
                    <article
                      key={line.id}
                      className="grid grid-cols-[100px_1fr] gap-4 py-5 md:grid-cols-[130px_1fr_auto]"
                    >
                      <a
                        href={`/products/${slug}`}
                        className="aspect-[3/4] overflow-hidden bg-white"
                      >
                        <img
                          src={line.img}
                          alt={line.name}
                          className="h-full w-full object-cover"
                        />
                      </a>
                      <div>
                        <p className="section-kicker text-black/45">Fawzaan</p>
                        <a
                          href={`/products/${slug}`}
                          className="mt-1 block text-[15px] font-semibold"
                        >
                          {line.name}
                        </a>
                        {line.variant ? (
                          <p className="mt-1 text-[11px] text-black/50">{line.variant}</p>
                        ) : null}
                        <p className="mt-2 text-[13px] font-semibold">{formatPrice(line.price)}</p>
                        <div className="mt-4 flex w-fit items-center border border-black/15">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQty(line.id, line.qty - 1)}
                            className="grid h-9 w-9 place-items-center"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="grid h-9 min-w-9 place-items-center text-[12px]">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setQty(line.id, line.qty + 1)}
                            className="grid h-9 w-9 place-items-center"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="col-start-2 flex items-end justify-between md:col-start-auto md:flex-col md:items-end">
                        <p className="font-bold">{formatPrice(line.price * line.qty)}</p>
                        <button
                          type="button"
                          aria-label={`Remove ${line.name}`}
                          onClick={() => remove(line.id)}
                          className="text-black/40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <aside className="h-fit border border-black/10 p-6 md:sticky md:top-24">
                <h2 className="text-[20px] font-bold uppercase">Order summary</h2>
                <div className="mt-6 space-y-3 border-b border-black/10 pb-5 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-black/55">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55">Shipping</span>
                    <span>Confirmed at checkout</span>
                  </div>
                </div>
                <div className="mt-5 flex justify-between text-[15px] font-bold uppercase">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <a
                  href="/checkout"
                  className="mt-6 flex h-12 w-full items-center justify-center bg-[#f4b400] text-[11px] font-bold uppercase"
                >
                  Proceed to checkout
                </a>
                <a
                  href="/shop"
                  className="mt-3 flex h-11 items-center justify-center border border-black text-[11px] font-bold uppercase"
                >
                  Continue shopping
                </a>
                <p className="mt-4 text-center text-[10px] text-black/45">
                  India shipping is included. International shipping and payment are confirmed
                  through WhatsApp.
                </p>
              </aside>
            </div>
          ) : (
            <div className="py-24 text-center">
              <ShoppingBag size={32} className="mx-auto" strokeWidth={1.4} />
              <h2 className="mt-5 text-[24px] font-bold uppercase">Your cart is empty</h2>
              <a
                href="/shop"
                className="mt-7 inline-flex bg-[#f4b400] px-7 py-3 text-[11px] font-bold uppercase"
              >
                Start shopping
              </a>
            </div>
          )}
        </div>
      </section>
    </StorePage>
  );
}
