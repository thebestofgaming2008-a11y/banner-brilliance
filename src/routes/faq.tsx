import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Fawzaan.store" },
      {
        name: "description",
        content: "Answers to common questions on sizing, shipping, returns and care.",
      },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    section: "Orders & shipping",
    items: [
      {
        q: "How long does shipping take?",
        a: "Standard shipping arrives in 5-8 business days. Express is 2-3 days. Free worldwide shipping on orders over $75.",
      },
      {
        q: "Do you ship internationally?",
        a: "Yes — we ship worldwide with tracked parcels from India. Duties and taxes may apply at customs.",
      },
      {
        q: "How do I track my order?",
        a: "You'll receive a tracking link by email as soon as your order ships (usually within 24h).",
      },
    ],
  },
  {
    section: "Returns",
    items: [
      {
        q: "What is your return policy?",
        a: "30 days from delivery. Items must be unworn with tags intact. See our full returns policy for details.",
      },
      {
        q: "Who pays for return shipping?",
        a: "You cover return shipping unless the item is defective or we shipped the wrong product.",
      },
    ],
  },
  {
    section: "Sizing & fit",
    items: [
      {
        q: "How are shemaghs sized?",
        a: "All shemaghs are 130 × 130 cm — a generous cut that wraps comfortably.",
      },
      {
        q: "How does the niqab fit?",
        a: "One size fits most. Adjustable double-tie for a secure, custom feel. Choose 'Long' for extra length.",
      },
      {
        q: "How should gloves fit?",
        a: "Leather softens over time. If between sizes, choose the smaller size for a snug fit.",
      },
    ],
  },
  {
    section: "Care",
    items: [
      {
        q: "How do I wash a shemagh?",
        a: "Machine wash cold on a gentle cycle. Hang dry. Iron on low if needed.",
      },
      {
        q: "How do I care for the niqab?",
        a: "Hand wash cold, hang dry. Avoid tumble drying — the chiffon holds its shape best that way.",
      },
      {
        q: "How do I care for leather gloves?",
        a: "Wipe with a soft, dry cloth. Avoid soaking. Condition once a year with leather balm.",
      },
    ],
  },
];

function FaqPage() {
  const [open, setOpen] = useState<string | null>("How long does shipping take?");
  return (
    <div className="min-h-screen bg-ivory text-ink">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 md:px-8 py-10 md:py-14">
        <p className="eyebrow text-gold-deep">Help centre</p>
        <h1 className="mt-1 font-display text-4xl md:text-5xl">Questions & answers</h1>

        {faqs.map((sec) => (
          <section key={sec.section} className="mt-10">
            <h2 className="font-display text-2xl">{sec.section}</h2>
            <div className="mt-3 border-t border-ink/10">
              {sec.items.map((f) => {
                const isOpen = open === f.q;
                return (
                  <div key={f.q} className="border-b border-ink/10">
                    <button
                      onClick={() => setOpen(isOpen ? null : f.q)}
                      className="w-full flex items-center justify-between py-4 text-left text-sm font-medium"
                    >
                      {f.q}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <p className="pb-4 text-sm text-ink/70 leading-relaxed animate-fade-up">
                        {f.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}
