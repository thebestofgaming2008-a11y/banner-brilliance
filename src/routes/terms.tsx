import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/store/info-page";
import {
  STORE_WHATSAPP_DISPLAY,
  STORE_WHATSAPP_INQUIRY_MESSAGE,
  whatsappUrl,
} from "@/lib/store-config";
import { infoSeo } from "@/lib/info-seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    infoSeo({
      title: "Terms & Conditions | Fawzaan Store",
      description: "The terms governing purchases, payments and use of Fawzaan Store.",
      path: "/terms",
      label: "Terms and conditions",
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Terms and conditions"
      intro="The terms for using Fawzaan Store and placing an order. Last updated: July 30, 2026."
      sections={[
        {
          title: "1. Acceptance of Terms",
          paragraphs: [
            <>
              By browsing this site, you accept our store policies. While we review product details
              before launch, prices and item stock can change.
            </>,
          ],
        },
        {
          title: "2. Eligibility",
          paragraphs: [
            <>
              You must be at least 18 years old, or have parental consent, to make a purchase on
              this site. By placing an order you confirm the information you provide is accurate.
            </>,
          ],
        },
        {
          title: "3. Products & Pricing",
          paragraphs: [
            <>
              We strive to display product colours, sizes, and details as accurately as possible.
              Slight variations may occur due to monitor settings or the handmade nature of certain
              items. Base prices are listed in INR; displayed currency conversions are estimates.
              Prices may change without notice. We reserve the right to cancel and refund an order
              if a pricing or stock error has occurred.
            </>,
          ],
        },
        {
          title: "4. Orders & Payment",
          paragraphs: [
            <>
              All orders are subject to acceptance and availability. India checkout payment is
              processed through Razorpay. International orders are confirmed through WhatsApp,
              including shipping and payment instructions, before they proceed. You agree to provide
              accurate customer and delivery information.
            </>,
          ],
        },
        {
          title: "5. Shipping & Delivery",
          paragraphs: [
            <>
              Please see our{" "}
              <a href="/pages/shipping" className="text-gold-deep underline">
                Shipping Policy
              </a>{" "}
              for estimated delivery times and logistics. Title and risk of loss pass to you on
              delivery.
            </>,
          ],
        },
        {
          title: "6. Returns & Refunds",
          paragraphs: [
            <>
              Our{" "}
              <a href="/pages/returns" className="text-gold-deep underline">
                Return & Refund Policy
              </a>{" "}
              explains which items may be returned and how to request a return. After an eligible
              return is received and inspected, an approved refund is sent to the original payment
              method. Delivery charges are refunded only when the item arrived damaged, faulty, or
              different from what was ordered.
            </>,
          ],
        },
        {
          title: "7. Website Content",
          paragraphs: [
            <>
              Original photos, product descriptions, graphics, and branding created for this website
              may not be copied or reused without permission. This does not claim or imply that the
              Fawzaan Store name or logo is a registered trademark.
            </>,
          ],
        },
        {
          title: "8. Service Responsibility",
          paragraphs: [
            <>
              We take reasonable care to keep product, price, stock, and order information accurate
              and to keep the store available. We are not responsible for delays or interruptions
              outside our reasonable control, or for loss caused by misuse of the website or a
              product. Nothing in these terms removes or reduces a consumer right or remedy that
              cannot legally be excluded.
            </>,
          ],
        },
        {
          title: "9. Applicable Law",
          paragraphs: [
            <>
              These terms are interpreted under the laws applicable in India. Any consumer rights
              and remedies available under applicable law remain unaffected.
            </>,
          ],
        },
        {
          title: "10. Contact",
          paragraphs: [
            <>
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
            </>,
          ],
        },
      ]}
    />
  );
}
