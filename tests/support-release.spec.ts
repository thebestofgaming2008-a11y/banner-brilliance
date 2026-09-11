import { expect, test } from "@playwright/test";

const original = "https://34d54582.fawzaanstore.pages.dev";

test("unchanged storefront pages match the previous production HTML", async ({ page, request }) => {
  for (const path of [
    "/",
    "/shop",
    "/products/yemeni-shemagh",
    "/products/makkah-gloves",
    "/cart",
    "/checkout",
  ]) {
    const [before, after] = await Promise.all([
      request.get(`${original}${path}`),
      request.get(path),
    ]);
    expect(before.status(), `baseline ${path}`).toBe(200);
    expect(after.status(), `release ${path}`).toBe(200);
    const [beforeHtml, afterHtml] = await Promise.all([before.text(), after.text()]);
    const signatures = await page.evaluate(
      (htmls) =>
        htmls.map((html) => {
          const document = new DOMParser().parseFromString(html, "text/html");
          const main = document.querySelector("main");
          return {
            title: document.title,
            text: main?.textContent,
            elements: Array.from(main?.querySelectorAll("*") || []).map((element) => ({
              tag: element.tagName,
              classes: element.className,
              href: element.getAttribute("href"),
              src: element.getAttribute("src"),
              alt: element.getAttribute("alt"),
              type: element.getAttribute("type"),
              label: element.getAttribute("aria-label"),
            })),
          };
        }),
      [beforeHtml, afterHtml],
    );
    expect(signatures[1], `unchanged content and markup on ${path}`).toEqual(signatures[0]);
  }
});

test("support pages have complete metadata and correct indexing for their host", async ({
  page,
  baseURL,
}) => {
  const preview = new URL(baseURL!).hostname.endsWith(".pages.dev");
  for (const path of [
    "/pages/contact",
    "/pages/shipping",
    "/pages/returns",
    "/pages/privacy",
    "/terms",
    "/faq",
    "/about",
  ]) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const headers = response!.headers();
    if (preview) expect(headers["x-robots-tag"]).toContain("noindex");
    else expect(headers["x-robots-tag"] || "").not.toContain("noindex");
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S.{30,}/);
    if (!preview) {
      for (const value of await page
        .locator('meta[name="robots"], meta[name="googlebot"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("content"))))
        expect(value).not.toContain("noindex");
    }
  }
});
