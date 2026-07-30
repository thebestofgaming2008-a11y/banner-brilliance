import { createFileRoute } from "@tanstack/react-router";
import { StorePage } from "@/components/store/store-chrome";
import {
  STORE_WHATSAPP_DISPLAY,
  STORE_WHATSAPP_INQUIRY_MESSAGE,
  whatsappUrl,
} from "@/lib/store-config";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    seo({
      title: "Terms & Conditions | Fawzaan Store",
      description: "The terms governing purchases, payments and use of Fawzaan Store.",
      path: "/terms",
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <StorePage>
      <main className="mx-auto max-w-3xl px-5 md:px-8 py-16 md:py-24">
        <p className="eyebrow text-gold-deep mb-3">Legal</p>
        <h1 className="font-display text-4xl md:text-5xl mb-2">Terms & Conditions</h1>
        <p className="text-sm text-ink/60 mb-10">Last updated: July 30, 2026</p>

        <div className="space-y-6 text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>
              By browsing this site, you accept our store policies. While we review product details
              before launch, prices and item stock can change.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">2. Eligibility</h2>
            <p>
              You must be at least 18 years old, or have parental consent, to make a purchase on
              this site. By placing an order you confirm the information you provide is accurate.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">3. Products & Pricing</h2>
            <p>
              We strive to display product colours, sizes, and details as accurately as possible.
              Slight variations may occur due to monitor settings or the handmade nature of certain
              items. Base prices are listed in INR; displayed currency conversions are estimates.
              Prices may change without notice. We reserve the right to cancel and refund an order
              if a pricing or stock error has occurred.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">4. Orders & Payment</h2>
            <p>
              All orders are subject to acceptance and availability. India checkout payment is
              processed through Razorpay. International orders are confirmed through WhatsApp,
              including shipping and payment instructions, before they proceed. You agree to provide
              accurate customer and delivery information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">5. Shipping & Delivery</h2>
            <p>
              Please see our{" "}
              <a href="/pages/shipping" className="text-gold-deep underline">
                Shipping Policy
              </a>{" "}
              for estimated delivery times and logistics. Title and risk of loss pass to you on
              delivery.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">6. Returns & Refunds</h2>
            <p>
              Our{" "}
              <a href="/pages/returns" className="text-gold-deep underline">
                Return & Refund Policy
              </a>{" "}
              explains which items may be returned and how to request a return. After an eligible
              return is received and inspected, an approved refund is sent to the original payment
              method. Delivery charges are refunded only when the item arrived damaged, faulty, or
              different from what was ordered.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">7. Website Content</h2>
            <p>
              Original photos, product descriptions, graphics, and branding created for this website
              may not be copied or reused without permission. This does not claim or imply that the
              Fawzaan Store name or logo is a registered trademark.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">8. Service Responsibility</h2>
            <p>
              We take reasonable care to keep product, price, stock, and order information accurate
              and to keep the store available. We are not responsible for delays or interruptions
              outside our reasonable control, or for loss caused by misuse of the website or a
              product. Nothing in these terms removes or reduces a consumer right or remedy that
              cannot legally be excluded.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">9. Applicable Law</h2>
            <p>
              These terms are interpreted under the laws applicable in India. Any consumer rights
              and remedies available under applicable law remain unaffected.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">10. Contact</h2>
            <p>
              Questions? Contact Fawzaan on{" "}
              <a
                href={whatsappUrl(STORE_WHATSAPP_INQUIRY_MESSAGE)}
                target="_blank"
                rel="noreferrer"
                className="text-gold-deep underline"
              >
                WhatsApp at {STORE_WHATSAPP_DISPLAY}
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </StorePage>
  );
}
