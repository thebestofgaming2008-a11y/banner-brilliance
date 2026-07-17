import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, MapPin, Package, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StorePage } from "@/components/store/store-chrome";
import { useCurrency } from "@/hooks/use-currency";
import { useAccount } from "@/lib/account";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account | Fawzaan" }] }),
  component: AccountPage,
});

function AccountPage() {
  const {
    account,
    isLoading,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    resetPassword,
    setMarketingConsent,
    removeAddress,
  } = useAccount();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <StorePage>
        <div className="mx-auto max-w-5xl px-6 py-24 text-center text-sm text-black/50">
          Loading your account...
        </div>
      </StorePage>
    );
  }
  if (!account)
    return (
      <AuthPanel
        signIn={signIn}
        signUp={signUp}
        requestPasswordReset={requestPasswordReset}
        resetPassword={resetPassword}
      />
    );

  return (
    <StorePage>
      <main className="mx-auto max-w-5xl px-[22px] py-10 md:px-8 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-7">
          <div>
            <p className="section-kicker text-black/45">Your account</p>
            <h1 className="section-heading mt-2 text-[40px] md:text-[56px]">
              {account.firstName ? `WELCOME, ${account.firstName}` : "YOUR ACCOUNT"}
            </h1>
            <p className="mt-2 text-sm text-black/55">{account.email}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              toast("Signed out");
              await navigate({ to: "/" });
            }}
            className="inline-flex h-10 items-center gap-2 border border-black/15 px-4 text-[11px] font-bold uppercase"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>

        <div className="mt-10 grid gap-12 md:grid-cols-[1fr_320px]">
          <section>
            <div className="flex items-center gap-2">
              <Package size={17} />
              <h2 className="text-[20px] font-bold uppercase">Orders</h2>
            </div>
            {account.orders.length ? (
              <div className="mt-5 divide-y divide-black/10 border-y border-black/10">
                {account.orders.map((order) => (
                  <Link
                    key={order.backendId}
                    to="/order/$id"
                    params={{ id: order.id }}
                    search={{ email: account.email }}
                    className="grid grid-cols-[1fr_auto] gap-4 py-5"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold">Order {order.id}</p>
                      <p className="mt-1 text-[11px] text-black/50">
                        {new Date(order.date).toLocaleDateString()} · {order.items.length} item
                        {order.items.length === 1 ? "" : "s"}
                      </p>
                      <div className="mt-3 flex -space-x-2">
                        {order.items
                          .slice(0, 4)
                          .map((item, index) =>
                            item.img ? (
                              <img
                                key={`${item.name}-${index}`}
                                src={item.img}
                                alt=""
                                className="h-10 w-10 border-2 border-white object-cover"
                              />
                            ) : null,
                          )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold">{formatPrice(order.total)}</p>
                      <p className="mt-2 text-[10px] font-bold uppercase text-black/50">
                        {order.status}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-5 border border-black/10 p-6 text-sm text-black/55">
                No orders yet. Paid orders placed with this email will appear here.
              </p>
            )}
          </section>

          <aside>
            <div className="flex items-center gap-2">
              <MapPin size={17} />
              <h2 className="text-[20px] font-bold uppercase">Saved addresses</h2>
            </div>
            {account.addresses.length ? (
              <div className="mt-5 space-y-3">
                {account.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="relative border border-black/10 p-4 pr-11 text-[13px] leading-5"
                  >
                    <p className="font-semibold">
                      {address.name}
                      {address.isDefault ? (
                        <span className="ml-2 text-[9px] uppercase text-[#b98500]">Default</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-black/60">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                      <br />
                      {address.city}
                      {address.state ? `, ${address.state}` : ""} {address.postal}
                      <br />
                      {address.country}
                    </p>
                    <button
                      type="button"
                      aria-label="Remove address"
                      onClick={async () => {
                        await removeAddress(address.id);
                        toast.success("Address removed");
                      }}
                      className="absolute right-3 top-3 grid h-8 w-8 place-items-center text-black/40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 border border-black/10 p-5 text-sm text-black/55">
                You can save an address during checkout.
              </p>
            )}
            <div className="mt-7 space-y-3 border-t border-black/10 pt-5 text-[12px]">
              <Link to="/wishlist" className="block underline underline-offset-4">
                Wishlist
              </Link>
              <a href="/pages/contact" className="block underline underline-offset-4">
                Contact support
              </a>
            </div>
            <div className="mt-7 border-t border-black/10 pt-5">
              <div className="flex items-start gap-3">
                <Mail size={17} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">Offers by email</p>
                  <p className="mt-1 text-[11px] leading-5 text-black/50">
                    Get occasional sales and new collection announcements. Unsubscribe any time.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={account.marketingConsent}
                  aria-label="Email offers"
                  onClick={async () => {
                    try {
                      await setMarketingConsent(!account.marketingConsent);
                      toast.success(
                        account.marketingConsent
                          ? "Email offers turned off"
                          : "Email offers turned on",
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Could not save preference.",
                      );
                    }
                  }}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${account.marketingConsent ? "bg-[#f4b400]" : "bg-black/15"}`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${account.marketingConsent ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </StorePage>
  );
}

function AuthPanel({
  signIn,
  signUp,
  requestPasswordReset,
  resetPassword,
}: {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    first: string,
    last: string,
    marketingConsent?: boolean,
  ) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"in" | "up" | "reset" | "verify">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <StorePage>
      <main className="mx-auto max-w-md px-[22px] py-14 md:py-20">
        <p className="section-kicker text-center text-black/45">Fawzaan account</p>
        <h1 className="section-heading mt-3 text-center text-[42px]">
          {mode === "in"
            ? "SIGN IN"
            : mode === "up"
              ? "CREATE ACCOUNT"
              : mode === "reset"
                ? "RESET PASSWORD"
                : "ENTER RESET CODE"}
        </h1>
        <p className="mt-3 text-center text-sm text-black/55">
          {mode === "in"
            ? "Access your orders, addresses, and wishlist."
            : mode === "up"
              ? "Create an account for faster checkout and order history."
              : mode === "reset"
                ? "We will email a one-time reset code."
                : `Enter the code sent to ${email}.`}
        </p>
        <form
          className="mt-8 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (mode === "in" && password.length < 6) return toast.error("Enter your password.");
            if ((mode === "up" || mode === "verify") && password.length < 8)
              return toast.error("Password must be at least 8 characters.");
            setSubmitting(true);
            try {
              if (mode === "in") await signIn(email, password);
              else if (mode === "up") await signUp(email, password, first, last, marketingConsent);
              else if (mode === "reset") {
                await requestPasswordReset(email);
                setMode("verify");
                toast.success("Reset code sent");
                return;
              } else {
                await resetPassword(email, code, password);
                setMode("in");
                setCode("");
                setPassword("");
                toast.success("Password changed. Sign in with your new password.");
                return;
              }
              toast.success(mode === "in" ? "Signed in" : "Account created");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message.replace(/^\[CONVEX[^\]]*\]\s*/, "")
                  : "Could not continue.",
              );
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {mode === "up" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First name"
                value={first}
                onChange={setFirst}
                autoComplete="given-name"
                required
              />
              <Field
                label="Last name"
                value={last}
                onChange={setLast}
                autoComplete="family-name"
                required
              />
            </div>
          ) : null}
          {mode !== "verify" ? (
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
          ) : null}
          {mode === "verify" ? (
            <Field
              label="Reset code"
              value={code}
              onChange={setCode}
              autoComplete="one-time-code"
              inputMode="numeric"
              required
            />
          ) : null}
          {mode !== "reset" ? (
            <Field
              label={mode === "verify" ? "New password" : "Password"}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              required
            />
          ) : null}
          {mode === "up" ? (
            <label className="flex cursor-pointer items-start gap-3 text-[12px] leading-5 text-black/60">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(event) => setMarketingConsent(event.target.checked)}
                className="mt-1 h-4 w-4 accent-[#f4b400]"
              />
              Email me occasional sales and new collection announcements. Optional and easy to
              unsubscribe.
            </label>
          ) : null}
          <button
            disabled={submitting}
            className="h-12 w-full bg-[#f4b400] text-[11px] font-bold uppercase disabled:opacity-50"
          >
            {submitting
              ? "Please wait..."
              : mode === "in"
                ? "Sign in"
                : mode === "up"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send reset code"
                    : "Change password"}
          </button>
        </form>
        <div className="mt-6 space-y-3 text-center text-[12px]">
          {mode === "in" ? (
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="block w-full underline underline-offset-4"
            >
              Forgot password?
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="block w-full underline underline-offset-4"
          >
            {mode === "in" ? "New here? Create an account" : "Back to sign in"}
          </button>
        </div>
      </main>
    </StorePage>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...props
}: { label: string; value: string; onChange: (value: string) => void; type?: string } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  return (
    <label className="block text-[11px] font-bold uppercase text-black/55">
      {label}
      <input
        {...props}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full border border-black/15 bg-white px-3 text-sm font-normal normal-case text-black outline-none focus:border-black"
      />
    </label>
  );
}
