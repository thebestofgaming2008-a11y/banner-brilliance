import { createFileRoute } from "@tanstack/react-router";

import hero from "@/assets/hero-shemagh.jpg";
import { StorePage } from "@/components/store/store-chrome";
import { infoSeo } from "@/lib/info-seo";
import { InformationHeader, SupportNavigation } from "@/components/store/support-navigation";
import { STORE_FACEBOOK_URL, STORE_INSTAGRAM_URL, STORE_LOCATION } from "@/lib/store-config";
import { SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    infoSeo({
      title: "About Fawzaan Store | Islamic Essentials in Mumbai",
      description:
        "Meet Fawzaan Store, an online store based in Kurla West, Mumbai. Explore shemaghs, niqabs, kufi caps and gloves, with delivery across India.",
      path: "/about",
      label: "About Fawzaan Store",
      type: "AboutPage",
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <StorePage>
      <InformationHeader
        eyebrow="The store"
        title="About Fawzaan Store"
        intro="Shemaghs, niqabs, kufi caps and gloves for everyday wear, from our online store in Mumbai."
      />

      <section className="px-[22px] py-12 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-[1080px] items-center gap-10 md:grid-cols-2 md:gap-16">
          <img
            src={hero}
            alt="Red and white shemagh from Fawzaan Store"
            width={900}
            height={1125}
            className="aspect-[4/5] w-full object-cover"
          />
          <div>
            <h2 className="text-[26px] font-semibold leading-tight">
              From Mumbai to your doorstep
            </h2>
            <div className="mt-6 space-y-4 text-[14px] leading-6 text-black/70">
              <p>
                Fawzaan Store is based in {STORE_LOCATION}. Browse our{" "}
                <a href="/shop?collection=shemaghs" className="underline underline-offset-4">
                  shemaghs
                </a>
                ,{" "}
                <a href="/shop?collection=niqabs" className="underline underline-offset-4">
                  niqabs
                </a>
                ,{" "}
                <a href="/shop?collection=kufis" className="underline underline-offset-4">
                  kufi caps
                </a>{" "}
                and{" "}
                <a href="/shop?collection=gloves" className="underline underline-offset-4">
                  gloves
                </a>
                , with product photos and available options on each page.
              </p>
              <p>
                Customers in India complete payment securely through Razorpay. India product prices
                include shipping unless a product page clearly states otherwise.
              </p>
              <p>
                International customers send their order details through WhatsApp, where
                availability, shipping, and payment are confirmed before the order proceeds.
              </p>
              <p>
                Customer accounts are optional. They provide saved addresses, order history,
                tracking links, and a personal wishlist.
              </p>
            </div>
            <a
              href="/shop"
              className="mt-8 inline-flex h-12 items-center bg-black px-7 text-[11px] font-bold uppercase text-white"
            >
              Explore the store
            </a>
          </div>
        </div>
      </section>
      <section
        aria-labelledby="official-store-heading"
        className="mx-auto max-w-[1080px] px-[22px] pb-12 md:px-8"
      >
        <h2 id="official-store-heading" className="text-[26px] font-semibold leading-tight">
          Find the official Fawzaan Store
        </h2>
        <div className="mt-5 max-w-2xl space-y-4 text-[14px] leading-6 text-black/70">
          <p>
            Our name is Fawzaan Store, with a double &ldquo;a&rdquo; after the &ldquo;z&rdquo;. If
            you searched for &ldquo;Fawzan Store&rdquo; to find our Mumbai store, you are in the
            right place. Our official website is{" "}
            <a href={`${SITE_URL}/`} className="underline underline-offset-4">
              officialfawzaanstore.com
            </a>
            .
          </p>
          <p>
            You can also find us on{" "}
            <a href={STORE_INSTAGRAM_URL} className="underline underline-offset-4">
              Instagram as @fawzaan.store
            </a>{" "}
            and{" "}
            <a href={STORE_FACEBOOK_URL} className="underline underline-offset-4">
              Facebook as Fawzaan Store
            </a>
            . For help identifying a product or checking an order, use our{" "}
            <a href="/pages/contact" className="underline underline-offset-4">
              official contact page
            </a>
            .
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-[1080px] px-[22px] pb-14 md:px-8">
        <SupportNavigation />
      </div>
    </StorePage>
  );
}
