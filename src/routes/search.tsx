import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { ProductCard } from "@/components/brand/ProductCard";
import { useCatalogProducts } from "@/services/productService";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — Fawzaan.store" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const { products } = useCatalogProducts();
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      (p.name + " " + p.short + " " + p.collection + " " + p.description)
        .toLowerCase()
        .includes(term),
    );
  }, [products, q]);

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-10 md:py-14">
        <p className="eyebrow text-gold-deep">Find</p>
        <h1 className="mt-1 font-display text-4xl md:text-5xl">Search</h1>

        <div className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try “shemagh”, “niqab”, “sidr honey”…"
            className="w-full border border-ink/15 focus:border-ink outline-none pl-11 pr-4 py-4 bg-cream text-base font-sans-ui"
          />
        </div>

        <p className="mt-4 text-xs text-ink/55">
          {results.length} result{results.length === 1 ? "" : "s"}
        </p>

        {results.length === 0 ? (
          <div className="mt-10 text-center py-16">
            <p className="font-display text-2xl">No results for “{q}”.</p>
            <Link to="/" className="mt-4 inline-block text-sm underline">
              Back home
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {results.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
