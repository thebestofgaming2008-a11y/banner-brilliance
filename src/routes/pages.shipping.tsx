import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/store/info-page";
export const Route = createFileRoute("/pages/shipping")({ component: ShippingPage });
function ShippingPage() {
  return (
    <InfoPage
      eyebrow="Customer care"
      title="SHIPPING"
      intro="Clear delivery expectations from dispatch to your door."
      sections={[
        {
          title: "Processing times",
          paragraphs: [
            "Orders are prepared within 1-2 business days. During launches and restocks, preparation may take an additional business day.",
          ],
        },
        {
          title: "Delivery",
          paragraphs: [
            "Tracked delivery is available for every order. Delivery estimates begin once your parcel has been collected by the carrier.",
          ],
          bullets: [
            "Pakistan: typically 2-5 business days",
            "International: typically 7-14 business days",
            "Tracking details are sent after dispatch",
          ],
        },
        {
          title: "Customs and duties",
          paragraphs: [
            "International customers are responsible for any local customs charges, taxes, or import duties collected by their destination country.",
          ],
        },
        {
          title: "Delivery support",
          paragraphs: [
            "If tracking has not updated for five business days, contact us with your order number so we can investigate with the carrier.",
          ],
        },
      ]}
    />
  );
}
