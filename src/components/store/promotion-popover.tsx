import { useEffect, useState } from "react";
import { BadgePercent, Check, Copy, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function PromotionPopover() {
  const [queryTime] = useState(Date.now);
  const promotion = useQuery(api.promotions.getFeatured, { now: queryTime });
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
          className="promotion-popover__panel absolute bottom-[60px] right-0 w-[calc(100vw-2rem)] max-w-[350px] border border-black/12 border-t-[3px] border-t-[#E8653D] bg-white p-5 text-black shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="section-kicker text-[#E8653D]">{promotion.badge || "Current offer"}</p>
              <p className="mt-2 text-[12px] font-bold uppercase text-black/55">
                {offerValue}
                {endsLabel ? ` · Ends ${endsLabel}` : ""}
              </p>
              <h2 className="banner-heading mt-3 text-[30px] leading-[0.98]">{promotion.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close offer"
              className="grid h-9 w-9 shrink-0 place-items-center text-black/55 transition hover:bg-black/5 hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-[13px] leading-5 text-black/62">{promotion.message}</p>

          <button
            type="button"
            onClick={() => void copyCode()}
            className="mt-5 flex h-[52px] w-full items-center justify-between border border-black/15 bg-[#F7F7F5] px-3.5 text-left transition-colors hover:border-black/40"
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
            className="mt-3 inline-flex h-11 w-full items-center justify-center bg-[#E8653D] px-5 text-[10px] font-bold uppercase text-white transition-colors hover:bg-[#D75631]"
          >
            {promotion.buttonLabel}
          </a>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Hide current offer" : "Show current offer"}
        title={promotion.badge || "Current offer"}
        className="grid h-12 w-12 place-items-center border border-white/80 bg-[#E8653D] text-white shadow-[0_9px_28px_rgba(0,0,0,0.2)] transition-colors hover:bg-[#D75631] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      >
        {open ? <X className="h-5 w-5" /> : <BadgePercent className="h-5 w-5" />}
      </button>
    </div>
  );
}
