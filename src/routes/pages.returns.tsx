import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/store/info-page";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/pages/returns")({
  head: () =>
    seo({
      title: "Returns Policy | Fawzaan Store",
      description:
        "Read the Fawzaan Store 5-day return window, eligibility rules and return process.",
      path: "/pages/returns",
    }),
  component: ReturnsPage,
});
function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Customer care"
      title="RETURNS"
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
            "Approved refunds are issued to the original payment method after inspection. Original shipping charges are not refundable unless the item arrived faulty.",
          ],
        },
      ]}
    />
  );
}
