import { expect, test } from "@playwright/test";

const origin = "https://officialfawzaanstore.com";
const baseline = "https://d3a51789.fawzaanstore.pages.dev";
const facebook = "https://www.facebook.com/p/Fawzaan-Store-61566014024315/";

test("brand identity is consistent and the spelling clarification is visible without JS", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/about`);
    await expect(
      page.getByRole("heading", { name: "Find the official Fawzaan Store" }),
    ).toBeVisible();
    await expect(page.getByText(/If you searched for/)).toContainText("Fawzan Store");
    await expect(
      page.getByRole("link", { name: "officialfawzaanstore.com", exact: true }),
    ).toHaveAttribute("href", `${origin}/`);
    const schemas = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).flatMap((text) => {
      const json = JSON.parse(text);
      return json["@graph"] || [json];
    });
    const store = schemas.find((value) => value["@type"] === "OnlineStore");
    const website = schemas.find((value) => value["@type"] === "WebSite");
    const about = schemas.find((value) => value["@type"] === "AboutPage");
    expect(store.name).toBe("Fawzaan Store");
    expect(website.name).toBe("Fawzaan Store");
    expect(store.alternateName).toEqual([
      "Fawzan Store",
      "Official Fawzaan Store",
      "officialfawzaanstore.com",
    ]);
    expect(website.alternateName).toEqual(store.alternateName);
    expect(store.sameAs).toEqual(["https://www.instagram.com/fawzaan.store/", facebook]);
    expect(about.mainEntity["@id"]).toBe(store["@id"]);
    expect(store["@id"]).toBe(`${origin}/#store`);
    await page.goto(`${baseURL}/pages/contact`);
    await expect(page.getByRole("link", { name: "Fawzaan Store", exact: true })).toHaveAttribute(
      "href",
      facebook,
    );
  } finally {
    await context.close();
  }
});

test("home, shop, product, cart and checkout presentation is unchanged from the stock-order release", async ({
  request,
  page,
}) => {
  for (const path of ["/", "/shop", "/products/saudi-red-shemagh", "/cart", "/checkout"]) {
    const [before, after] = await Promise.all([
      request.get(`${baseline}${path}`),
      request.get(path),
    ]);
    expect(before.status()).toBe(200);
    expect(after.status()).toBe(200);
    const signatures = await page.evaluate(
      (htmls) =>
        htmls.map((html) => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const main = doc.querySelector("main");
          return {
            title: doc.title,
            text: main?.textContent,
            elements: Array.from(main?.querySelectorAll("*") || []).map((element) => ({
              tag: element.tagName,
              classes: element.className,
              href: element.getAttribute("href"),
              src: element.getAttribute("src"),
              alt: element.getAttribute("alt"),
              label: element.getAttribute("aria-label"),
            })),
          };
        }),
      [await before.text(), await after.text()],
    );
    expect(signatures[1], path).toEqual(signatures[0]);
  }
});
