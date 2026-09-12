import { Gift } from "lucide-react";

import type { StoreProduct } from "@/data/store";
import { useGiftOffers, type GiftOffer } from "@/hooks/use-gift-offers";
import { storefrontImageUrl } from "@/lib/storefront-image";

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchingRequirement(offer: GiftOffer, product: StoreProduct) {
  const collection = normalize(product.collectionSlug ?? product.collection);
  return offer.requirements.find((requirement) => {
    if (requirement.scope_type === "products") {
      return Boolean(product.id && requirement.product_ids.includes(product.id));
    }
    if (requirement.scope_type === "collection") {
      return requirement.collection_slugs.some((slug) => normalize(slug) === collection);
    }
    return false;
  });
}

function productOfferCopy(offer: GiftOffer, product: StoreProduct) {
  const requirement = matchingRequirement(offer, product);
  if (!requirement) return null;
  if (offer.earned) return `Free ${offer.gift.name} unlocked`;
  if (offer.match_mode === "all" && offer.requirements.length > 1) {
    return `This item counts toward a free ${offer.gift.name}`;
  }
  const remaining = Math.max(1, requirement.required_quantity - requirement.current_quantity);
  return remaining === 1
    ? `Add this item to unlock a free ${offer.gift.name}`
    : `Add ${remaining} qualifying items to unlock a free ${offer.gift.name}`;
}

export function ProductGiftCue({
  product,
  variant = "card",
}: {
  product: StoreProduct;
  variant?: "card" | "detail";
}) {
  const { offers } = useGiftOffers();
  const offer = offers.find(
    (candidate) =>
      candidate.gift_available &&
      !candidate.blocked_reason &&
      Boolean(matchingRequirement(candidate, product)),
  );
  if (!offer) return null;

  if (variant === "card") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#A84624]">
        <Gift className="h-3 w-3 shrink-0" aria-hidden="true" />
        Free gift eligible
      </p>
    );
  }

  const copy = productOfferCopy(offer, product);
  return (
    <aside className="mt-6 flex items-center gap-3 rounded-md border border-[#E8D9D2] bg-[#FFF9F6] p-3.5">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-white text-[#C94D2B]">
        {offer.gift.image ? (
          <img
            src={storefrontImageUrl(offer.gift.image)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <Gift className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase text-[#A84624]">
          {offer.earned ? "Gift unlocked" : "Free gift offer"}
        </p>
        <p className="mt-1 text-[12px] font-semibold leading-5 text-black/75">{copy}</p>
      </div>
    </aside>
  );
}
