import { expect, test, type Page } from "@playwright/test";

function watchPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("home and live catalog render without browser errors", async ({ page }) => {
  const errors = watchPageErrors(page);
  await expect
    .poll(async () => (await page.request.get("/api/catalog/products")).ok())
    .toBeTruthy();
  const catalogResponse = await page.request.get("/api/catalog/products");
  expect(catalogResponse.ok()).toBeTruthy();
  const catalog = (await catalogResponse.json()) as Array<{
    category_id?: string;
    tags?: string[];
  }>;
  expect(catalog.length).toBeGreaterThanOrEqual(8);
  const presentationResponse = await page.request.get(
    `/api/catalog/presentation?test=${Date.now()}`,
  );
  expect(presentationResponse.ok()).toBeTruthy();
  const presentation = (await presentationResponse.json()) as {
    taxonomy: Array<{ slug: string; name: string; type: string }>;
  };
  expect(
    presentation.taxonomy.filter((item) => item.type === "filter").map((item) => item.slug),
  ).not.toEqual(expect.arrayContaining(["unisex", "bestseller", "new", "limited"]));
  expect(presentation.taxonomy.map((item) => item.slug)).not.toContain("test");
  expect(presentation.taxonomy.map((item) => item.slug)).not.toContain("testy");
  expect(presentation.taxonomy.map((item) => item.slug)).toContain("other");
  expect(catalog.some((product) => product.tags?.includes("test"))).toBeFalsy();

  await page.goto("/");
  await expect(page.getByRole("img", { name: "Fawzaan" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "SHOP ALL" })).toBeVisible();
  const managedFilter = presentation.taxonomy.find((item) => item.type === "filter");
  if (managedFilter) {
    const filterTab = page.getByRole("tab", { name: managedFilter.name, exact: true });
    await expect(filterTab).toBeVisible();
    await filterTab.click();
    await expect(page.locator("#shop-all a.product-card")).toHaveCount(
      catalog.filter((product) => product.tags?.includes(managedFilter.slug)).length,
    );
    await page.getByRole("tab", { name: "All", exact: true }).click();
  }
  await expect(page.getByText("Yemeni Shemagh", { exact: true }).first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("shop product cart and checkout path uses the live product", async ({ page }) => {
  const errors = watchPageErrors(page);
  await expect
    .poll(async () => (await page.request.get("/api/catalog/products")).ok())
    .toBeTruthy();
  const catalogResponse = await page.request.get("/api/catalog/products");
  expect(catalogResponse.ok()).toBeTruthy();
  const products = (await catalogResponse.json()) as Array<{ slug: string }>;
  await page.goto("/shop");
  await expect(page.getByText(/^\d+ products$/).first()).toBeVisible();
  await page
    .getByRole("link", { name: /Yemeni Shemagh/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/products\/yemeni-shemagh$/);
  await expect(page.getByRole("heading", { name: "Yemeni Shemagh", exact: true })).toBeVisible();
  await expect(page.locator("main img, section img").first()).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).last().click();
  await page.goto("/cart");
  await expect(
    page.getByRole("article").getByText("Yemeni Shemagh", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Delivery details" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile shop controls scroll and menu search filters the live catalog", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop");

  const tabs = page.getByRole("tablist", { name: "Product collections" });
  await expect(tabs.getByRole("tab", { name: "Watches" })).toBeVisible();
  expect(await tabs.evaluate((element) => element.scrollWidth > element.clientWidth)).toBeTruthy();
  await tabs.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await page.getByRole("button", { name: "More collections" }).click();
  await expect.poll(() => tabs.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await expect(page.getByLabel("Sort products")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bestsellers" })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();

  await page.getByRole("button", { name: "Open menu" }).click();
  const menuSearch = page.getByRole("searchbox", { name: "Search products" });
  await menuSearch.fill("honey");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/shop\?q=honey$/);
  await expect(page.locator("article.store-product-card")).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("account, tracking lookup, and admin entry render", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "SIGN IN" })).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await page.goto("/order/FZ-TEST");
  await expect(page.getByRole("heading", { name: "TRACK FZ-TEST" })).toBeVisible();

  await page.goto("/admin");
  await expect(page.locator("body")).toContainText(/Admin|Dashboard|Sign in/i);
  await expect(page.getByText("Organize shop", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Product placement", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Shipping", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Settings", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("payment endpoints reject client-trusted legacy requests", async ({ request }) => {
  const createResponse = await request.post("/api/create-order", {
    data: { amount: 100, currency: "INR", receipt: "unsafe-client-total" },
  });
  expect(createResponse.status()).toBe(400);

  const verifyResponse = await request.post("/api/verify-payment", {
    data: {
      razorpay_order_id: "order_fake",
      razorpay_payment_id: "pay_fake",
      razorpay_signature: "fake",
    },
  });
  expect(verifyResponse.status()).toBe(400);
});
