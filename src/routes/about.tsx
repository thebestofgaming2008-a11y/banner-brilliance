import { createFileRoute } from "@tanstack/react-router";

import hero from "@/assets/hero-honey.webp";
import { StorePage } from "@/components/store/store-chrome";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    seo({
      title: "About Fawzaan Store | Our Product Selection",
      description:
        "Learn how Fawzaan brings shemaghs, niqabs, kufis, watches, gloves and Kashmir honey into one clearly presented online store.",
      path: "/about",
      image: hero,
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <StorePage>
      <main>
        <section className="px-[22px] py-14 text-center md:px-8 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="section-kicker text-black/45">About Fawzaan</p>
            <h1 className="section-heading mt-3 text-[44px] md:text-[68px]">
              MODEST ESSENTIALS, CLEARLY CHOSEN
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-7 text-black/65">
              Fawzaan brings together shemaghs, niqabs, kufis, watches, gloves, and Kashmir honey in
              one focused store. Each product page presents the current price, options, stock, and
              product details needed to order with confidence.
            </p>
          </div>
        </section>

        <section className="brand-mango-bg px-[22px] py-12 md:px-8 md:py-20">
          <div className="mx-auto grid max-w-[1080px] items-center gap-10 md:grid-cols-2 md:gap-16">
            <img
              src={hero}
              alt="Fawzaan Kashmir honey selection"
              className="aspect-[4/5] w-full object-cover"
            />
            <div>
              <p className="section-kicker text-black/55">How the store works</p>
              <h2 className="section-heading mt-3 text-[36px] md:text-[48px]">
                SIMPLE FROM PRODUCT TO DELIVERY
              </h2>
              <div className="mt-6 space-y-4 text-[14px] leading-6 text-black/70">
                <p>
                  Customers in India complete payment securely through Razorpay. India product
                  prices include shipping unless a product page clearly states otherwise.
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
      </main>
    </StorePage>
  );
}
