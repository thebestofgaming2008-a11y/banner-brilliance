import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, LayoutDashboard, LogOut, MapPin, Package, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StorePage } from "@/components/store/store-chrome";
import { useCurrency } from "@/hooks/use-currency";
import { useAccount, type Address } from "@/lib/account";
import { countryUsesPostalCode } from "@/lib/countries";
import { CountrySelector } from "@/components/store/country-selector";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/account")({
  head: () => seo({ title: "Account | Fawzaan Store", path: "/account", noIndex: true }),
  component: AccountPage,
});

function AccountPage() {
  const {
    account,
    isAdmin,
    isLoading,
    signIn,
    signUp,
    signOut,
    addAddress,
    removeAddress,
    setDefaultAddress,
  } = useAccount();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [addingAddress, setAddingAddress] = useState(false);

  if (isLoading) {
    return (
      <StorePage>
        <div className="mx-auto max-w-5xl px-6 py-24 text-center text-sm text-black/50">
          Loading your account...
        </div>
      </StorePage>
    );
  }
  if (!account) return <AuthPanel signIn={signIn} signUp={signUp} />;

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
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <Link
                to="/admin"
                className="brand-mango-bg inline-flex h-10 items-center gap-2 px-4 text-[11px] font-bold uppercase"
              >
                <LayoutDashboard size={15} /> Admin dashboard
              </Link>
            ) : null}
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin size={17} />
                <h2 className="text-[20px] font-bold uppercase">Saved addresses</h2>
              </div>
              {account.addresses.length < 10 ? (
                <button
                  type="button"
                  onClick={() => setAddingAddress((open) => !open)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-black/15 px-3 text-[10px] font-bold uppercase"
                  aria-expanded={addingAddress}
                >
                  {addingAddress ? <X size={14} /> : <Plus size={14} />}
                  {addingAddress ? "Cancel" : "Add"}
                </button>
              ) : null}
            </div>
            {addingAddress ? (
              <AddressForm
                makeDefault={account.addresses.length === 0}
                onCancel={() => setAddingAddress(false)}
                onSave={async (address) => {
                  await addAddress(address);
                  setAddingAddress(false);
                }}
              />
            ) : null}
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
                      {address.state && address.state !== "N/A" ? `, ${address.state}` : ""}
                      {address.postal && address.postal !== "N/A" ? ` ${address.postal}` : ""}
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
                    {!address.isDefault ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await setDefaultAddress(address.id);
                            toast.success("Default address updated");
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Could not update the default address.",
                            );
                          }
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase underline underline-offset-4"
                      >
                        <Check size={12} /> Make default
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 border border-black/10 p-5 text-sm text-black/55">
                Add an address here for a faster checkout.
              </p>
            )}
            {account.addresses.length >= 10 ? (
              <p className="mt-3 text-[11px] text-black/50">
                You have reached the limit of 10 saved addresses.
              </p>
            ) : null}
            <div className="mt-7 space-y-3 border-t border-black/10 pt-5 text-[12px]">
              <Link to="/wishlist" className="block underline underline-offset-4">
                Wishlist
              </Link>
              <a href="/pages/contact" className="block underline underline-offset-4">
                Contact support
              </a>
            </div>
          </aside>
        </div>
      </main>
    </StorePage>
  );
}

function AddressForm({
  makeDefault,
  onCancel,
  onSave,
}: {
  makeDefault: boolean;
  onCancel: () => void;
  onSave: (address: Omit<Address, "id">) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("India");
  const [isDefault, setIsDefault] = useState(makeDefault);
  const [saving, setSaving] = useState(false);
  const postalRequired = countryUsesPostalCode(country);

  return (
    <form
      className="mt-5 space-y-3 border border-black/10 bg-black/[0.025] p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const phoneDigits = phone.replace(/\D/g, "");
        if (phoneDigits.length < 7 || phoneDigits.length > 15) {
          toast.error("Enter a valid phone number.");
          return;
        }
        setSaving(true);
        try {
          await onSave({
            name: name.trim(),
            phone: phone.trim(),
            line1: line1.trim(),
            line2: line2.trim() || undefined,
            city: city.trim(),
            state: state.trim() || "N/A",
            postal: postal.trim() || "N/A",
            country,
            isDefault,
          });
          toast.success("Address saved");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not save the address.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="text-[12px] font-bold uppercase">Add a delivery address</p>
      <Field label="Full name" value={name} onChange={setName} autoComplete="name" required />
      <Field
        label="Phone"
        type="tel"
        value={phone}
        onChange={setPhone}
        autoComplete="tel"
        required
      />
      <Field
        label="Address"
        value={line1}
        onChange={setLine1}
        autoComplete="address-line1"
        required
      />
      <Field
        label="Apartment, suite (optional)"
        value={line2}
        onChange={setLine2}
        autoComplete="address-line2"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="City"
          value={city}
          onChange={setCity}
          autoComplete="address-level2"
          required
        />
        <Field
          label="State / region"
          value={state}
          onChange={setState}
          autoComplete="address-level1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={postalRequired ? "Postal code" : "Postal (optional)"}
          value={postal}
          onChange={setPostal}
          autoComplete="postal-code"
          required={postalRequired}
        />
        <CountrySelector value={country} onChange={setCountry} required />
      </div>
      <label className="flex items-center gap-2 text-[11px] text-black/65">
        <input
          type="checkbox"
          checked={isDefault}
          disabled={makeDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
          className="h-4 w-4 accent-[#F18532]"
        />
        Use as my default delivery address
      </label>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="brand-mango-bg h-10 flex-1 text-[10px] font-bold uppercase disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save address"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 border border-black/15 px-4 text-[10px] font-bold uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AuthPanel({
  signIn,
  signUp,
}: {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    first: string,
    last: string,
    marketingConsent?: boolean,
  ) => Promise<void>;
}) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <StorePage>
      <main className="mx-auto max-w-md px-[22px] py-14 md:py-20">
        <p className="section-kicker text-center text-black/45">Fawzaan account</p>
        <h1 className="section-heading mt-3 text-center text-[42px]">
          {mode === "in" ? "SIGN IN" : "CREATE ACCOUNT"}
        </h1>
        <p className="mt-3 text-center text-sm text-black/55">
          {mode === "in"
            ? "Access your orders, addresses, and wishlist."
            : "Create an account for faster checkout and order history."}
        </p>
        <form
          className="mt-8 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (mode === "in" && password.length < 6) return toast.error("Enter your password.");
            if (mode === "up" && password.length < 8)
              return toast.error("Password must be at least 8 characters.");
            setSubmitting(true);
            try {
              if (mode === "in") await signIn(email, password);
              else await signUp(email, password, first, last);
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
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            required
          />
          <button
            disabled={submitting}
            className="brand-mango-bg h-12 w-full text-[11px] font-bold uppercase disabled:opacity-50"
          >
            {submitting ? "Please wait..." : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="mt-6 space-y-3 text-center text-[12px]">
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
