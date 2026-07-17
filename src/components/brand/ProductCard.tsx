import { Link } from "@tanstack/react-router";
import { Plus, Heart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useCurrency } from "@/lib/currency";
import type { Product } from "@/lib/products";
import { toast } from "sonner";

export function ProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const { format } = useCurrency();
  const wished = has(p.slug);

  return (
    <article className="group relative">
      <Link to="/products/$slug" params={{ slug: p.slug }} className="block" aria-label={p.name}>
        <div className="relative aspect-[4/5] overflow-hidden bg-cream">
          <img
            src={p.images[0]}
            alt={p.name}
            loading={priority ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          {p.images[1] && (
            <img
              src={p.images[1]}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
          )}
          {p.tag && (
            <span className="absolute top-3 left-3 bg-ivory/95 text-ink text-[10px] uppercase tracking-[0.22em] px-2 py-1">
              {p.tag}
            </span>
          )}
          {p.compareAt && (
            <span className="absolute top-3 right-3 bg-ink text-ivory text-[10px] uppercase tracking-[0.22em] px-2 py-1">
              -{Math.round((1 - p.price / p.compareAt) * 100)}%
            </span>
          )}
          <button
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wished}
            onClick={(e) => {
              e.preventDefault();
              toggle(p.slug);
              toast(wished ? "Removed from wishlist" : "Added to wishlist");
            }}
            className="absolute top-3 right-3 md:top-auto md:bottom-3 md:right-3 h-9 w-9 rounded-full bg-ivory/90 text-ink flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
            style={p.compareAt ? { top: "auto", bottom: 12 } : undefined}
          >
            <Heart className={`h-4 w-4 ${wished ? "fill-red-600 text-red-600" : ""}`} />
          </button>
        </div>
      </Link>
      <div className="mt-3 md:mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/products/$slug"
            params={{ slug: p.slug }}
            className="text-[13px] uppercase tracking-[0.14em] text-ink block truncate hover:text-gold-deep transition"
          >
            {p.name}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[13px] text-ink/80">{format(p.price)}</p>
            {p.compareAt && (
              <p className="text-[12px] text-ink/40 line-through">{format(p.compareAt)}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            add({
              id: p.slug,
              productId: p.id,
              slug: p.slug,
              name: p.name,
              price: p.price,
              img: p.images[0],
            });
            toast.success(`${p.name} added to cart`);
          }}
          aria-label={`Quick add ${p.name}`}
          className="shrink-0 h-9 w-9 rounded-full border border-ink/15 text-ink flex items-center justify-center hover:bg-ink hover:text-ivory transition"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
