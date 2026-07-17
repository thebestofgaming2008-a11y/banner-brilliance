import { StorePage } from "@/components/store/store-chrome";
import { useStoreReveal } from "@/hooks/use-store-reveal";

export type InfoSection = { title: string; paragraphs: string[]; bullets?: string[] };

export function InfoPage({
  eyebrow,
  title,
  intro,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: InfoSection[];
  children?: React.ReactNode;
}) {
  useStoreReveal();
  return (
    <StorePage>
      <section className="bg-[#f4b400] px-[22px] py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[960px]" data-store-reveal>
          <p className="section-kicker text-black/55">{eyebrow}</p>
          <h1 className="section-heading mt-3 text-[44px] md:text-[68px]">{title}</h1>
          <p className="mt-5 max-w-2xl text-[14px] leading-6 text-black/65">{intro}</p>
        </div>
      </section>
      <section className="px-[22px] py-12 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[960px] gap-10 md:grid-cols-[220px_1fr]">
          <aside className="hidden md:block">
            <p className="section-kicker text-black/45">On this page</p>
            <ol className="mt-4 space-y-3 text-[12px] text-black/60">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a href={`#section-${index}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </aside>
          <div className="divide-y divide-black/10">
            {sections.map((section, index) => (
              <article
                key={section.title}
                id={`section-${index}`}
                className="scroll-mt-24 pb-10 pt-10 first:pt-0"
                data-store-reveal
              >
                <h2 className="text-[22px] font-bold uppercase">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-[14px] leading-6 text-black/65">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-5 space-y-3 text-[14px] text-black/65">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#f4b400]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
            {children}
          </div>
        </div>
      </section>
    </StorePage>
  );
}
