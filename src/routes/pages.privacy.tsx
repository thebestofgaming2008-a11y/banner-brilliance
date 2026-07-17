import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/store/info-page";
export const Route = createFileRoute("/pages/privacy")({ component: PrivacyPage });
function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="PRIVACY"
      intro="How Fawzaan handles information when you browse and shop."
      sections={[
        {
          title: "Information we collect",
          paragraphs: [
            "We collect information you provide during checkout, customer support, and newsletter registration, together with basic technical information needed to operate the store.",
          ],
        },
        {
          title: "How information is used",
          paragraphs: [
            "Information is used to process orders, provide support, prevent fraud, improve the storefront, and send marketing only where consent has been provided.",
          ],
        },
        {
          title: "Service providers",
          paragraphs: [
            "Necessary information may be shared with payment, delivery, analytics, and hosting providers solely to deliver their services.",
          ],
        },
        {
          title: "Your choices",
          paragraphs: [
            "You may request access, correction, or deletion of eligible personal information and may unsubscribe from marketing at any time.",
          ],
        },
        {
          title: "Contact",
          paragraphs: ["Privacy questions can be submitted through the contact page."],
        },
      ]}
    />
  );
}
