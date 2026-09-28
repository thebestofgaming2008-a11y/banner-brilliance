import { StorePage } from "@/components/store/store-chrome";
import type { ReactNode } from "react";
import { InformationHeader, SupportNavigation } from "./support-navigation";

export type InfoSection = { title: string; paragraphs: ReactNode[]; bullets?: string[] };

export function InfoPage({
  eyebrow,
  title,
  intro,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  sections: InfoSection[];
  children?: React.ReactNode;
}) {
  return (
    <StorePage>
      <InformationHeader eyebrow={eyebrow} title={title} intro={intro} />
      <section className="px-[22px] py-12 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1000px] gap-10 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="On this page"
            className="self-start rounded-lg bg-[#F7F7F5] p-5 md:sticky md:top-24"
          >
            <p className="section-kicker text-black/45">On this page</p>
            <ol className="mt-4 space-y-3 text-[12px] text-black/60">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a
                    className="underline-offset-4 hover:underline focus-visible:underline"
                    href={`#section-${index}`}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div>
            {sections.map((section, index) => (
              <article
                key={section.title}
                id={`section-${index}`}
                className="scroll-mt-24 mb-10 last:mb-0"
              >
                <h2 className="text-[22px] font-semibold leading-snug">{section.title}</h2>
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="mt-3 text-[15px] leading-7 text-black/75">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-5 space-y-3 text-[14px] text-black/65">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="brand-mango-bg mt-2 h-1.5 w-1.5 shrink-0" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
            {children}
            <SupportNavigation />
          </div>
        </div>
      </section>
    </StorePage>
  );
}
