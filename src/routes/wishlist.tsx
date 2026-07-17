import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { ProductCard } from "@/components/brand/ProductCard";
import { useWishlist } from "@/lib/wishlist";
import { useCatalogProducts } from "@/services/productService";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — Fawzaan.store" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { items } = useWishlist();
  const { products: catalogProducts } = useCatalogProducts();
  const products = catalogProducts.filter((p) => items.includes(p.slug));

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 md:py-14">
        <p className="eyebrow text-gold-deep">Saved</p>
        <h1 className="mt-1 font-display text-4xl md:text-5xl">Your wishlist</h1>

        {products.length === 0 ? (
          <div className="mt-16 text-center py-20 border-y border-ink/10">
            <Heart className="mx-auto h-10 w-10 text-gold-deep" />
            <p className="mt-4 font-display text-3xl">Nothing saved yet.</p>
            <p className="mt-2 text-ink/60">Tap the heart on any product to save it here.</p>
            <Link
              to="/"
              className="mt-8 inline-flex items-center bg-ink text-ivory px-6 py-3 text-xs uppercase tracking-[0.22em]"
            >
              Explore the store
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
            {products.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
