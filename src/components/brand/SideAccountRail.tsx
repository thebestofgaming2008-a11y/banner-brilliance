import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { User, Heart, Package, LogOut, X } from "lucide-react";
import { useAccount } from "@/lib/account";
import { useWishlist } from "@/lib/wishlist";

/**
 * Fixed vertical rail on the right edge of the screen — quick access to
 * account & wishlist, kept out of the sticky header per brand direction.
 */
export function SideAccountRail() {
  const [open, setOpen] = useState(false);
  const { account, signOut } = useAccount();
  const { count: wishCount } = useWishlist();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="fixed right-0 top-1/2 -translate-y-1/2 z-30 hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        aria-expanded={open}
        className="group flex flex-col items-center gap-2 bg-ink text-ivory pl-2 pr-2.5 py-4 rounded-l-md shadow-elegant hover:bg-gold-deep transition-all hover:pr-4"
      >
        <User className="h-4 w-4" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-[0.28em]">
          {account ? "Account" : "Sign in"}
        </span>
        {wishCount > 0 && (
          <span className="absolute -left-1.5 -top-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-ink text-[10px] font-bold flex items-center justify-center">
            {wishCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-72 bg-ivory text-ink shadow-elegant border border-border rounded-sm overflow-hidden animate-scale-in origin-right">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/60">
            <p className="text-[10px] uppercase tracking-[0.22em] text-ink/50">
              {account ? "Signed in" : "Welcome"}
            </p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="p-1 -mr-1 hover:text-gold-deep"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-3">
            {account ? (
              <>
                <p className="font-display text-lg leading-tight">
                  {account.firstName || account.email}
                </p>
                <p className="text-xs text-ink/55 truncate">{account.email}</p>
                <div className="mt-3 grid gap-0.5">
                  <Link
                    to="/account"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm hover:text-gold-deep transition"
                  >
                    <User className="h-4 w-4" /> My account
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm hover:text-gold-deep transition"
                  >
                    <Package className="h-4 w-4" /> Orders
                  </Link>
                  <Link
                    to="/wishlist"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm hover:text-gold-deep transition"
                  >
                    <Heart className="h-4 w-4" /> Wishlist ({wishCount})
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 py-2 text-sm text-ink/70 hover:text-ink transition"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-display text-lg leading-tight">Welcome back</p>
                <p className="text-xs text-ink/60">Sign in for a faster checkout.</p>
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-ink text-ivory px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] hover:bg-gold-deep transition"
                >
                  Sign in
                </Link>
                <Link
                  to="/wishlist"
                  onClick={() => setOpen(false)}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-widest border-b border-ink/10 hover:text-gold-deep transition"
                >
                  <Heart className="h-3.5 w-3.5" /> Wishlist ({wishCount})
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
