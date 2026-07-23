import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { StoreProductCard } from "@/components/store/product-card";
import { StorePage } from "@/components/store/store-chrome";
import { toStoreProduct } from "@/data/store";
import { useWishlist } from "@/lib/wishlist";
import { useCatalogProducts } from "@/services/productService";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/wishlist")({
  head: () => seo({ title: "Wishlist | Fawzaan Store", path: "/wishlist", noIndex: true }),
  component: WishlistPage,
});

function WishlistPage() {
  const { items, isAuthenticated } = useWishlist();
  const { products: catalogProducts } = useCatalogProducts();
  const products = catalogProducts.filter((product) => items.includes(product.slug));

  return (
    <StorePage>
      <main className="mx-auto max-w-[1180px] px-[22px] py-12 md:px-8 md:py-20">
        <p className="section-kicker text-black/45">Saved products</p>
        <h1 className="section-heading mt-2 text-[42px] md:text-[58px]">YOUR WISHLIST</h1>

        {!isAuthenticated ? (
          <div className="mt-12 border-y border-black/10 py-16 text-center">
            <Heart className="mx-auto h-9 w-9" strokeWidth={1.4} />
            <h2 className="mt-5 text-[22px] font-bold uppercase">Sign in to use your wishlist</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/55">
              Saved products are tied to your account so they remain available across devices.
            </p>
            <Link
              to="/account"
              className="brand-mango-bg mt-7 inline-flex h-12 items-center px-7 text-[11px] font-bold uppercase"
            >
              Sign in or create account
            </Link>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-12 border-y border-black/10 py-16 text-center">
            <Heart className="mx-auto h-9 w-9" strokeWidth={1.4} />
            <h2 className="mt-5 text-[22px] font-bold uppercase">Nothing saved yet</h2>
            <p className="mt-2 text-sm text-black/55">
              Use the heart on a product to save it here.
            </p>
            <Link
              to="/shop"
              className="mt-7 inline-flex h-12 items-center bg-black px-7 text-[11px] font-bold uppercase text-white"
            >
              Explore the store
            </Link>
          </div>
        ) : (
          <div className="mt-9 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
            {products.map((product) => (
              <StoreProductCard key={product.slug} product={toStoreProduct(product)} />
            ))}
          </div>
        )}
      </main>
    </StorePage>
  );
}
