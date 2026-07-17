import { ShoppingBag } from "lucide-react";

export function StickyBuy({
  label = "Add to cart",
  price,
  onAdd,
}: {
  label?: string;
  price: string;
  onAdd?: () => void;
}) {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-ivory/95 backdrop-blur px-4 py-3 shadow-elegant">
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-between rounded-full bg-ink text-ivory px-5 py-3.5 text-sm font-semibold shadow-soft active:scale-[0.99] transition"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" /> {label}
        </span>
        <span className="text-gold">{price}</span>
      </button>
    </div>
  );
}
