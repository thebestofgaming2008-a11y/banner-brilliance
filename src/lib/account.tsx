import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { api } from "../../convex/_generated/api";
import { convex } from "@/lib/backend";

export type Address = {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
};

export type OrderItem = {
  name: string;
  variant?: string;
  qty: number;
  price: number;
  img: string;
  productId?: string;
};

export type Order = {
  id: string;
  backendId: string;
  date: string;
  status: string;
  paymentStatus?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  items: OrderItem[];
  total: number;
  address: Address;
};

export type Account = {
  email: string;
  firstName: string;
  lastName: string;
  marketingConsent: boolean;
  addresses: Address[];
  orders: Order[];
};

type ContextValue = {
  account: Account | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    marketingConsent?: boolean,
  ) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  setMarketingConsent: (consent: boolean) => Promise<void>;
  addAddress: (address: Omit<Address, "id">) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
};

const AccountContext = createContext<ContextValue | null>(null);
const PENDING_PROFILE_KEY = "fawzaan.pendingProfile";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function mapAddress(value: unknown): Address {
  const row = asRecord(value);
  return {
    id: String(row.id),
    name: String(row.full_name ?? ""),
    line1: String(row.address_line_1 ?? ""),
    line2: typeof row.address_line_2 === "string" ? row.address_line_2 : undefined,
    city: String(row.city ?? ""),
    state: typeof row.state === "string" ? row.state : undefined,
    postal: String(row.postal_code ?? ""),
    country: String(row.country ?? ""),
    phone: typeof row.phone === "string" ? row.phone : undefined,
    isDefault: Boolean(row.is_default),
  };
}

function mapOrder(value: unknown): Order {
  const row = asRecord(value);
  const shipping = asRecord(row.shipping_address);
  return {
    id: String(row.order_number ?? row.id),
    backendId: String(row.id),
    date: String(row.created_at ?? new Date().toISOString()),
    status: String(row.status ?? "Processing"),
    paymentStatus: typeof row.payment_status === "string" ? row.payment_status : undefined,
    trackingNumber: typeof row.tracking_number === "string" ? row.tracking_number : undefined,
    trackingUrl: typeof row.tracking_url === "string" ? row.tracking_url : undefined,
    total: Number(row.total_inr ?? row.total ?? 0),
    address: {
      id: String(row.id),
      name: String(shipping.full_name ?? row.customer_name ?? ""),
      line1: String(shipping.address_line_1 ?? ""),
      line2: typeof shipping.address_line_2 === "string" ? shipping.address_line_2 : undefined,
      city: String(shipping.city ?? ""),
      state: typeof shipping.state === "string" ? shipping.state : undefined,
      postal: String(shipping.postal_code ?? ""),
      country: String(shipping.country ?? ""),
      phone:
        typeof shipping.phone === "string"
          ? shipping.phone
          : typeof row.customer_phone === "string"
            ? row.customer_phone
            : undefined,
    },
    items: Array.isArray(row.items)
      ? row.items.map((value) => {
          const item = asRecord(value);
          return {
            name: String(item.product_name ?? "Product"),
            variant:
              [item.selected_color, item.selected_size].filter(Boolean).join(" / ") || undefined,
            qty: Number(item.quantity ?? 1),
            price: Number(item.unit_price ?? 0),
            img: String(item.product_image_url ?? ""),
            productId: item.product_id ? String(item.product_id) : undefined,
          };
        })
      : [],
  };
}

export function AccountProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    const unavailable: ContextValue = {
      account: null,
      isAdmin: false,
      isAuthenticated: false,
      isLoading: false,
      signIn: async () => {
        throw new Error("Customer accounts are not configured.");
      },
      signUp: async () => {
        throw new Error("Customer accounts are not configured.");
      },
      signOut: async () => undefined,
      requestPasswordReset: async () => {
        throw new Error("Password reset is not configured.");
      },
      resetPassword: async () => {
        throw new Error("Password reset is not configured.");
      },
      setMarketingConsent: async () => undefined,
      addAddress: async () => undefined,
      removeAddress: async () => undefined,
      setDefaultAddress: async () => undefined,
    };
    return <AccountContext.Provider value={unavailable}>{children}</AccountContext.Provider>;
  }
  return <ConvexAccountProvider>{children}</ConvexAccountProvider>;
}

function ConvexAccountProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn: authSignIn, signOut: authSignOut } = useAuthActions();
  const profile = useQuery(api.users.currentProfile, isAuthenticated ? {} : "skip");
  const currentUser = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  const addresses = useQuery(api.addresses.listMine, isAuthenticated ? {} : "skip");
  const orders = useQuery(api.orders.listMine, isAuthenticated ? {} : "skip");
  const ensureProfile = useMutation(api.users.ensureCurrentProfile);
  const updateProfile = useMutation(api.users.updateProfile);
  const createAddress = useMutation(api.addresses.create);
  const deleteAddress = useMutation(api.addresses.remove);
  const makeDefaultAddress = useMutation(api.addresses.setDefault);

  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;
    const pending = window.sessionStorage.getItem(PENDING_PROFILE_KEY);
    if (!pending) return;
    let details: { fullName?: string; marketingConsent?: boolean } = {};
    try {
      details = JSON.parse(pending) as typeof details;
    } catch {
      window.sessionStorage.removeItem(PENDING_PROFILE_KEY);
      return;
    }
    void ensureProfile(details)
      .then(() => window.sessionStorage.removeItem(PENDING_PROFILE_KEY))
      .catch(() => undefined);
  }, [ensureProfile, isAuthenticated]);

  const account = useMemo<Account | null>(() => {
    if (!isAuthenticated || !profile) return null;
    const name = String(profile.full_name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return {
      email: String(profile.email ?? ""),
      firstName: name[0] ?? "",
      lastName: name.slice(1).join(" "),
      marketingConsent: Boolean(profile.marketing_consent),
      addresses: Array.isArray(addresses) ? addresses.map(mapAddress) : [],
      orders: Array.isArray(orders) ? orders.map(mapOrder) : [],
    };
  }, [addresses, isAuthenticated, orders, profile]);

  const value = useMemo<ContextValue>(
    () => ({
      account,
      isAdmin: Boolean(currentUser?.isAdmin),
      isAuthenticated,
      isLoading:
        authLoading ||
        (isAuthenticated &&
          (profile === undefined || addresses === undefined || orders === undefined)),
      signIn: async (email, password) => {
        await authSignIn("password", {
          email: email.trim().toLowerCase(),
          password,
          flow: "signIn",
        });
      },
      signUp: async (email, password, firstName, lastName, marketingConsent = false) => {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            PENDING_PROFILE_KEY,
            JSON.stringify({
              fullName: `${firstName} ${lastName}`.trim(),
              marketingConsent,
            }),
          );
        }
        try {
          await authSignIn("password", {
            email: email.trim().toLowerCase(),
            password,
            flow: "signUp",
          });
        } catch (error) {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(PENDING_PROFILE_KEY);
          }
          throw error;
        }
      },
      requestPasswordReset: async (email) => {
        await authSignIn("password", {
          email: email.trim().toLowerCase(),
          flow: "reset",
        });
      },
      resetPassword: async (email, code, newPassword) => {
        await authSignIn("password", {
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
          flow: "reset-verification",
        });
      },
      signOut: async () => authSignOut(),
      setMarketingConsent: async (consent) => {
        await updateProfile({ marketing_consent: consent });
      },
      addAddress: async (address) => {
        await createAddress({
          payload: {
            full_name: address.name,
            phone: address.phone ?? null,
            address_line_1: address.line1,
            address_line_2: address.line2 ?? null,
            city: address.city,
            state: address.state ?? null,
            postal_code: address.postal,
            country: address.country,
            is_default: address.isDefault ?? false,
            type: "shipping",
          },
        });
      },
      removeAddress: async (id) => {
        await deleteAddress({ id });
      },
      setDefaultAddress: async (id) => {
        await makeDefaultAddress({ id });
      },
    }),
    [
      account,
      addresses,
      authLoading,
      authSignIn,
      authSignOut,
      createAddress,
      currentUser,
      deleteAddress,
      isAuthenticated,
      makeDefaultAddress,
      orders,
      profile,
      updateProfile,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccount must be used inside AccountProvider");
  return context;
}
