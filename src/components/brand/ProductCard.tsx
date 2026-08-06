import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import { useCurrency } from "@/lib/currency";
import type { Product } from "@/lib/products";
import { toast } from "sonner";
import { ProductQuickAdd } from "@/components/store/product-quick-add";
import { isPreOrderProduct, toStoreProduct } from "@/data/store";

export function ProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  const { has, toggle } = useWishlist();
  const { format } = useCurrency();
  const wished = has(p.slug);
  const storeProduct = toStoreProduct(p);
  const preOrder = isPreOrderProduct(storeProduct);
  const available = storeProduct.inStock !== false && Number(storeProduct.stockQuantity ?? 1) > 0;

  return (
    <article className="group relative">
      <Link to="/products/$slug" params={{ slug: p.slug }} className="block" aria-label={p.name}>
        <div className="relative aspect-[4/5] overflow-hidden bg-cream">
          <img
            src={p.images[0]}
            alt={p.name}
            loading={priority ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out ${available ? "group-hover:scale-105" : ""}`}
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
          {!available ? (
            <span className="absolute left-3 top-3 rounded-md bg-ink px-2.5 py-1.5 text-[10px] font-bold uppercase text-ivory">
              Sold out
            </span>
          ) : p.tag && !preOrder ? (
            <span className="absolute top-3 left-3 bg-ivory/95 text-ink text-[10px] uppercase tracking-[0.22em] px-2 py-1">
              {p.tag}
            </span>
          ) : null}
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
      <div className="mt-3 md:mt-4">
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
        {available &&
        typeof storeProduct.stockQuantity === "number" &&
        storeProduct.stockQuantity > 0 &&
        storeProduct.stockQuantity <= 3 ? (
          <p className="mt-2 text-[9px] font-bold uppercase text-[#A84624]">
            Only {storeProduct.stockQuantity} left
          </p>
        ) : null}
        <ProductQuickAdd product={storeProduct} />
      </div>
    </article>
  );
}
