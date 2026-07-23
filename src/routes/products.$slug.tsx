import { createFileRoute, notFound } from "@tanstack/react-router";
import { Check, Heart, Minus, Plus, Star } from "lucide-react";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import { StoreProductCard } from "@/components/store/product-card";
import { StorePage } from "@/components/store/store-chrome";
import { toStoreProduct, useStoreProducts } from "@/data/store";
import { useCurrency } from "@/hooks/use-currency";
import { convex } from "@/lib/backend";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import type { Product } from "@/lib/products";
import { getProductBySlug } from "@/services/productService";
import { absoluteUrl, BRAND_NAME, seo } from "@/lib/seo";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }) => {
    const product = await getProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product as Product | undefined;
    if (!product) return seo({ title: "Product | Fawzaan Store", noIndex: true });
    const path = `/products/${encodeURIComponent(product.slug)}`;
    const description = product.short || product.description || `${product.name} from Fawzaan.`;
    const productUrl = absoluteUrl(path);
    return {
      ...seo({
        title: `${product.name} | Fawzaan Store`,
        description,
        path,
        image: product.images[0] || "/og-image-v2.jpg",
        type: "product",
      }),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": `${productUrl}#product`,
            name: product.name,
            description,
            image: product.images.map(absoluteUrl),
            sku: product.id || product.slug,
            category: product.collectionLabel || product.collection,
            brand: { "@type": "Brand", name: BRAND_NAME },
            offers: {
              "@type": "Offer",
              url: productUrl,
              priceCurrency: "INR",
              price: product.price,
              itemCondition: "https://schema.org/NewCondition",
              availability:
                product.inStock === false
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/InStock",
              seller: { "@id": `${absoluteUrl("/")}#store` },
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "INR" },
                shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
                handlingTime: {
                  "@type": "QuantitativeValue",
                  minValue: 1,
                  maxValue: 2,
                  unitCode: "DAY",
                },
              },
              hasMerchantReturnPolicy: {
                "@type": "MerchantReturnPolicy",
                applicableCountry: "IN",
                returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                merchantReturnDays: 30,
                returnPolicyUrl: absoluteUrl("/pages/returns"),
              },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
              { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
            ],
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product: catalogProduct } = Route.useLoaderData() as { product: Product };
  const product = toStoreProduct(catalogProduct);
  const { products } = useStoreProducts();
  const { add, isReady: isCartReady } = useCart();
  const wishlist = useWishlist();
  const { formatPrice } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries((product.optionGroups ?? []).map((group) => [group.name, group.values[0]])),
  );
  const [added, setAdded] = useState(false);
  const wished = wishlist.has(product.slug);

  const related = useMemo(() => {
    const currentTags = new Set(product.filterTags ?? []);
    const candidates = products.filter(
      (item) => item.slug !== product.slug && (!product.id || item.id !== product.id),
    );
    const ranked = candidates
      .map((item) => {
        const sharedTags = (item.filterTags ?? []).filter((tag) => currentTags.has(tag)).length;
        const sameCollection = item.collectionSlug
          ? item.collectionSlug === product.collectionSlug
          : item.collection === product.collection;
        return {
          item,
          score: (sameCollection ? 100 : 0) + sharedTags * 12 + (item.inStock === false ? -50 : 0),
        };
      })
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));

    return ranked.slice(0, 4).map(({ item }) => item);
  }, [
    product.collection,
    product.collectionSlug,
    product.filterTags,
    product.id,
    product.slug,
    products,
  ]);
  const variant = (product.optionGroups ?? [])
    .map((group) => selected[group.name])
    .filter(Boolean)
    .join(" / ");

  const addToCart = () => {
    if (!product.id || product.id === product.slug) {
      toast.error("This product is not connected to the live catalog yet.");
      return;
    }
    if (product.inStock === false) {
      toast.error("This product is currently out of stock.");
      return;
    }
    add({
      id: `${product.slug}__${variant || "default"}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variant,
      price: product.price,
      img: product.images[0] ?? "",
      qty: quantity,
    });
    setAdded(true);
    toast.success(`${product.name} added to cart`);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <StorePage>
      <div className="sticky top-[65px] z-40 border-y border-black/10 bg-white/95 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase">{product.name}</p>
            <p className="text-[11px] text-black/50">{formatPrice(product.price)}</p>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={!isCartReady || product.inStock === false}
            className="brand-mango-bg h-10 shrink-0 px-5 text-[10px] font-bold uppercase disabled:cursor-not-allowed disabled:bg-black/10 disabled:bg-none md:px-8"
          >
            {product.inStock === false ? "Out of stock" : added ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>

      <section className="mx-auto grid max-w-[1280px] gap-8 px-[18px] py-7 md:grid-cols-[1.12fr_0.88fr] md:gap-12 md:px-8 md:py-12">
        <div className="no-scrollbar -mx-[18px] flex snap-x snap-mandatory gap-2 overflow-x-auto px-[18px] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
          {product.images.map((image, index) => (
            <figure
              key={`${image}-${index}`}
              className={`w-[88vw] shrink-0 snap-center overflow-hidden bg-[#F7F7F5] md:w-auto ${index === 0 ? "md:col-span-2" : ""}`}
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={image}
                  alt={`${product.name}, view ${index + 1}`}
                  loading={index === 0 ? "eager" : "lazy"}
                  style={{ objectPosition: product.mediaPosition ?? "center" }}
                  className={`h-full w-full ${product.mediaFit === "contain" ? "object-contain p-4 md:p-7" : "object-cover"} ${product.imageClassName ?? ""}`}
                />
              </div>
            </figure>
          ))}
        </div>

        <div className="md:sticky md:top-[132px] md:self-start">
          <p className="section-kicker text-black/45">{product.collection}</p>
          <h1 className="section-heading mt-3 text-[38px] md:text-[52px]">{product.name}</h1>
          {product.reviews > 0 ? (
            <div className="mt-4 flex items-center gap-2 text-[12px]">
              <Star size={14} fill="currentColor" />
              <span>{product.rating.toFixed(1)}</span>
              <a href="#reviews" className="text-black/50 underline">
                {product.reviews} verified reviews
              </a>
            </div>
          ) : null}
          <div className="mt-5 flex items-center gap-3">
            <span className="text-[20px] font-bold">{formatPrice(product.price)}</span>
            {product.compareAt ? (
              <span className="text-[15px] text-black/35 line-through">
                {formatPrice(product.compareAt)}
              </span>
            ) : null}
          </div>
          <p className="mt-6 text-[14px] leading-6 text-black/65">{product.description}</p>

          {(product.optionGroups ?? []).map((group) => (
            <fieldset className="mt-7" key={group.name}>
              <legend className="text-[11px] font-bold uppercase">
                Select {group.name.toLowerCase()}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelected((current) => ({ ...current, [group.name]: value }))}
                    className={`min-h-10 border px-4 text-[11px] font-semibold ${selected[group.name] === value ? "border-black bg-black text-white" : "border-black/20"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="mt-7 grid grid-cols-[108px_1fr] gap-3">
            <div className="flex h-12 items-center border border-black/20">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="grid h-full w-9 place-items-center"
              >
                <Minus size={14} />
              </button>
              <span className="grid flex-1 place-items-center text-[13px]">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((value) => value + 1)}
                className="grid h-full w-9 place-items-center"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={addToCart}
              disabled={!isCartReady || product.inStock === false}
              className="brand-mango-bg h-12 text-[11px] font-bold uppercase disabled:bg-black/10 disabled:bg-none"
            >
              {product.inStock === false ? "Out of stock" : added ? "Added to cart" : "Add to cart"}
            </button>
          </div>
          <button
            type="button"
            aria-pressed={wished}
            onClick={async () => {
              try {
                await wishlist.toggle(product.slug);
                toast(wished ? "Removed from wishlist" : "Saved to wishlist");
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Could not update your wishlist.",
                );
              }
            }}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 border border-black/20 text-[11px] font-bold uppercase"
          >
            <Heart size={15} fill={wished ? "currentColor" : "none"} />
            {wished ? "Saved to wishlist" : "Save to wishlist"}
          </button>
          {product.details?.length ? (
            <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
              {product.details.map((detail) => (
                <div key={detail} className="flex items-center gap-3 py-3 text-[12px]">
                  <Check size={15} className="text-[#d79f00]" />
                  {detail}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {convex && product.id ? <ProductReviews productId={product.id} /> : null}

      {related.length ? (
        <section
          className="border-t border-black/10 bg-white px-[22px] py-14 md:px-8 md:py-20"
          data-testid="related-products-section"
        >
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-5 h-1 w-16 brand-mango-bg" />
            <h2 className="section-heading text-[34px]">YOU MAY ALSO LIKE</h2>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {related.map((item) => (
                <StoreProductCard key={item.slug} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </StorePage>
  );
}

function ProductReviews({ productId }: { productId: string }) {
  const reviews = useQuery(api.reviews.listPublishedForProduct, { productId });

  return (
    <section id="reviews" className="border-t border-black/10 px-[22px] py-16 md:px-8">
      <div className="mx-auto max-w-[1180px]">
        <p className="section-kicker text-black/45">Verified customer feedback</p>
        <h2 className="section-heading mt-2 text-[34px]">REVIEWS</h2>
        {reviews === undefined ? (
          <p className="mt-8 text-[13px] text-black/50">Loading reviews...</p>
        ) : reviews.length ? (
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {reviews.map((review) => (
              <blockquote key={review.id} className="border border-black/10 p-5">
                <div className="flex gap-1" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, star) => (
                    <Star
                      key={star}
                      size={12}
                      fill={star < review.rating ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                {review.title ? <p className="mt-4 text-[13px] font-bold">{review.title}</p> : null}
                {review.body ? <p className="mt-2 text-[13px] leading-5">{review.body}</p> : null}
                <footer className="mt-4 text-[10px] font-bold uppercase text-black/45">
                  {review.customer_name || "Verified buyer"}
                </footer>
              </blockquote>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-[13px] text-black/50">No published reviews yet.</p>
        )}
      </div>
    </section>
  );
}
