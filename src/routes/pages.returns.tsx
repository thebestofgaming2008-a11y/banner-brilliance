import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/store/info-page";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/pages/returns")({
  head: () =>
    seo({
      title: "Returns Policy | Fawzaan Store",
      description:
        "Read the Fawzaan Store 30-day return window, eligibility rules and return process.",
      path: "/pages/returns",
    }),
  component: ReturnsPage,
});
function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Customer care"
      title="RETURNS"
      intro="A straightforward return process for eligible unused items."
      sections={[
        {
          title: "Return window",
          paragraphs: [
            "Eligible products may be returned within 30 days of delivery. Items must be unworn, unused, and returned with their original packaging.",
          ],
        },
        {
          title: "Non-returnable items",
          paragraphs: [
            "For hygiene and food-safety reasons, opened niqabs, kufis, and honey cannot be returned.",
          ],
          bullets: [
            "Opened food products",
            "Worn or washed garments",
            "Items without original packaging",
            "Final-sale products",
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
