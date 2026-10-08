import { expect, test } from "@playwright/test";

test("crawler metadata, structured data, sitemap and private indexing rules", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("Fawzaan Store | Shemaghs, Niqabs, Kufis & More");
  const pageHeadings = page.locator("h1");
  await expect(pageHeadings).toHaveCount(1);
  await expect(pageHeadings).toContainText("Fawzaan Store");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://officialfawzaanstore.com/",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://officialfawzaanstore.com/og-image-v2.jpg",
  );
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    "href",
    "/favicon-32.png",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/site-v2.webmanifest",
  );
  await expect(page.locator('meta[name="application-name"]')).toHaveAttribute(
    "content",
    "Fawzaan Store",
  );
  const homeSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const parsedHomeSchemas = homeSchemas.map((value) => JSON.parse(value));
  expect(parsedHomeSchemas.map((value) => value["@type"])).toEqual(
    expect.arrayContaining(["OnlineStore", "WebSite"]),
  );
  expect(parsedHomeSchemas.find((value) => value["@type"] === "OnlineStore")?.logo).toBe(
    "https://officialfawzaanstore.com/fawzaan-logo.png",
  );
  const websiteSchema = parsedHomeSchemas.find((value) => value["@type"] === "WebSite");
  expect(websiteSchema).toMatchObject({
    name: "Fawzaan Store",
    alternateName: ["Official Fawzaan Store", "officialfawzaanstore.com"],
    url: "https://officialfawzaanstore.com/",
  });
  const logo = await request.get("/fawzaan-logo.png");
  expect(logo.ok()).toBeTruthy();
  expect(logo.headers()["content-type"]).toBe("image/png");
  for (const iconPath of [
    "/favicon-32.png",
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-maskable-512.png",
  ]) {
    const icon = await request.get(iconPath);
    expect(icon.ok(), `${iconPath} should load`).toBeTruthy();
  }
  const manifest = await request.get("/site-v2.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect(await manifest.json()).toMatchObject({
    icons: expect.arrayContaining([
      expect.objectContaining({ src: "/icon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icon-512.png", sizes: "512x512" }),
      expect.objectContaining({ src: "/icon-maskable-512.png", purpose: "maskable" }),
    ]),
  });
  const indexNowKey = await request.get("/7864d7e0b55641339f02b9d647bcfaad.txt");
  expect(indexNowKey.ok()).toBeTruthy();
  expect((await indexNowKey.text()).trim()).toBe("7864d7e0b55641339f02b9d647bcfaad");

  const catalog = await request.get("/api/catalog/products");
  expect(catalog.ok()).toBeTruthy();
  expect(catalog.headers()["cache-control"]).toBe(
    "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  );
  const presentation = await request.get("/api/catalog/presentation");
  expect(presentation.ok()).toBeTruthy();
  expect(presentation.headers()["cache-control"]).toBe(
    "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  );

  await page.goto("/products/makkah-gloves", { waitUntil: "domcontentloaded" });
  const productSchemas = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  ).map((value) => JSON.parse(value));
  const product = productSchemas.find((value) => value["@type"] === "Product");
  expect(product?.name).toContain("Makkah gloves");
  expect(product?.offers?.priceCurrency).toBe("INR");
  expect(product?.offers?.availability).toBe("https://schema.org/InStock");
  expect(product?.offers?.shippingDetails?.deliveryTime?.handlingTime).toMatchObject({
    minValue: 1,
    maxValue: 2,
    unitCode: "DAY",
  });
  expect(product?.offers?.shippingDetails?.handlingTime).toBeUndefined();
  expect(JSON.stringify(product)).not.toContain("fawzaanstore.pages.dev");
  expect(product?.aggregateRating).toBeUndefined();
  expect(await page.locator("body").innerText()).not.toContain("1240");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const sitemapXml = await sitemap.text();
  expect(sitemapXml).toContain("/products/yemeni-shemagh");
  expect(sitemapXml).not.toContain("fawzaanstore.pages.dev");
  expect(sitemapXml).not.toContain("<loc>https://officialfawzaanstore.com/men</loc>");
  expect(sitemapXml).not.toContain("<loc>https://officialfawzaanstore.com/women</loc>");
  expect(sitemapXml).not.toContain("<loc>https://officialfawzaanstore.com/privacy</loc>");

  const merchantFeed = await request.get("/merchant-feed.xml");
  expect(merchantFeed.ok()).toBeTruthy();
  const merchantFeedXml = await merchantFeed.text();
  expect(merchantFeedXml).toContain("<g:title>");
  expect(merchantFeedXml).toContain("<g:link>https://officialfawzaanstore.com/products/");
  expect(merchantFeedXml).not.toContain("fawzaanstore.pages.dev");

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("https://officialfawzaanstore.com/sitemap.xml");
  const contact = await request.get("/pages/contact");
  expect(contact.headers()["cache-control"]).toContain("no-transform");
  const contactHtml = await contact.text();
  expect(contactHtml).toContain("mailto:");
  expect(contactHtml).not.toContain("/cdn-cgi/l/email-protection");
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
      heroImages: resources
        .map((entry) => entry.name.replace(window.location.origin, ""))
        .filter((name) => name.includes("hero-shemagh")),
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
  expect(snapshot.heroImages).toHaveLength(1);
});
