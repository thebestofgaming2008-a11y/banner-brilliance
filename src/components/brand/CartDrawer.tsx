import { X, Plus, Minus, ShoppingBag, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCart, FREE_SHIP_THRESHOLD } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";

export function CartDrawer() {
  const { items, isOpen, close, remove, setQty, subtotal, count } = useCart();
  const { format } = useCurrency();

  const remaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart"
    >
      <button
        aria-label="Close cart"
        onClick={close}
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-ivory text-ink shadow-elegant flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-gold-deep" />
            <h2 className="font-display text-xl">
              Your cart {count > 0 && <span className="text-ink/50 text-sm">({count})</span>}
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="p-2 -mr-2 hover:bg-cream rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free ship progress */}
        <div className="px-5 py-3 bg-cream border-b border-border">
          {remaining > 0 ? (
            <p className="text-xs text-ink/70">
              Add <span className="font-semibold text-ink">{format(remaining)}</span> more for free
              shipping
            </p>
          ) : (
            <p className="text-xs font-semibold text-gold-deep">✦ You've unlocked free shipping</p>
          )}
          <div className="mt-2 h-1.5 rounded-full bg-ivory overflow-hidden">
            <div
              className="h-full bg-gradient-gold transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto h-14 w-14 rounded-full bg-cream flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-gold-deep" />
              </div>
              <p className="mt-4 font-display text-2xl">Your cart is empty</p>
              <p className="mt-1 text-sm text-ink/60">Add a piece to begin.</p>
              <button
                onClick={close}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink text-ivory px-6 py-3 text-sm font-semibold"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-5">
              {items.map((i) => (
                <li key={i.id} className="flex gap-4">
                  <img
                    src={i.img}
                    alt={i.name}
                    className="h-24 w-20 object-cover rounded-sm bg-cream"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{i.name}</p>
                        {i.variant && <p className="text-xs text-ink/55 mt-0.5">{i.variant}</p>}
                      </div>
                      <p className="text-sm font-semibold shrink-0">{format(i.price * i.qty)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-border rounded-full">
                        <button
                          aria-label="Decrease"
                          onClick={() => setQty(i.id, i.qty - 1)}
                          className="p-2 hover:text-gold-deep"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm">{i.qty}</span>
                        <button
                          aria-label="Increase"
                          onClick={() => setQty(i.id, i.qty + 1)}
                          className="p-2 hover:text-gold-deep"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => remove(i.id)}
                        className="text-xs text-ink/55 hover:text-ink underline underline-offset-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4 bg-ivory">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-ink/70">Subtotal</span>
              <span className="font-display text-2xl">{format(subtotal)}</span>
            </div>
            <p className="text-[11px] text-ink/55 mb-3">Shipping & taxes calculated at checkout.</p>
            <Link
              to="/checkout"
              onClick={close}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink text-ivory px-6 py-4 text-sm font-semibold hover:bg-ink/85 shadow-elegant transition"
            >
              <Lock className="h-4 w-4" /> Checkout · {format(subtotal)}
            </Link>
            <Link
              to="/cart"
              onClick={close}
              className="mt-2 w-full inline-flex items-center justify-center text-xs uppercase tracking-[0.22em] text-ink/60 hover:text-ink py-2"
            >
              View full cart
            </Link>
            <div className="mt-3 flex items-center justify-center gap-3 text-[10px] tracking-widest uppercase text-ink/45">
              <span>Visa</span>
              <span>·</span>
              <span>Mastercard</span>
              <span>·</span>
              <span>Amex</span>
              <span>·</span>
              <span>PayPal</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
