import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

import { StorePage } from "@/components/store/store-chrome";
import { infoSeo } from "@/lib/info-seo";
import { absoluteUrl } from "@/lib/seo";
import { InformationHeader, SupportNavigation } from "@/components/store/support-navigation";

const faqs = [
  {
    section: "Orders and shipping",
    items: [
      {
        q: "How long does shipping take?",
        a: "Delivery timing depends on the destination and carrier. India orders receive tracking after dispatch. For international orders, availability, shipping cost, and delivery timing are confirmed with you on WhatsApp before payment.",
      },
      {
        q: "Do you ship internationally?",
        a: "International orders are handled through WhatsApp so shipping and payment can be confirmed for your country. Local customs duties or taxes may apply.",
      },
      {
        q: "How do I track my order?",
        a: "When an India order ships, tracking details are sent to the WhatsApp number used at checkout. You can also use the tracking page with your order number and email.",
      },
    ],
  },
  {
    section: "Returns",
    items: [
      {
        q: "What is your return policy?",
        a: "Eligible unused items may be returned within 5 days of delivery. Hygiene, food-safety, and final-sale exclusions apply. Read the returns page before opening or using an item.",
      },
      {
        q: "Who pays for return shipping?",
        a: "The customer normally pays return shipping. If an item arrives damaged, defective, or incorrect, contact support before returning it so the store can review the case.",
      },
    ],
  },
  {
    section: "Sizing and options",
    items: [
      {
        q: "How do I choose a size or colour?",
        a: "Available sizes, colours, measurements, and other options are shown on each product page. Select every required option before adding the product to your cart.",
      },
      {
        q: "What if I am unsure about an option?",
        a: "Contact WhatsApp support with the product name before ordering. The store can confirm the available option and product details.",
      },
    ],
  },
  {
    section: "Care",
    items: [
      {
        q: "How should I care for textile products?",
        a: "Follow the care details supplied with the product. When no specific instruction is provided, use gentle cleaning and avoid heat until support confirms the correct method.",
      },
      {
        q: "How should honey be stored?",
        a: "Keep sealed honey in a cool, dry place away from direct sunlight. Natural crystallisation can occur and does not necessarily indicate spoilage.",
      },
    ],
  },
];

export const Route = createFileRoute("/faq")({
  head: () => {
    const metadata = infoSeo({
      title: "FAQ | Fawzaan Store Orders, Shipping & Returns",
      description: "Answers to common questions about Fawzaan orders, shipping, returns and care.",
      path: "/faq",
      label: "Frequently asked questions",
      type: "FAQPage",
    });
    return {
      ...metadata,
      scripts: [
        ...metadata.scripts,
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": `${absoluteUrl("/faq")}#webpage`,
            mainEntity: faqs.flatMap((section) =>
              section.items.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            ),
          }),
        },
      ],
    };
  },
  component: FaqPage,
});

function FaqPage() {
  return (
    <StorePage>
      <InformationHeader
        eyebrow="Help centre"
        title="Frequently asked questions"
        intro="Answers about ordering, delivery, returns, sizing and product care. For help with your own order, contact the store with your order number."
      />
      <div className="mx-auto max-w-[1000px] px-[22px] py-10 md:px-8 md:py-14">
        <nav aria-label="FAQ topics" className="flex flex-wrap gap-3">
          {faqs.map((section, index) => (
            <a
              key={section.section}
              href={`#faq-topic-${index}`}
              className="rounded-full bg-[#F7F7F5] px-4 py-3 text-[13px] font-medium hover:bg-black/10"
            >
              {section.section}
            </a>
          ))}
        </nav>

        {faqs.map((section, sectionIndex) => (
          <section
            key={section.section}
            id={`faq-topic-${sectionIndex}`}
            className="mt-10 scroll-mt-24"
          >
            <h2 className="text-[22px] font-semibold">{section.section}</h2>
            <div className="mt-4 space-y-3">
              {section.items.map((item, itemIndex) => (
                <details
                  key={item.q}
                  open={sectionIndex === 0 && itemIndex === 0}
                  className="group rounded-lg bg-[#F7F7F5] px-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="max-w-3xl pb-5 text-[15px] leading-7 text-black/75">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        <SupportNavigation />
      </div>
    </StorePage>
  );
}
