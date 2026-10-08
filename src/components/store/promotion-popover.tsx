import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Gift, X } from "lucide-react";
import { toast } from "sonner";

import { useGiftOffers, type GiftOffer } from "@/hooks/use-gift-offers";
import { storefrontImageUrl } from "@/lib/storefront-image";

type FeaturedPromotion = {
  id: string;
  code: string;
  title: string;
  message: string;
  badge: string;
  type: "percent" | "fixed";
  value: number;
  endsAt: string | null;
};

function requirementProgress(offer: GiftOffer) {
  return offer.requirements
    .map((requirement) => {
      const current = Math.min(requirement.current_quantity, requirement.required_quantity);
      if (requirement.scope_type === "subtotal") {
        return `Spend INR ${current.toLocaleString("en-IN")} of INR ${requirement.required_quantity.toLocaleString("en-IN")}`;
      }
      return `${current}/${requirement.required_quantity} ${requirement.label}`;
    })
    .join(offer.match_mode === "all" ? " + " : " or ");
}

function GiftOfferCard({ offer }: { offer: GiftOffer }) {
  return (
    <div className="rounded-[5px] bg-white p-3 text-[#111827] shadow-[0_8px_22px_rgba(80,20,0,0.12)]">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[4px] bg-[#F7F7F5]">
          {offer.gift.image ? (
            <img
              src={storefrontImageUrl(offer.gift.image)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-[#D75631]">
              <Gift className="h-5 w-5" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase text-[#A84624]">
            {offer.earned ? "Free gift added" : `${offer.progress}% complete`}
          </p>
          <p className="product-name mt-0.5 line-clamp-2 text-[13px] leading-4">
            {offer.gift.quantity > 1 ? `${offer.gift.quantity} x ` : ""}
            {offer.gift.name}
          </p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-black/60">
            {offer.earned ? "Added automatically to your order" : requirementProgress(offer)}
          </p>
          {!offer.earned ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10">
              <div
                className="brand-mango-bg h-full rounded-full transition-[width] duration-500"
                style={{ width: `${offer.progress}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PromotionPopover() {
  const [promotion, setPromotion] = useState<FeaturedPromotion | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousEarnedRef = useRef<Set<string> | null>(null);
  const { offers } = useGiftOffers();
  const giftOffers = useMemo(
    () => offers.filter((offer) => offer.gift_available && !offer.blocked_reason).slice(0, 3),
    [offers],
  );
  useEffect(() => {
    const earned = offers.filter((offer) => offer.earned);
    const current = new Set(earned.map((offer) => offer.id));
    if (previousEarnedRef.current === null) {
      previousEarnedRef.current = current;
      return;
    }
    for (const offer of earned) {
      if (!previousEarnedRef.current.has(offer.id)) {
        toast.success(`Free gift unlocked: ${offer.gift.name}`);
      }
    }
    previousEarnedRef.current = current;
  }, [offers]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/promotions/featured", {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: FeaturedPromotion | null) => setPromotion(result))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!promotion?.id) return;
    const key = `fawzaan.offers-seen.${promotion.id}`;
    if (window.sessionStorage.getItem(key)) return;
    let scrollTimer: number | undefined;
    let opened = false;
    const showOffer = () => {
      if (opened) return;
      opened = true;
      window.sessionStorage.setItem(key, "1");
      setOpen(true);
    };
    const onScroll = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (window.scrollY / scrollable < 0.28) return;
      scrollTimer = window.setTimeout(showOffer, 900);
      window.removeEventListener("scroll", onScroll);
    };
    const autoTimer = window.setTimeout(showOffer, 7_000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(autoTimer);
      if (scrollTimer) window.clearTimeout(scrollTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [promotion?.id]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  if (!promotion && !giftOffers.length) return null;

  const offerValue = promotion
    ? promotion.type === "percent"
      ? `${promotion.value}% off`
      : `INR ${promotion.value.toLocaleString("en-IN")} off`
    : null;
  const endsLabel = promotion?.endsAt
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
        new Date(promotion.endsAt),
      )
    : null;
  const dialogLabel = promotion?.title ?? "Free gift offers";
  const onlyPromotion = Boolean(promotion && !giftOffers.length);

  const copyCode = async () => {
    if (!promotion) return;
    try {
      await navigator.clipboard.writeText(promotion.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6">
      {open ? (
        <section
          role="dialog"
          aria-label={dialogLabel}
          className="promotion-popover__panel brand-mango-bg absolute bottom-[60px] right-0 w-[calc(100vw-2rem)] max-w-[350px] overflow-hidden rounded-[6px] border border-white/20 text-white shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-0 pt-5">
            <div>
              <p className="text-[9px] font-bold uppercase text-white/80">
                {promotion?.badge || "Free rewards"}
              </p>
              <p className="mt-1 text-[22px] font-bold leading-none">
                {offerValue || "Gifts & offers"}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close offers"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 pt-4">
            {promotion ? (
              <>
                <h2 className="banner-heading text-[28px] leading-none">{promotion.title}</h2>
                <p className="mt-3 text-[13px] leading-5 text-white/84">{promotion.message}</p>
                {endsLabel ? (
                  <p className="mt-3 text-[10px] font-bold uppercase text-white/65">
                    Ends {endsLabel}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-white px-5 text-[10px] font-bold uppercase text-[#8C2E1C] shadow-[0_8px_22px_rgba(80,20,0,0.12)] transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#E8653D]"
                  aria-live="polite"
                  aria-label={copied ? "Code copied" : `Copy code ${promotion.code}`}
                >
                  {copied ? (
                    <>
                      Code copied <Check className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Copy code {promotion.code} <Copy className="h-4 w-4" />
                    </>
                  )}
                </button>
              </>
            ) : (
              <p className="text-[13px] leading-5 text-white/84">
                Add qualifying products to your cart. Earned gifts are added automatically.
              </p>
            )}

            {giftOffers.length ? (
              <div className={promotion ? "mt-5 border-t border-white/20 pt-4" : "mt-4"}>
                <p className="mb-2 text-[9px] font-bold uppercase text-white/75">
                  {giftOffers.some((offer) => offer.earned)
                    ? "Your earned rewards"
                    : "Free gift progress"}
                </p>
                <div className="grid gap-2">
                  {giftOffers.map((offer) => (
                    <GiftOfferCard key={offer.id} offer={offer} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={
          open
            ? onlyPromotion
              ? "Hide current offer"
              : "Hide gifts and offers"
            : onlyPromotion
              ? "Show current offer"
              : "Show gifts and offers"
        }
        title={promotion?.badge || "Gifts and offers"}
        className="grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-white text-[#D75631] shadow-[0_9px_28px_rgba(0,0,0,0.22)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      >
        {open ? <X className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
      </button>
    </div>
  );
}
