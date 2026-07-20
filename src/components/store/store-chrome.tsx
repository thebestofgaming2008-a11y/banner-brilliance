import {
  ChevronRight,
  LayoutDashboard,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import logoGold from "@/assets/fawzaan-logo-gold.png";
import { MangoMenuIcon } from "@/components/store/mango-menu-icon";
import { CurrencySelector } from "@/components/store/currency-selector";
import { useAccount } from "@/lib/account";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/hooks/use-currency";
import { useCatalogPresentation } from "@/services/catalogPresentation";

function ChromeButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center text-[#C85F22] transition-opacity hover:opacity-65"
    >
      {children}
    </button>
  );
}

export function StoreHeader() {
  const [drawer, setDrawer] = useState<"menu" | "cart" | null>(null);
  const { items: cartLines, count, subtotal, setQty, remove } = useCart();
  const { formatPrice } = useCurrency();
  const { isAdmin } = useAccount();
  const { taxonomy } = useCatalogPresentation();
  const collections = taxonomy.filter((item) => item.type === "collection");

  useEffect(() => {
    if (!drawer) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setDrawer(null);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawer]);

  return (
    <>
      <header className="site-header sticky top-0 z-50 bg-white">
        <div className="relative mx-auto flex h-[65px] max-w-[1440px] items-center justify-between px-5 sm:px-6 md:px-8">
          <ChromeButton label="Open menu" onClick={() => setDrawer("menu")}>
            <MangoMenuIcon />
          </ChromeButton>
          <a
            href="/"
            aria-label="Fawzaan home"
            className="absolute left-1/2 top-1/2 h-[42px] w-[100px] -translate-x-1/2 -translate-y-1/2 sm:h-[44px] sm:w-[105px]"
          >
            <img src={logoGold} alt="Fawzaan" className="h-full w-full object-contain" />
          </a>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <a
                href="/admin"
                aria-label="Open admin dashboard"
                title="Admin dashboard"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#F18532]/40 px-2.5 text-[10px] font-bold uppercase text-[#B95720] transition hover:bg-[#FFF1D5] sm:px-3"
              >
                <LayoutDashboard size={15} />
                <span className="hidden sm:inline">Admin</span>
              </a>
            ) : null}
            <ChromeButton label="Open cart" onClick={() => setDrawer("cart")}>
              <span className="relative">
                <ShoppingBag size={23} />
                <span className="brand-mango-bg absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white">
                  {count}
                </span>
              </span>
            </ChromeButton>
          </div>
        </div>
      </header>

      <button
        type="button"
        aria-label="Close drawer"
        onClick={() => setDrawer(null)}
        className={`drawer-scrim fixed inset-0 z-[60] bg-black/45 ${drawer ? "is-open pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        role="dialog"
        aria-modal={drawer === "menu"}
        aria-label="Store menu"
        aria-hidden={drawer !== "menu"}
        inert={drawer !== "menu"}
        className={`store-drawer store-drawer--menu fixed inset-y-0 left-0 z-[70] flex h-[100dvh] w-full max-w-[420px] flex-col bg-white ${drawer === "menu" ? "is-open" : ""}`}
      >
        <div className="drawer-reveal flex h-[65px] items-center justify-between border-b border-black/10 px-6">
          <img src={logoGold} alt="Fawzaan" className="h-9 w-auto" />
          <ChromeButton label="Close menu" onClick={() => setDrawer(null)}>
            <X size={23} />
          </ChromeButton>
        </div>
        <nav
          className="drawer-reveal flex-1 overscroll-contain overflow-y-auto px-5 py-5 sm:px-6 sm:py-7"
          aria-label="Main navigation"
        >
          <form action="/shop" method="get" className="mb-7 border-b border-black/25">
            <label className="flex h-12 items-center gap-3">
              <Search size={18} className="shrink-0 text-black/55" />
              <input
                type="search"
                name="q"
                placeholder="Search products"
                aria-label="Search products"
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
              />
              <button type="submit" className="text-[10px] font-bold uppercase">
                Search
              </button>
            </label>
          </form>
          <p className="section-kicker text-black/45">Shop</p>
          <ul className="mt-5 divide-y divide-black/10">
            {[
              ["Shop all", "/shop"],
              ...collections.map((item) => [
                item.name,
                `/shop?collection=${encodeURIComponent(item.slug)}`,
              ]),
            ].map(([label, href]) => (
              <li key={label} className="drawer-item">
                <a
                  href={href}
                  className="flex items-center justify-between py-3 text-[18px] font-bold uppercase leading-none sm:py-3.5 sm:text-[20px]"
                >
                  {label}
                  <ChevronRight size={18} />
                </a>
              </li>
            ))}
          </ul>
          <p className="section-kicker mt-7 text-black/45">Information</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-[13px] sm:text-[14px]">
            <li>
              <a href="/account">Account</a>
            </li>
            {isAdmin ? (
              <li>
                <a href="/admin" className="inline-flex items-center gap-1.5 font-semibold">
                  <LayoutDashboard size={14} /> Admin dashboard
                </a>
              </li>
            ) : null}
            <li>
              <a href="/wishlist">Wishlist</a>
            </li>
            <li>
              <a href="/track-order">Track order</a>
            </li>
            <li>
              <a href="/search">Search</a>
            </li>
            <li>
              <a href="/pages/shipping">Shipping</a>
            </li>
            <li>
              <a href="/pages/returns">Returns</a>
            </li>
            <li>
              <a href="/pages/contact">Contact</a>
            </li>
          </ul>
        </nav>
        <div className="drawer-reveal drawer-safe-bottom border-t border-black/10 px-5 pt-3 sm:px-6">
          <CurrencySelector />
        </div>
      </aside>

      <aside
        role="dialog"
        aria-modal={drawer === "cart"}
        aria-label="Shopping cart"
        aria-hidden={drawer !== "cart"}
        inert={drawer !== "cart"}
        className={`store-drawer store-drawer--cart fixed inset-y-0 right-0 z-[70] flex h-[100dvh] w-full max-w-[440px] flex-col bg-white ${drawer === "cart" ? "is-open" : ""}`}
      >
        <div className="drawer-reveal flex h-[65px] items-center justify-between border-b border-black/10 px-6">
          <div>
            <p className="text-[17px] font-bold uppercase">Your cart</p>
            <p className="text-[11px] text-black/50">{count} items</p>
          </div>
          <ChromeButton label="Close cart" onClick={() => setDrawer(null)}>
            <X size={23} />
          </ChromeButton>
        </div>
        <div className="drawer-reveal flex-1 overscroll-contain overflow-y-auto px-4 sm:px-5">
          {cartLines.length ? (
            cartLines.map((line) => (
              <div
                key={line.id}
                className="drawer-item grid grid-cols-[76px_1fr] gap-3 border-b border-black/10 py-4 sm:grid-cols-[86px_1fr] sm:gap-4 sm:py-5"
              >
                <a
                  href={`/products/${line.slug ?? line.id.split("__")[0]}`}
                  className="aspect-[3/4] overflow-hidden bg-white"
                >
                  <img src={line.img} alt={line.name} className="h-full w-full object-cover" />
                </a>
                <div className="min-w-0">
                  <p className="section-kicker text-black/45">Fawzaan</p>
                  <a
                    href={`/products/${line.slug ?? line.id.split("__")[0]}`}
                    className="mt-1 block text-[14px] font-semibold leading-4"
                  >
                    {line.name}
                  </a>
                  {line.variant ? (
                    <p className="mt-1 text-[11px] text-black/50">{line.variant}</p>
                  ) : null}
                  <p className="mt-2 text-[13px] font-semibold">{formatPrice(line.price)}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center border border-black/15">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQty(line.id, line.qty - 1)}
                        className="grid h-8 w-8 place-items-center"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="grid h-8 min-w-8 place-items-center text-[12px]">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setQty(line.id, line.qty + 1)}
                        className="grid h-8 w-8 place-items-center"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => remove(line.id)}
                      className="grid h-8 w-8 place-items-center text-black/45"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <ShoppingBag size={28} strokeWidth={1.4} />
              <h2 className="mt-5 text-[22px] font-bold uppercase">Your cart is empty</h2>
              <a
                href="/shop"
                className="brand-mango-bg mt-6 px-6 py-3 text-[11px] font-bold uppercase"
              >
                Start shopping
              </a>
            </div>
          )}
        </div>
        {cartLines.length ? (
          <div className="drawer-reveal drawer-safe-bottom border-t border-black/10 px-4 pt-4 sm:px-5 sm:pt-5">
            <div className="flex justify-between text-[14px] font-bold uppercase">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-2 text-[11px] text-black/50">Shipping calculated at checkout.</p>
            <a
              href="/cart"
              className="brand-mango-bg mt-5 flex h-12 items-center justify-center text-[11px] font-bold uppercase"
            >
              View cart
            </a>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export function StoreFooter() {
  const { taxonomy } = useCatalogPresentation();
  const collections = taxonomy.filter((item) => item.type === "collection");
  return (
    <footer className="border-t-[6px] border-[#F18532] bg-black px-[22px] pb-7 pt-12 text-white md:px-8 md:pt-16">
      <div className="mx-auto grid max-w-[1120px] gap-11 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.65fr] md:gap-12">
        <div>
          <img src={logoGold} alt="Fawzaan" className="h-14 w-auto" />
          <p className="mt-5 max-w-sm text-[13px] leading-5 text-white/60">
            Premium modest essentials selected for faith, heritage, and everyday quality.
          </p>
        </div>
        <div>
          <h3 className="brand-mango-text text-[11px] font-bold uppercase">Shop</h3>
          <ul className="mt-5 space-y-3 text-[13px] text-white/65">
            <li>
              <a href="/shop">Shop all</a>
            </li>
            {collections.map((item) => (
              <li key={item.slug}>
                <a href={`/shop?collection=${encodeURIComponent(item.slug)}`}>{item.name}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="brand-mango-text text-[11px] font-bold uppercase">Support</h3>
          <ul className="mt-5 space-y-3 text-[13px] text-white/65">
            <li>
              <a href="/pages/shipping">Shipping</a>
            </li>
            <li>
              <a href="/pages/returns">Returns</a>
            </li>
            <li>
              <a href="/pages/contact">Contact</a>
            </li>
            <li>
              <a href="/pages/privacy">Privacy</a>
            </li>
            <li>
              <a href="/terms">Terms</a>
            </li>
            <li>
              <a href="/faq">FAQ</a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="brand-mango-text text-[11px] font-bold uppercase">Region</h3>
          <div className="mt-3 border-b border-white/20 pb-1">
            <CurrencySelector dark />
          </div>
          <a href="/account" className="mt-5 block text-[13px] text-white/65">
            Account
          </a>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-[1120px] border-t border-white/15 pt-6 text-[10px] uppercase text-white/40">
        <p>© 2026 Fawzaan. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function StorePage({ children }: { children: ReactNode }) {
  return (
    <main className="store-page min-h-screen bg-white font-sans-ui text-black">
      <StoreHeader />
      {children}
      <StoreFooter />
    </main>
  );
}
