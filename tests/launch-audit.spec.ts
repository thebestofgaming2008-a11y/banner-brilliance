import { expect, test } from "@playwright/test";

test("crawler metadata, structured data, sitemap and private indexing rules", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("Fawzaan Store | Shemaghs, Niqabs, Kufis & More");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://fawzaanstore.pages.dev/",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://fawzaanstore.pages.dev/og-image-v2.jpg",
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/fawzaan-logo.png");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/fawzaan-logo.png",
  );
  const homeSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const parsedHomeSchemas = homeSchemas.map((value) => JSON.parse(value));
  expect(parsedHomeSchemas.map((value) => value["@type"])).toEqual(
    expect.arrayContaining(["OnlineStore", "WebSite"]),
  );
  expect(parsedHomeSchemas.find((value) => value["@type"] === "OnlineStore")?.logo).toBe(
    "https://fawzaanstore.pages.dev/fawzaan-logo.png",
  );
  const logo = await request.get("/fawzaan-logo.png");
  expect(logo.ok()).toBeTruthy();
  expect(logo.headers()["content-type"]).toBe("image/png");

  await page.goto("/products/makkah-gloves", { waitUntil: "domcontentloaded" });
  const productSchemas = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  ).map((value) => JSON.parse(value));
  const product = productSchemas.find((value) => value["@type"] === "Product");
  expect(product?.name).toBe("Makkah gloves");
  expect(product?.offers?.priceCurrency).toBe("INR");
  expect(product?.offers?.availability).toBe("https://schema.org/InStock");
  expect(product?.aggregateRating).toBeUndefined();
  expect(await page.locator("body").innerText()).not.toContain("1240");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const sitemapXml = await sitemap.text();
  expect(sitemapXml).toContain("/products/yemeni-shemagh");
  expect(sitemapXml).not.toContain("<loc>https://fawzaanstore.pages.dev/men</loc>");
  expect(sitemapXml).not.toContain("<loc>https://fawzaanstore.pages.dev/women</loc>");
  expect(sitemapXml).not.toContain("<loc>https://fawzaanstore.pages.dev/privacy</loc>");

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("https://fawzaanstore.pages.dev/sitemap.xml");
  const account = await request.get("/account");
  expect(account.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});

test("home page launch performance snapshot", async ({ page }) => {
  await page.addInitScript(() => {
    const values = { lcp: 0, cls: 0 };
    Object.defineProperty(window, "__launchVitals", { value: values, configurable: true });
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      values.lcp = entries.at(-1)?.startTime ?? values.lcp;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<
        PerformanceEntry & { value: number; hadRecentInput: boolean }
      >) {
        if (!entry.hadRecentInput) values.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1_000);
  const snapshot = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const vitals = (window as typeof window & { __launchVitals: { lcp: number; cls: number } })
      .__launchVitals;
    return {
      lcpMs: Math.round(vitals.lcp),
      cls: Number(vitals.cls.toFixed(4)),
      ttfbMs: Math.round(navigation.responseStart),
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      transferredKb: Math.round(
        resources.reduce((total, entry) => total + entry.transferSize, 0) / 1024,
      ),
      resourceCount: resources.length,
      largestResources: resources
        .map((entry) => ({
          name: entry.name.replace(window.location.origin, ""),
          kb: Math.round(entry.transferSize / 1024),
        }))
        .sort((left, right) => right.kb - left.kb)
        .slice(0, 10),
    };
  });
  console.log(`LAUNCH_PERFORMANCE ${JSON.stringify(snapshot)}`);
  expect(snapshot.lcpMs).toBeLessThan(5_000);
  expect(snapshot.cls).toBeLessThan(0.1);
  expect(snapshot.transferredKb).toBeLessThan(5_000);
});
