import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { StorePage } from "@/components/store/store-chrome";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  head: () =>
    seo({
      title: "FAQ | Fawzaan Orders, Shipping & Returns",
      description: "Answers to common questions about Fawzaan orders, shipping, returns and care.",
      path: "/faq",
    }),
  component: FaqPage,
});

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
        a: "Eligible unused items may be returned within 30 days of delivery. Hygiene, food-safety, and final-sale exclusions apply. Read the returns page before opening or using an item.",
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

function FaqPage() {
  const [open, setOpen] = useState<string | null>(faqs[0].items[0].q);
  return (
    <StorePage>
      <main className="mx-auto max-w-3xl px-[22px] py-12 md:px-8 md:py-20">
        <p className="section-kicker text-black/45">Help centre</p>
        <h1 className="section-heading mt-2 text-[42px] md:text-[58px]">QUESTIONS AND ANSWERS</h1>

        {faqs.map((section) => (
          <section key={section.section} className="mt-10">
            <h2 className="text-[20px] font-bold uppercase">{section.section}</h2>
            <div className="mt-3 border-t border-black/10">
              {section.items.map((item) => {
                const isOpen = open === item.q;
                return (
                  <div key={item.q} className="border-b border-black/10">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : item.q)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium"
                    >
                      {item.q}
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen ? (
                      <p className="pb-5 text-sm leading-6 text-black/65">{item.a}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </StorePage>
  );
}
