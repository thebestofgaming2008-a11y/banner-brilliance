import { useEffect, useState } from "react";
import { BadgePercent, Check, Copy, X } from "lucide-react";

type FeaturedPromotion = {
  id: string;
  code: string;
  title: string;
  message: string;
  badge: string;
  buttonLabel: string;
  buttonUrl: string;
  type: "percent" | "fixed";
  value: number;
  endsAt: string | null;
};

export function PromotionPopover() {
  const [promotion, setPromotion] = useState<FeaturedPromotion | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(key, "1");
      setOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [promotion]);

  useEffect(() => {
    if (!open) return;
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
          className="promotion-popover__panel absolute bottom-[60px] right-0 w-[calc(100vw-2rem)] max-w-[336px] overflow-hidden rounded-[6px] border border-black/10 bg-white text-black shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
        >
          <div className="brand-mango-bg flex min-h-[76px] items-start justify-between gap-4 px-5 py-4 text-white">
            <div>
              <p className="text-[9px] font-bold uppercase text-white/80">
                {promotion.badge || "Current offer"}
              </p>
              <p className="mt-1 text-[22px] font-bold leading-none">{offerValue}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close offer"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5">
            <h2 className="banner-heading text-[28px] leading-none">{promotion.title}</h2>
            <p className="mt-3 text-[13px] leading-5 text-black/62">{promotion.message}</p>
            {endsLabel ? (
              <p className="mt-3 text-[10px] font-bold uppercase text-black/45">Ends {endsLabel}</p>
            ) : null}

            <button
              type="button"
              onClick={() => void copyCode()}
              className="mt-5 flex h-[50px] w-full items-center justify-between rounded-[4px] border border-dashed border-black/25 bg-[#F8F8F6] px-3.5 text-left transition-colors hover:border-black/50"
              aria-label={`Copy promotion code ${promotion.code}`}
            >
              <span>
                <span className="block text-[9px] font-semibold uppercase text-black/45">
                  Checkout code
                </span>
                <span className="mt-0.5 block font-mono text-sm font-bold">{promotion.code}</span>
              </span>
              {copied ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-700">
                  Copied <Check className="h-4 w-4" />
                </span>
              ) : (
                <Copy className="h-4 w-4 text-black/55" />
              )}
            </button>

            <a
              href={promotion.buttonUrl}
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-[4px] bg-[#E8653D] px-5 text-[10px] font-bold uppercase text-white transition-colors hover:bg-[#D75631]"
            >
              {promotion.buttonLabel}
            </a>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Hide current offer" : "Show current offer"}
        title={promotion.badge || "Current offer"}
        className="grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-[#E8653D] text-white shadow-[0_9px_28px_rgba(0,0,0,0.2)] transition-colors hover:bg-[#D75631] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      >
        {open ? <X className="h-5 w-5" /> : <BadgePercent className="h-5 w-5" />}
      </button>
    </div>
  );
}
