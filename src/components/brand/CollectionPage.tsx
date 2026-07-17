import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { ProductCard } from "@/components/brand/ProductCard";
import type { Product } from "@/lib/products";
import { useCatalogProducts } from "@/services/productService";

export type Filter = {
  title: string;
  breadcrumb: string;
  eyebrow?: string;
  where: (p: Product) => boolean;
  hero?: string;
};

export function CollectionPage({ title, breadcrumb, eyebrow, where, hero }: Filter) {
  const { products } = useCatalogProducts();
  const items = useMemo(() => products.filter(where), [products, where]);
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "rating">("featured");

  const sorted = useMemo(() => {
    const arr = [...items];
    if (sort === "price-asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
    else if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    return arr;
  }, [items, sort]);

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <SiteHeader />

      {/* Hero */}
      <section className="relative bg-cream">
        <div className="relative h-[38vh] min-h-[280px] md:h-[46vh]">
          {hero && (
            <img
              src={hero}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ivory/60" />
          <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-end pb-8">
            <nav
              aria-label="Breadcrumb"
              className="text-[11px] uppercase tracking-[0.22em] text-ink/70"
            >
              <Link to="/" className="hover:text-ink">
                Home
              </Link>
              <span className="mx-2">/</span>
              <span className="text-ink">{breadcrumb}</span>
            </nav>
            {eyebrow && <p className="mt-3 eyebrow text-gold-deep">{eyebrow}</p>}
            <h1 className="mt-1 font-display text-4xl md:text-6xl">{title}</h1>
            <p className="mt-2 text-sm text-ink/60">{items.length} products</p>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="sticky top-[57px] md:top-[73px] z-30 bg-ivory/95 backdrop-blur border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <p className="text-[12px] uppercase tracking-[0.18em] text-ink/60">
            {items.length} results
          </p>
          <label className="relative text-[12px] uppercase tracking-[0.18em] text-ink/70">
            <span className="mr-2">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="appearance-none pr-6 border-b border-ink/20 bg-transparent py-1 pl-1 cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="rating">Top rated</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </label>
        </div>
      </div>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12">
        {sorted.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display text-3xl">Coming soon.</p>
            <p className="mt-2 text-ink/60">This collection is being restocked.</p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center bg-ink text-ivory px-6 py-3 text-xs uppercase tracking-[0.22em]"
            >
              Browse other collections
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
            {sorted.map((p, i) => (
              <ProductCard key={p.slug} p={p} priority={i < 4} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
