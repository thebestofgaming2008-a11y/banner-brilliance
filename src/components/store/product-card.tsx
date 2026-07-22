import { Heart, Star } from "lucide-react";
import { toast } from "sonner";

import { type StoreProduct } from "@/data/store";
import { useCurrency } from "@/hooks/use-currency";
import { useWishlist } from "@/lib/wishlist";

export function StoreProductCard({
  product,
  priority = false,
  interactive = true,
}: {
  product: StoreProduct;
  priority?: boolean;
  interactive?: boolean;
}) {
  const { formatPrice } = useCurrency();

  return (
    <article className="store-product-card group min-w-0">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F7F7F5]">
        <a
          href={interactive ? `/products/${product.slug}` : undefined}
          aria-label={`View ${product.name}`}
          aria-disabled={!interactive || undefined}
        >
          <img
            src={product.images[0]}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            style={{ objectPosition: product.mediaPosition ?? "center" }}
            className={`h-full w-full ${product.mediaFit === "contain" ? "object-contain p-3" : "object-cover"} transition-transform duration-500 group-hover:scale-[1.018] ${product.imageClassName ?? ""}`}
          />
        </a>
        {product.badge ? (
          <span className="absolute left-2 top-2 bg-white px-2 py-1 text-[9px] font-bold uppercase">
            {product.badge}
          </span>
        ) : null}
        {interactive ? (
          <WishlistButton product={product} />
        ) : (
          <button
            type="button"
            aria-label={`Wishlist preview for ${product.name}`}
            disabled
            className="absolute right-2 top-2 grid h-9 w-9 place-items-center bg-white text-black"
          >
            <Heart size={16} />
          </button>
        )}
      </div>
      <div className="mt-3">
        <p className="section-kicker text-black/45">{product.collection}</p>
        <a
          href={interactive ? `/products/${product.slug}` : undefined}
          className="block"
          aria-disabled={!interactive || undefined}
        >
          <h3 className="mt-1 min-h-8 text-[13px] font-semibold leading-4 md:text-[14px]">
            {product.name}
          </h3>
        </a>
        {product.reviews > 0 ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-black/55">
            <Star size={11} fill="currentColor" />
            <span>{product.rating.toFixed(1)}</span>
            <span>({product.reviews})</span>
          </div>
        ) : null}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[13px] font-semibold">{formatPrice(product.price)}</span>
          {product.compareAt ? (
            <span className="text-[12px] text-black/35 line-through">
              {formatPrice(product.compareAt)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function WishlistButton({ product }: { product: StoreProduct }) {
  const wishlist = useWishlist();
  const isSaved = wishlist.has(product.slug);

  const toggleWishlist = async () => {
    try {
      await wishlist.toggle(product.slug);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your wishlist.");
    }
  };

  return (
    <button
      type="button"
      aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
      aria-pressed={isSaved}
      title={isSaved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={toggleWishlist}
      className="absolute right-2 top-2 grid h-9 w-9 place-items-center bg-white text-black transition-colors hover:bg-black hover:text-white"
    >
      <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
    </button>
  );
}
