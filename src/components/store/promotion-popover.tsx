import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
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
    <div className="fixed bottom-5 right-4 z-[70] h-[72px] w-[72px] sm:bottom-7 sm:right-7">
      {open ? (
        <section
          role="dialog"
          aria-label={promotion.title}
          className="absolute bottom-[84px] right-0 w-[calc(100vw-2rem)] max-w-[340px] border border-black/10 bg-white p-5 text-black shadow-[0_18px_55px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C85F22]">
                Limited offer
              </p>
              <h2 className="mt-2 font-display text-[28px] leading-[1.05]">{promotion.title}</h2>
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

          <p className="mt-3 text-[13px] leading-5 text-black/65">{promotion.message}</p>

          <button
            type="button"
            onClick={() => void copyCode()}
            className="mt-4 flex h-12 w-full items-center justify-between border border-dashed border-black/25 bg-[#FFF8ED] px-3.5 text-left transition hover:border-black/45"
            aria-label={`Copy promotion code ${promotion.code}`}
          >
            <span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-black/45">
                Checkout code
              </span>
              <span className="mt-0.5 block font-mono text-sm font-bold tracking-[0.08em]">
                {promotion.code}
              </span>
            </span>
            {copied ? (
              <Check className="h-4 w-4 text-emerald-700" />
            ) : (
              <Copy className="h-4 w-4 text-black/55" />
            )}
          </button>

          <a
            href={promotion.buttonUrl}
            className="mt-3 inline-flex h-11 w-full items-center justify-center bg-black px-5 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#C85F22]"
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
        className="grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-white bg-[#C85F22] px-2 text-center text-[9px] font-bold uppercase leading-[1.15] text-white shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      >
        <span className="max-w-full break-words">{promotion.badge}</span>
      </button>
    </div>
  );
}
