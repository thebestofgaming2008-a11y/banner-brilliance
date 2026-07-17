import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import type { Product } from "@/lib/products";
import { useCatalogProducts } from "@/services/productService";
import { toast } from "sonner";

// Legacy export kept so the home page's `products` import continues to work.
export const products: Product[] = [];
export type { Product };

export function ProductRail({
  heading,
  items,
  to,
}: {
  heading?: string;
  items?: Product[];
  to?: string;
}) {
  const { add } = useCart();
  const { format } = useCurrency();
  const { products: liveProducts } = useCatalogProducts();
  const displayItems = items ?? liveProducts;

  return (
    <section className="bg-ivory">
      <div className="mx-auto max-w-7xl px-5 md:px-8 pt-12 md:pt-16">
        {heading && (
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-3xl md:text-4xl text-ink">{heading}</h2>
            {to && (
              <Link
                to={to}
                className="text-[11px] uppercase tracking-[0.22em] text-ink/60 hover:text-ink"
              >
                View all →
              </Link>
            )}
          </div>
        )}
      </div>
      <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        <ul className="flex gap-3 md:gap-5 px-5 md:px-8 pb-12 md:pb-16 max-w-7xl mx-auto">
          {displayItems.map((p) => (
            <li key={p.slug} className="snap-start shrink-0 w-[62vw] sm:w-64 md:w-72">
              <div className="group block">
                <Link to="/products/$slug" params={{ slug: p.slug }} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {p.tag && (
                      <span className="absolute top-3 left-3 bg-ivory/95 text-ink text-[10px] uppercase tracking-[0.22em] px-2 py-1">
                        {p.tag}
                      </span>
                    )}
                    <button
                      aria-label={`Quick add ${p.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        add({
                          id: p.slug,
                          productId: p.id,
                          slug: p.slug,
                          name: p.name,
                          price: p.price,
                          img: p.images[0],
                        });
                        toast.success(`${p.name} added`);
                      }}
                      className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-ivory text-ink shadow-elegant flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition hover:bg-gold"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[13px] uppercase tracking-[0.14em] text-ink truncate">
                    {p.name}
                  </p>
                  <p className="text-sm text-ink/70 shrink-0 ml-2">{format(p.price)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
