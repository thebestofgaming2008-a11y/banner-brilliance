import { ChevronRight, Menu, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import logoGold from "@/assets/fawzaan-logo-gold.png";
import { useCart } from "@/lib/cart";
import { storeCurrencies, type StoreCurrency, useCurrency } from "@/hooks/use-currency";

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
      className="grid h-8 w-8 place-items-center text-[#f4b400] transition-opacity hover:opacity-65"
    >
      {children}
    </button>
  );
}

function CurrencySelect({ dark = false }: { dark?: boolean }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <label
      className={`flex items-center justify-between gap-4 text-[11px] font-bold uppercase ${dark ? "text-white/70" : "text-black/55"}`}
    >
      <span>Currency</span>
      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value as StoreCurrency)}
        aria-label="Select currency"
        className={`min-w-20 border-0 bg-transparent py-2 text-right text-[11px] font-bold outline-none ${dark ? "text-white" : "text-black"}`}
      >
        {storeCurrencies.map((item) => (
          <option key={item} value={item} className="text-black">
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StoreHeader() {
  const [drawer, setDrawer] = useState<"menu" | "cart" | null>(null);
  const { items: cartLines, count, subtotal, setQty, remove } = useCart();
  const { formatPrice } = useCurrency();

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
        <div className="relative mx-auto flex h-[65px] max-w-[1440px] items-center justify-between px-6 md:px-8">
          <ChromeButton label="Open menu" onClick={() => setDrawer("menu")}>
            <Menu size={24} />
          </ChromeButton>
          <a
            href="/"
            aria-label="Fawzaan home"
            className="absolute left-1/2 top-1/2 h-[38px] w-[88px] -translate-x-1/2 -translate-y-1/2"
          >
            <img src={logoGold} alt="Fawzaan" className="h-full w-full object-contain" />
          </a>
          <ChromeButton label="Open cart" onClick={() => setDrawer("cart")}>
            <span className="relative">
              <ShoppingBag size={23} />
              <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#f4b400] px-1 text-[9px] font-bold text-white">
                {count}
              </span>
            </span>
          </ChromeButton>
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
          <p className="section-kicker text-black/45">Shop</p>
          <ul className="mt-5 divide-y divide-black/10">
            {[
              ["Shop all", "/shop"],
              ["Shemaghs", "/shop?collection=Shemaghs"],
              ["Niqabs", "/shop?collection=Niqabs"],
              ["Kufis", "/shop?collection=Kufis"],
              ["Honey", "/shop?collection=Honey"],
              ["Gloves", "/shop?collection=Gloves"],
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
            <li>
              <a href="/wishlist">Wishlist</a>
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
          <CurrencySelect />
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
                className="mt-6 bg-[#f4b400] px-6 py-3 text-[11px] font-bold uppercase"
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
              className="mt-5 flex h-12 items-center justify-center bg-[#f4b400] text-[11px] font-bold uppercase"
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
  return (
    <footer className="border-t-[6px] border-[#f4b400] bg-black px-[22px] pb-7 pt-12 text-white md:px-8 md:pt-16">
      <div className="mx-auto grid max-w-[1120px] gap-11 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.65fr] md:gap-12">
        <div>
          <img src={logoGold} alt="Fawzaan" className="h-14 w-auto" />
          <p className="mt-5 max-w-sm text-[13px] leading-5 text-white/60">
            Premium modest essentials selected for faith, heritage, and everyday quality.
          </p>
        </div>
        <div>
          <h3 className="text-[11px] font-bold uppercase text-[#f4b400]">Shop</h3>
          <ul className="mt-5 space-y-3 text-[13px] text-white/65">
            <li>
              <a href="/shop">Shop all</a>
            </li>
            <li>
              <a href="/shop?collection=Shemaghs">Shemaghs</a>
            </li>
            <li>
              <a href="/shop?collection=Niqabs">Niqabs</a>
            </li>
            <li>
              <a href="/shop?collection=Kufis">Kufis</a>
            </li>
            <li>
              <a href="/shop?collection=Honey">Honey</a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-[11px] font-bold uppercase text-[#f4b400]">Support</h3>
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
          <h3 className="text-[11px] font-bold uppercase text-[#f4b400]">Region</h3>
          <div className="mt-3 border-b border-white/20 pb-1">
            <CurrencySelect dark />
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
