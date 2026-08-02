import { useEffect, useRef, useState } from "react";
import { Check, Copy, Gift, X } from "lucide-react";

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
  const [promotion, setPromotion] = useState<FeaturedPromotion | null>(null);
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
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!promotion) return;
    const key = `fawzaan.promotion-seen.${promotion.id}`;
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
  }, [promotion]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  if (!promotion) return null;

  const offerValue =
    promotion.type === "percent"
      ? `${promotion.value}% off`
      : `INR ${promotion.value.toLocaleString("en-IN")} off`;
  const endsLabel = promotion.endsAt
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
        new Date(promotion.endsAt),
      )
    : null;

  const copyCode = async () => {
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
          aria-label={promotion.title}
          className="promotion-popover__panel brand-mango-bg absolute bottom-[60px] right-0 w-[calc(100vw-2rem)] max-w-[336px] overflow-hidden rounded-[6px] border border-white/20 text-white shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-0 pt-5">
            <div>
              <p className="text-[9px] font-bold uppercase text-white/80">
                {promotion.badge || "Current offer"}
              </p>
              <p className="mt-1 text-[22px] font-bold leading-none">{offerValue}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close offer"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 pt-4">
            <h2 className="banner-heading text-[28px] leading-none">{promotion.title}</h2>
            <p className="mt-3 text-[13px] leading-5 text-white/84">{promotion.message}</p>
            {endsLabel ? (
              <p className="mt-3 text-[10px] font-bold uppercase text-white/65">Ends {endsLabel}</p>
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
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Hide current offer" : "Show current offer"}
        title={promotion.badge || "Current offer"}
        className="grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-white text-[#D75631] shadow-[0_9px_28px_rgba(0,0,0,0.22)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      >
        {open ? <X className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
      </button>
    </div>
  );
}
