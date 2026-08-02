import { Gift } from "lucide-react";
import { useGiftOffers } from "@/hooks/use-gift-offers";
import { storefrontImageUrl } from "@/lib/storefront-image";
import { cn } from "@/lib/utils";

export function GiftLines({ variant }: { variant: "drawer" | "cart" | "checkout" }) {
  const { offers, earnedGifts } = useGiftOffers();
  const visibleOffers = variant === "checkout" ? earnedGifts : offers;
  if (!visibleOffers.length) return null;
  const hasEarnedGift = earnedGifts.length > 0;

  return (
    <section
      aria-labelledby={`earned-gifts-${variant}`}
      className={cn(
        variant === "drawer" && "border-b border-black/10 py-5",
        variant === "cart" && "border-t border-black/10 pt-6",
        variant === "checkout" && "border-t border-ink/10 pt-5",
      )}
    >
      <h2
        id={`earned-gifts-${variant}`}
        className={cn(
          "flex items-center gap-2 font-bold uppercase",
          variant === "cart" ? "text-[16px]" : "text-[11px]",
        )}
      >
        <Gift className="h-4 w-4 text-[#C94D2B]" aria-hidden="true" />
        {hasEarnedGift
          ? `Free ${earnedGifts.length === 1 ? "gift" : "gifts"} earned`
          : "Your free gift progress"}
      </h2>
      <div className={cn("grid gap-3", variant !== "drawer" && "mt-4")}>
        {visibleOffers.map((offer) => (
          <div
            key={offer.id}
            className={cn(
              "flex items-center gap-3",
              variant === "drawer" && "mt-3 rounded-[4px] bg-[#F7F7F5] p-2",
              variant !== "drawer" && "rounded-[6px] border border-[#E8D9D2] bg-[#FFF9F6] p-3",
            )}
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[4px] bg-white">
              {offer.gift.image ? (
                <img
                  src={storefrontImageUrl(offer.gift.image)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-[#C94D2B]">
                  <Gift className="h-5 w-5" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase text-[#A84624]">
                {offer.earned ? "Free gift" : `${offer.progress}% complete`}
              </p>
              <p className="product-name mt-0.5 line-clamp-2 text-[13px] leading-4">
                {offer.gift.name}
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-black/60">
                {offer.earned
                  ? `Qty ${offer.gift.quantity}${
                      [offer.gift.color, offer.gift.size].filter(Boolean).length
                        ? ` - ${[offer.gift.color, offer.gift.size].filter(Boolean).join(" / ")}`
                        : ""
                    }`
                  : offer.requirements
                      .map(
                        (requirement) =>
                          `${Math.min(requirement.current_quantity, requirement.required_quantity)}/${requirement.required_quantity} ${requirement.label}`,
                      )
                      .join(offer.match_mode === "all" ? " + " : " or ")}
              </p>
              {!offer.earned ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="brand-mango-bg h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${offer.gift_available ? offer.progress : 0}%` }}
                  />
                </div>
              ) : null}
            </div>
            {offer.earned ? (
              <span className="shrink-0 rounded-full bg-[#1E6B45] px-2 py-1 text-[9px] font-bold uppercase text-white">
                Added
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
