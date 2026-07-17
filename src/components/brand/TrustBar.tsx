import { Truck, ShieldCheck, RotateCcw, Star } from "lucide-react";

const items = [
  { Icon: Truck, label: "Free shipping over $75" },
  { Icon: ShieldCheck, label: "Secure checkout" },
  { Icon: RotateCcw, label: "30-day returns" },
  { Icon: Star, label: "4.9/5 from 2,300+ reviews" },
];

export function TrustBar({ tone = "cream" }: { tone?: "cream" | "ink" }) {
  const dark = tone === "ink";
  return (
    <section
      className={
        dark
          ? "bg-ink text-ivory/80 border-y border-white/10"
          : "bg-cream text-ink/75 border-y border-border"
      }
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs md:text-sm">
            <Icon className={`h-4 w-4 ${dark ? "text-gold" : "text-gold-deep"}`} />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
