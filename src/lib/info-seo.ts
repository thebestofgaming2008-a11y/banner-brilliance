import { absoluteUrl, seo } from "./seo";

export function infoSeo({
  title,
  description,
  path,
  label,
  type = "WebPage",
}: {
  title: string;
  description: string;
  path: string;
  label: string;
  type?: "WebPage" | "ContactPage" | "AboutPage" | "FAQPage";
}) {
  const url = absoluteUrl(path);
  return {
    ...seo({ title, description, path }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": type,
              "@id": `${url}#webpage`,
              url,
              name: title,
              description,
              inLanguage: "en",
              isPartOf: { "@id": absoluteUrl("/#website") },
              about: { "@id": absoluteUrl("/#store") },
              breadcrumb: { "@id": `${url}#breadcrumb` },
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${url}#breadcrumb`,
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
                { "@type": "ListItem", position: 2, name: label, item: url },
              ],
            },
          ],
        }),
      },
    ],
  };
}
