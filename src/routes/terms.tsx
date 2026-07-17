import { createFileRoute } from "@tanstack/react-router";
import { StorePage } from "@/components/store/store-chrome";
import { STORE_WHATSAPP_DISPLAY, whatsappUrl } from "@/lib/store-config";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | Fawzaan.store" },
      { name: "description", content: "The rules and terms governing your use of Fawzaan Store." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <StorePage>
      <main className="mx-auto max-w-3xl px-5 md:px-8 py-16 md:py-24">
        <p className="eyebrow text-gold-deep mb-3">Legal</p>
        <h1 className="font-display text-4xl md:text-5xl mb-2">Terms & Conditions</h1>
        <p className="text-sm text-ink/60 mb-10">Last updated: June 27, 2026</p>

        <div className="space-y-6 text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using fawzaan.store, you agree to be bound by these Terms & Conditions
              and our Privacy Policy. If you do not agree, please do not use the site.
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
              Returns are governed by our{" "}
              <a href="/pages/returns" className="text-gold-deep underline">
                Return & Refund Policy
              </a>
              . By purchasing, you agree to those terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">7. Intellectual Property</h2>
            <p>
              All content on this site — logos, images, text, designs — is the property of Fawzaan
              Store and protected by copyright and trademark laws. You may not reproduce,
              distribute, or use any content without written permission.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Fawzaan Store shall not be liable for any
              indirect, incidental, special, or consequential damages arising out of or in
              connection with your use of the site or products purchased. Our total liability shall
              not exceed the amount paid for the product in question.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">9. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of the
              jurisdiction in which Fawzaan Store is registered, without regard to conflict of law
              principles.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mt-8 mb-3">10. Contact</h2>
            <p>
              Questions? Contact Fawzaan on{" "}
              <a
                href={whatsappUrl("Assalamu alaikum. I have a question about the Fawzaan terms.")}
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
