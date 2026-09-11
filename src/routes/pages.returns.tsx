import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/store/info-page";
import { infoSeo } from "@/lib/info-seo";
export const Route = createFileRoute("/pages/returns")({
  head: () =>
    infoSeo({
      title: "Returns Policy | Fawzaan Store",
      description:
        "Read the Fawzaan Store 5-day return window, eligibility rules and return process.",
      path: "/pages/returns",
      label: "Returns and refunds",
    }),
  component: ReturnsPage,
});
function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Customer care"
      title="Returns and refunds"
      intro="Check the return window and item conditions, then contact support for return instructions."
      sections={[
        {
          title: "Return window",
          paragraphs: ["Eligible unused items must be returned within 5 days of delivery."],
        },
        {
          title: "Return conditions",
          paragraphs: [
            "Products must be unworn, unused, and returned in their original packaging.",
          ],
        },
        {
          title: "Non-returnable items",
          paragraphs: [
            "Custom items and final-sale purchases are non-refundable and excluded from returns. For hygiene and food-safety reasons, opened niqabs, kufis, and honey cannot be returned.",
          ],
          bullets: [
            "Custom items",
            "Final-sale products",
            "Opened food products",
            "Worn or washed garments",
            "Items without original packaging",
          ],
        },
        {
          title: "Start a return",
          paragraphs: [
            "Contact support with your order number and the item you wish to return. We will confirm eligibility and provide the return instructions.",
          ],
        },
        {
          title: "Refunds",
          paragraphs: [
            "After we receive and inspect the returned item, we will tell you whether the refund is approved. An approved refund is sent back to the same payment method used for the order. Your bank or payment provider may need additional time to show it.",
            "The original delivery charge is refunded only when the item arrived damaged, faulty, or different from what was ordered. This policy does not reduce any rights you have under applicable consumer law.",
          ],
        },
      ]}
    />
  );
}
