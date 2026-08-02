import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Gift, X } from "lucide-react";
import { useGiftOffers } from "@/hooks/use-gift-offers";
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

export function PromotionPopover() {
  const { offers, loading } = useGiftOffers();
  const [promotion, setPromotion] = useState<FeaturedPromotion | null>(null);
  const [promotionLoaded, setPromotionLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/promotions/featured", {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: FeaturedPromotion | null) => setPromotion(result))
      .catch(() => undefined)
      .finally(() => setPromotionLoaded(true));
    return () => controller.abort();
  }, []);

  const contentKey = useMemo(
    () => [promotion?.id, ...offers.map((offer) => offer.id)].filter(Boolean).join("."),
    [offers, promotion?.id],
  );

  useEffect(() => {
    if (!contentKey) return;
    const key = `fawzaan.rewards-seen.${contentKey}`;
    if (window.sessionStorage.getItem(key)) return;
    let scrollTimer: number | undefined;
    let opened = false;
    const showRewards = () => {
      if (opened) return;
      opened = true;
      window.sessionStorage.setItem(key, "1");
      setOpen(true);
    };
    const onScroll = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (window.scrollY / scrollable < 0.28) return;
      scrollTimer = window.setTimeout(showRewards, 900);
      window.removeEventListener("scroll", onScroll);
    };
    const autoTimer = window.setTimeout(showRewards, 7_000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(autoTimer);
      if (scrollTimer) window.clearTimeout(scrollTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [contentKey]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  if ((!promotionLoaded || loading) && !promotion && !offers.length) return null;
  if (!promotion && !offers.length) return null;

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

  const offerValue = promotion
    ? promotion.type === "percent"
      ? `${promotion.value}% off`
      : `INR ${promotion.value.toLocaleString("en-IN")} off`
    : null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6">
      {open ? (
        <section
          role="dialog"
          aria-label="Gifts and offers"
          className="promotion-popover__panel absolute bottom-[62px] right-0 flex max-h-[min(72vh,620px)] w-[calc(100vw-2rem)] max-w-[370px] flex-col overflow-hidden rounded-[6px] border border-black/10 bg-white text-black shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
        >
          <header className="brand-mango-bg flex items-start justify-between gap-4 px-5 py-5 text-white">
            <div>
              <p className="text-[9px] font-bold uppercase text-white/80">Fawzaan rewards</p>
              <h2 className="mt-1 text-[22px] font-bold leading-none">Gifts & offers</h2>
              <p className="mt-2 text-[11px] text-white/80">
                Gifts are added automatically when you qualify.
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close gifts and offers"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="overflow-y-auto p-4 sm:p-5">
            {offers.length ? (
              <div>
                <p className="text-[10px] font-bold uppercase text-black/60">
                  Available gifts ({offers.length})
                </p>
                <div className="mt-3 space-y-3">
                  {offers.map((offer) => (
                    <article key={offer.id} className="rounded-[6px] border border-black/10 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[4px] bg-[#F5F5F2]">
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
                            Free {offer.gift.name}
                          </p>
                          <h3 className="mt-0.5 text-[13px] font-bold leading-4">{offer.name}</h3>
                          <p className="mt-1 text-[10px] text-black/55">
                            {offer.earned
                              ? "Added automatically to your cart"
                              : offer.gift_available
                                ? `${offer.progress}% complete`
                                : "Gift currently unavailable"}
                          </p>
                        </div>
                        {offer.earned ? (
                          <Check className="h-5 w-5 shrink-0 text-[#1E6B45]" aria-label="Earned" />
                        ) : null}
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/8">
                        <div
                          className="brand-mango-bg h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${offer.gift_available ? offer.progress : 0}%` }}
                        />
                      </div>
                      <ul className="mt-2 space-y-1 text-[10px] text-black/65">
                        {offer.requirements.map((requirement, index) => (
                          <li key={`${offer.id}-${index}`} className="flex justify-between gap-3">
                            <span className="min-w-0 truncate">{requirement.label}</span>
                            <span className="shrink-0 font-semibold tabular-nums text-black/75">
                              {Math.min(
                                requirement.current_quantity,
                                requirement.required_quantity,
                              )}{" "}
                              / {requirement.required_quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {promotion ? (
              <article
                className={`${offers.length ? "mt-4" : ""} brand-mango-bg rounded-[6px] p-4 text-white`}
              >
                <p className="text-[9px] font-bold uppercase text-white/75">
                  {promotion.badge || "Current offer"}
                </p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-bold leading-tight">{promotion.title}</h3>
                    <p className="mt-1 text-[12px] text-white/80">{offerValue}</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-white/80">{promotion.message}</p>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-white px-4 text-[10px] font-bold uppercase text-[#8C2E1C] transition hover:bg-white/90"
                  aria-live="polite"
                  aria-label={copied ? "Code copied" : `Copy code ${promotion.code}`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Code copied" : `Copy code ${promotion.code}`}
                </button>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Hide gifts and offers" : "Show gifts and offers"}
        title="Gifts and offers"
        className="grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-white text-[#D75631] shadow-[0_9px_28px_rgba(0,0,0,0.22)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      >
        {open ? <X className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
      </button>
    </div>
  );
}
