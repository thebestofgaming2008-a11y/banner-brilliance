import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, Lock, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { useCart } from "@/lib/cart";
import { useAccount, type Address } from "@/lib/account";
import { useCurrency } from "@/lib/currency";
import {
  createBackendWhatsAppOrder,
  createRazorpayOrder,
  getRazorpayCheckoutStatus,
  verifyRazorpayPayment,
} from "@/services/orderService";
import { toast } from "sonner";

type RazorpayFailure = { error?: { description?: string; reason?: string } };
type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};
type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", callback: (response: RazorpayFailure) => void) => void;
};

const PENDING_PAYMENT_KEY = "fawzaan.pendingRazorpayPayment";

type PendingPayment = {
  orderId: string;
  email: string;
};

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout - Fawzaan.store" },
      { name: "description", content: "Secure checkout for Fawzaan Store orders." },
    ],
  }),
  component: CheckoutPage,
});

const REGION_CODES =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRIES = REGION_CODES.map((code) => ({ code, name: regionNames.of(code) ?? code })).sort(
  (a, b) => a.name.localeCompare(b.name),
);
const GEO_COUNTRY = Object.fromEntries(COUNTRIES.map((country) => [country.code, country.name]));
const NO_POSTAL_COUNTRIES = new Set([
  "United Arab Emirates",
  "Qatar",
  "Hong Kong",
  "Macao",
  "Bahamas",
]);

function isIndia(country: string) {
  return country.trim().toLowerCase() === "india";
}

function fullName(first: string, last: string) {
  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined")
      return reject(new Error("Checkout is only available in the browser."));
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load Razorpay checkout.")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
    document.head.appendChild(script);
  });
}

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { account, addAddress, isAuthenticated } = useAccount();
  const { format } = useCurrency();

  const defaultAddress = useMemo(
    () => account?.addresses.find((address) => address.isDefault) ?? account?.addresses[0] ?? null,
    [account],
  );

  const [email, setEmail] = useState(account?.email ?? "");
  const [first, setFirst] = useState(
    account?.firstName ?? defaultAddress?.name.split(" ")[0] ?? "",
  );
  const [last, setLast] = useState(
    account?.lastName ?? defaultAddress?.name.split(" ").slice(1).join(" ") ?? "",
  );
  const [addr1, setAddr1] = useState(defaultAddress?.line1 ?? "");
  const [addr2, setAddr2] = useState(defaultAddress?.line2 ?? "");
  const [city, setCity] = useState(defaultAddress?.city ?? "");
  const [state, setState] = useState(defaultAddress?.state ?? "");
  const [postal, setPostal] = useState(defaultAddress?.postal ?? "");
  const [country, setCountry] = useState(defaultAddress?.country ?? "India");
  const [phone, setPhone] = useState(defaultAddress?.phone ?? "");
  const [processing, setProcessing] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(window.localStorage.getItem(PENDING_PAYMENT_KEY) ?? "null");
    } catch {
      window.localStorage.removeItem(PENDING_PAYMENT_KEY);
      return null;
    }
  });
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    if (defaultAddress) return;
    let cancelled = false;
    fetch("/api/geo")
      .then((response) => response.json())
      .then((geo) => {
        const detected = GEO_COUNTRY[String(geo?.country ?? "").toUpperCase()];
        if (!cancelled && detected) setCountry(detected);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [defaultAddress]);

  const indiaCheckout = isIndia(country);
  const postalRequired = !NO_POSTAL_COUNTRIES.has(country);
  const shippingLabel = indiaCheckout ? "Included" : "Confirmed on WhatsApp";
  const total = subtotal;
  const canPlaceOrder =
    email.includes("@") &&
    first.trim() &&
    last.trim() &&
    addr1.trim() &&
    city.trim() &&
    (!postalRequired || postal.trim()) &&
    (!indiaCheckout || state.trim()) &&
    phone.replace(/\D/g, "").length >= 7 &&
    phone.replace(/\D/g, "").length <= 15;

  const customer = {
    email: email.trim(),
    phone: phone.trim(),
    name: fullName(first, last),
    address_line_1: addr1.trim(),
    address_line_2: addr2.trim() || undefined,
    city: city.trim(),
    state: state.trim() || undefined,
    postal_code: postal.trim(),
    country,
  };

  const rememberAddress = async () => {
    if (!account) return;
    const alreadySaved = account.addresses.some(
      (address) =>
        address.line1.toLowerCase() === customer.address_line_1.toLowerCase() &&
        address.postal.toLowerCase() === (customer.postal_code || "N/A").toLowerCase() &&
        address.country.toLowerCase() === customer.country.toLowerCase(),
    );
    if (alreadySaved) return;
    const address: Omit<Address, "id"> = {
      name: customer.name,
      line1: customer.address_line_1,
      line2: customer.address_line_2,
      city: customer.city,
      state: customer.state || "N/A",
      postal: customer.postal_code || "N/A",
      country: customer.country,
      phone: customer.phone,
      isDefault: true,
    };
    await addAddress(address);
  };

  const finishConfirmedOrder = (orderNumber: string, customerEmail: string) => {
    window.localStorage.removeItem(PENDING_PAYMENT_KEY);
    setPendingPayment(null);
    clear();
    toast.success("Payment captured. Your order is confirmed.");
    window.location.href = isAuthenticated
      ? "/account"
      : `/order/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(customerEmail)}`;
  };

  const checkPendingPayment = async (pending: PendingPayment, attempts = 1) => {
    setCheckingPayment(true);
    try {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (attempt > 0) await wait(2000);
        const status = await getRazorpayCheckoutStatus(pending.orderId, pending.email);
        if (status?.status === "completed" && status.order_number) {
          finishConfirmedOrder(status.order_number, pending.email);
          return true;
        }
        if (status?.status === "failed") {
          window.localStorage.removeItem(PENDING_PAYMENT_KEY);
          setPendingPayment(null);
          toast.error("The payment failed. You can try again safely.");
          return false;
        }
      }
      return false;
    } finally {
      setCheckingPayment(false);
    }
  };

  const placeInternationalOrder = async () => {
    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) whatsappWindow.opener = null;
    const result = await createBackendWhatsAppOrder({ cart: items, customer, total });
    await rememberAddress();
    if (whatsappWindow) whatsappWindow.location.replace(result.whatsappUrl);
    else window.location.href = result.whatsappUrl;
    setProcessing(false);
    toast.success("WhatsApp order message opened.");
  };

  const placeIndiaOrder = async () => {
    await loadRazorpayScript();
    if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable.");
    const order = await createRazorpayOrder({
      cart: items,
      customer,
      subtotal,
      shipping: 0,
      total,
    });
    const razorpay = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "Fawzaan Store",
      description: "Fawzaan Store order",
      order_id: order.order_id,
      prefill: {
        name: customer.name,
        email: customer.email,
        contact: customer.phone,
      },
      notes: {
        country: customer.country,
        city: customer.city,
      },
      theme: { color: "#111111" },
      modal: {
        ondismiss: () => {
          setProcessing(false);
          toast.message("Payment cancelled.");
        },
      },
      handler: async (response: RazorpaySuccess) => {
        const pending = { orderId: response.razorpay_order_id, email: customer.email };
        window.localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(pending));
        setPendingPayment(pending);
        try {
          const savedOrder = await verifyRazorpayPayment({
            payload: order.payload,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
          await rememberAddress();
          const orderNumber = String(
            savedOrder?.order_number ?? savedOrder?.id ?? response.razorpay_order_id,
          );
          finishConfirmedOrder(orderNumber, customer.email);
        } catch (error) {
          setProcessing(false);
          const confirmed = await checkPendingPayment(pending, 5).catch(() => false);
          if (!confirmed) {
            toast.message("Payment received. We are confirming your order. Do not pay again.");
          }
        }
      },
    });
    razorpay.on("payment.failed", (response) => {
      window.localStorage.removeItem(PENDING_PAYMENT_KEY);
      setPendingPayment(null);
      setProcessing(false);
      toast.error(
        response.error?.description ||
          response.error?.reason ||
          "Payment failed. No order was created.",
      );
    });
    razorpay.open();
  };

  const placeOrder = async () => {
    if (!canPlaceOrder) {
      toast.error("Complete the required address details.");
      return;
    }
    setProcessing(true);
    try {
      if (indiaCheckout) await placeIndiaOrder();
      else await placeInternationalOrder();
    } catch (error) {
      setProcessing(false);
      toast.error(error instanceof Error ? error.message : "Checkout could not be completed.");
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-ivory text-ink">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-display text-4xl">Your cart is empty</h1>
          <p className="mt-2 text-ink/60">Add something before you check out.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center bg-ink px-6 py-3 text-xs uppercase tracking-[0.22em] text-ivory"
          >
            Browse the store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-ink/50">Secure checkout</p>
            <h1 className="mt-1 font-display text-3xl md:text-4xl">Delivery details</h1>
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-ink/60">
            <Lock className="h-3 w-3" /> Secure
          </div>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
          <section className="min-w-0">
            {account?.addresses.length ? (
              <div className="mb-6 border border-ink/10 bg-cream p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                  Saved addresses
                </p>
                <div className="mt-3 grid gap-2">
                  {account.addresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => {
                        const [nextFirst, ...rest] = address.name.split(" ");
                        setFirst(nextFirst ?? "");
                        setLast(rest.join(" "));
                        setAddr1(address.line1);
                        setAddr2(address.line2 ?? "");
                        setCity(address.city);
                        setState(address.state ?? "");
                        setPostal(address.postal);
                        setCountry(address.country);
                        setPhone(address.phone ?? "");
                      }}
                      className="flex items-start gap-3 border border-ink/10 bg-ivory p-3 text-left text-sm transition hover:border-ink/30"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
                      <span>
                        <span className="block font-medium">{address.name}</span>
                        <span className="block text-ink/60">
                          {address.line1}, {address.city}, {address.country}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              <Input
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                required
                autoComplete="email"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="First name"
                  value={first}
                  onChange={setFirst}
                  autoComplete="given-name"
                  required
                />
                <Input
                  label="Last name"
                  value={last}
                  onChange={setLast}
                  autoComplete="family-name"
                  required
                />
              </div>
              <Input
                label="Address"
                value={addr1}
                onChange={setAddr1}
                autoComplete="address-line1"
                required
              />
              <Input
                label="Apartment, suite (optional)"
                value={addr2}
                onChange={setAddr2}
                autoComplete="address-line2"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="City"
                  value={city}
                  onChange={setCity}
                  autoComplete="address-level2"
                  required
                />
                <Input
                  label="State / province / region"
                  value={state}
                  onChange={setState}
                  autoComplete="address-level1"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label={postalRequired ? "Postal code" : "Postal code (optional)"}
                  value={postal}
                  onChange={setPostal}
                  autoComplete="postal-code"
                  required={postalRequired}
                />
                <label className="text-[11px] uppercase tracking-[0.18em] text-ink/60">
                  Country<span className="text-red-600"> *</span>
                  <input
                    list="checkout-countries"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className="mt-1 w-full border border-ink/15 bg-ivory px-3 py-2.5 font-sans-ui text-sm text-ink outline-none transition focus:border-ink"
                    autoComplete="country-name"
                    required
                  />
                  <datalist id="checkout-countries">
                    {COUNTRIES.map((option) => (
                      <option key={option.code} value={option.name} label={option.code} />
                    ))}
                  </datalist>
                </label>
              </div>
              <Input
                label="WhatsApp / phone"
                value={phone}
                onChange={setPhone}
                type="tel"
                autoComplete="tel"
                required
              />
            </div>

            <div className="mt-6 border border-ink/10 bg-cream p-4">
              <div className="flex items-start gap-3">
                {indiaCheckout ? (
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-gold-deep" />
                ) : (
                  <MessageCircle className="mt-0.5 h-5 w-5 text-gold-deep" />
                )}
                <div>
                  <h2 className="font-display text-xl">
                    {indiaCheckout ? "India checkout" : "International checkout"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-ink/65">
                    {indiaCheckout
                      ? "Shipping is included. Place order opens Razorpay for UPI, cards, wallets, and netbanking."
                      : "Place order opens WhatsApp with your order details. We will confirm shipping and payment manually."}
                  </p>
                </div>
              </div>
            </div>

            {pendingPayment ? (
              <div className="mt-4 border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Your payment is being confirmed</p>
                    <p className="mt-1 text-sm leading-6 text-amber-900/80">
                      Do not pay again. Razorpay and our server are checking this payment, even if
                      the payment window or browser was closed.
                    </p>
                    <button
                      type="button"
                      onClick={() => void checkPendingPayment(pendingPayment)}
                      disabled={checkingPayment}
                      className="mt-3 border border-amber-400 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-60"
                    >
                      {checkingPayment ? "Checking..." : "Check order status"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={placeOrder}
              disabled={processing || Boolean(pendingPayment)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-ink px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-ivory transition hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? (
                "Processing..."
              ) : indiaCheckout ? (
                <>
                  <Lock className="h-4 w-4" /> Pay with Razorpay - {format(total)}
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" /> Open WhatsApp order
                </>
              )}
            </button>
          </section>

          <aside className="h-fit bg-cream p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-xl">Order summary</h2>
            <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <div className="relative shrink-0">
                    <img src={item.img} alt="" className="h-14 w-12 bg-ivory object-cover" />
                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[10px] text-ivory">
                      {item.qty}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{item.name}</p>
                    {item.variant ? (
                      <p className="text-[11px] uppercase tracking-widest text-ink/55">
                        {item.variant}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0">{format(item.price * item.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-ink/15 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink/70">Product subtotal</dt>
                <dd>{format(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/70">Shipping</dt>
                <dd>{shippingLabel}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-ink/15 pt-4">
              <span className="text-sm uppercase tracking-[0.18em] text-ink/70">
                {indiaCheckout ? "Total" : "Subtotal"}
              </span>
              <span className="font-display text-2xl">{format(total)}</span>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block text-[11px] uppercase tracking-[0.18em] text-ink/60">
      {label}
      {required ? <span className="text-red-600"> *</span> : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="mt-1 w-full border border-ink/15 bg-ivory px-3 py-2.5 font-sans-ui text-sm text-ink outline-none transition focus:border-ink"
      />
    </label>
  );
}
