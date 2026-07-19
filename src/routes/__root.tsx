import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Toaster } from "sonner";
import { AccountProvider } from "@/lib/account";
import { convex } from "@/lib/backend";
import { CartProvider } from "@/lib/cart";
import { CurrencyProvider } from "@/lib/currency";
import { WishlistProvider } from "@/lib/wishlist";
import {
  absoluteUrl,
  BRAND_ALTERNATE_NAMES,
  BRAND_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  seo,
  SITE_URL,
} from "@/lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const defaultSeo = seo({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: "/" });
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#0a0a0a" },
        ...defaultSeo.meta,
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        ...defaultSeo.links,
        { rel: "icon", href: "/fawzaan-logo.png", type: "image/png", sizes: "280x132" },
        { rel: "apple-touch-icon", href: "/fawzaan-logo.png" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Schibsted+Grotesk:wght@400;500;600&display=swap",
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            "@id": `${SITE_URL}/#store`,
            name: BRAND_NAME,
            alternateName: BRAND_ALTERNATE_NAMES,
            url: SITE_URL,
            logo: absoluteUrl("/fawzaan-logo.png"),
            image: absoluteUrl("/og-image-v2.jpg"),
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "IN",
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 30,
              returnPolicyUrl: absoluteUrl("/pages/returns"),
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: BRAND_NAME,
            alternateName: BRAND_ALTERNATE_NAMES,
            url: SITE_URL,
            publisher: { "@id": `${SITE_URL}/#store` },
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl("/shop")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const app = (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <AccountProvider>
          <WishlistProvider>
            <CartProvider>
              <Outlet />
              <Toaster position="bottom-center" theme="light" richColors closeButton />
            </CartProvider>
          </WishlistProvider>
        </AccountProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );

  return convex ? <ConvexAuthProvider client={convex}>{app}</ConvexAuthProvider> : app;
}
