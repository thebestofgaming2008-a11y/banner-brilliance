import { expect, test } from "@playwright/test";

test("information pages expose readable content, canonical URLs and matching breadcrumbs", async ({
  page,
}) => {
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
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://officialfawzaanstore.com${path}`,
    );
    const schemas = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).flatMap((value) => {
      const json = JSON.parse(value);
      return json["@graph"] || [json];
    });
    const breadcrumb = schemas.find((value) => value["@type"] === "BreadcrumbList");
    expect(breadcrumb.itemListElement[1].item).toBe(`https://officialfawzaanstore.com${path}`);
    await expect(page.getByRole("navigation", { name: "Breadcrumb", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), path).toBe(
      false,
    );
  }
});

test("all FAQ answers are available without JavaScript and native disclosure works", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/faq`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("details")).toHaveCount(9);
  await expect(page.locator("details p")).toHaveCount(9);
  const question = page.locator("details").filter({ hasText: "Do you ship internationally?" });
  await question.locator("summary").click();
  await expect(question.locator("p")).toBeVisible();
  await expect(question.locator("p")).toContainText("WhatsApp");
  const schema = (await page.locator('script[type="application/ld+json"]').allTextContents())
    .map(JSON.parse)
    .find((value) => value.mainEntity);
  for (const item of schema.mainEntity)
    expect(await page.locator("details").allTextContents()).toEqual(
      expect.arrayContaining([expect.stringContaining(item.acceptedAnswer.text)]),
    );
  await context.close();
});

test("contact form prepares the message without claiming delivery", async ({ page }) => {
  let outgoing = "";
  // Intercept locally: this test never opens WhatsApp or contacts the store.
  await page.route("https://wa.me/**", async (route) => {
    outgoing = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<p>Local test interception</p>",
    });
  });
  await page.goto("/pages/contact");
  await expect(page.getByText("Message received", { exact: true })).toHaveCount(0);
  await page.getByLabel("Name", { exact: true }).fill("Local test");
  await page.getByLabel("Email", { exact: true }).fill("test@example.invalid");
  await page.getByLabel("Message", { exact: true }).fill("Local-only form check");
  await page.getByRole("button", { name: "Continue to WhatsApp" }).click();
  await expect.poll(() => outgoing).toContain("wa.me/");
  expect(new URL(outgoing).searchParams.get("text")).toContain("Local-only form check");
});
