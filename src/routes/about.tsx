import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import hero from "@/assets/hero-honey.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us | Fawzaan.store" },
      {
        name: "description",
        content:
          "The story behind Fawzaan Store — heritage textiles, modest essentials, and raw honey crafted with intention.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-ivory text-ink">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 md:px-8 py-16 md:py-24 text-center">
          <p className="eyebrow text-gold-deep mb-3">Our Story</p>
          <h1 className="font-display text-4xl md:text-6xl mb-6">Heritage, with intention.</h1>
          <p className="text-ink/70 text-lg leading-relaxed max-w-2xl mx-auto">
            Fawzaan Store was founded in 2021 with a simple idea: source the finest essentials for
            the modern Muslim, work directly with the artisans who make them, and sell them at a
            fair price — without the markups of middlemen.
          </p>
        </section>

        <section className="bg-cream">
          <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
            <img src={hero} alt="Honey jars" className="w-full h-[420px] object-cover rounded" />
            <div>
              <p className="eyebrow text-gold-deep mb-3">What we do</p>
              <h2 className="font-display text-3xl md:text-4xl mb-5">
                Made by hand. Sourced with care.
              </h2>
              <p className="text-ink/75 leading-relaxed mb-4">
                We partner with weavers in the Levant for our shemaghs, seamstresses in South Asia
                for our niqabs and modest gloves, and highland beekeepers in Yemen and the Atlas
                mountains for our raw honey range.
              </p>
              <p className="text-ink/75 leading-relaxed">
                Every product passes our quality bench before it ships — and if it doesn't meet our
                standard, it doesn't go in the box.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <p className="font-display text-5xl text-gold-deep">5+</p>
              <p className="mt-2 font-medium">Years in business</p>
              <p className="text-sm text-ink/60 mt-1">Family-owned since 2021.</p>
            </div>
            <div>
              <p className="font-display text-5xl text-gold-deep">40k+</p>
              <p className="mt-2 font-medium">Orders shipped</p>
              <p className="text-sm text-ink/60 mt-1">To customers in 60+ countries.</p>
            </div>
            <div>
              <p className="font-display text-5xl text-gold-deep">12</p>
              <p className="mt-2 font-medium">Artisan partners</p>
              <p className="text-sm text-ink/60 mt-1">Across four countries.</p>
            </div>
          </div>
        </section>

        <section className="bg-ink text-ivory">
          <div className="mx-auto max-w-3xl px-5 md:px-8 py-16 md:py-24 text-center">
            <p className="eyebrow text-gold mb-3">Our promise</p>
            <h2 className="font-display text-3xl md:text-4xl mb-5">Quality first. Always.</h2>
            <p className="text-ivory/75 leading-relaxed">
              If anything you receive isn't what you expected — wrong fit, wrong shade, just not for
              you — send it back within 30 days for a full refund. No questions, no hassle.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
