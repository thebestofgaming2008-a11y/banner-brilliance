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
  const homeResponse = await page.request.get("/");
  expect(homeResponse.ok()).toBeTruthy();
  expect(homeResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(homeResponse.headers()["x-frame-options"]).toBe("DENY");
  expect(homeResponse.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");

  const ratesResponse = await page.request.get("/api/rates");
  expect(ratesResponse.ok()).toBeTruthy();
  const rates = (await ratesResponse.json()) as {
    source: string;
    rates: Record<string, number>;
  };
  expect(["exchangerate-api.com", "open.er-api.com"]).toContain(rates.source);
  expect(rates.rates.USD).toBeGreaterThan(0);

  await expect
    .poll(async () => (await page.request.get("/api/catalog/products")).ok())
    .toBeTruthy();
  const catalogResponse = await page.request.get("/api/catalog/products");
  expect(catalogResponse.ok()).toBeTruthy();
  const catalog = (await catalogResponse.json()) as Array<{
    name: string;
    slug: string;
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
  await expect(page.locator("#shop-all a.product-card").first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("shop product cart and checkout path uses the live product", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/shop", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByText(/^\d+ products$/).first()).toBeVisible();
  const productLink = page.locator('article.store-product-card a[href^="/products/"]').first();
  await expect(productLink).toBeVisible();
  const href = await productLink.getAttribute("href");
  const selectedSlug = href?.split("/products/")[1] ?? "";
  const productName = (await productLink.locator("img").getAttribute("alt")) ?? "";
  expect(selectedSlug).not.toBe("");
  expect(productName).not.toBe("");
  await productLink.click();
  await expect(page).toHaveURL(new RegExp(`/products/${selectedSlug}$`));
  await expect(page.getByRole("heading", { name: productName, exact: true })).toBeVisible();
  await expect(page.locator("main img, section img").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "YOU MAY ALSO LIKE" })).toBeVisible();
  const relatedProducts = page.locator(
    '[data-testid="related-products-section"] article.store-product-card',
  );
  await expect(relatedProducts.first()).toBeVisible();
  expect(await relatedProducts.count()).toBeLessThanOrEqual(4);
  const firstRecommendation = page
    .locator('[data-testid="related-products-section"] article.store-product-card')
    .first();
  await expect(firstRecommendation).toBeVisible();
  await expect(firstRecommendation.locator("img")).toBeVisible();
  await expect(firstRecommendation.locator("h3")).not.toBeEmpty();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.goto("/cart");
  await expect(page.getByRole("article").getByText(productName, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Delivery details" })).toBeVisible();
  const countryButton = page.getByRole("button", { name: /^Country:/ });
  await countryButton.click();
  const countrySearch = page.getByRole("searchbox", { name: "Search countries" });
  await countrySearch.fill("United States");
  await expect(page.getByRole("option", { name: /United States/ })).toBeVisible();
  await countrySearch.fill("Pakistan");
  await expect(page.getByRole("option", { name: /Pakistan/ })).toHaveCount(0);
  await countrySearch.fill("Israel");
  await expect(page.getByRole("option", { name: /Israel/ })).toHaveCount(0);
  await countrySearch.fill("United States");
  await page.getByRole("option", { name: /United States/ }).click();
  await expect(countryButton).toHaveAccessibleName("Country: United States");
  expect(errors).toEqual([]);
});

test("mobile shop controls scroll and menu search filters the live catalog", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchPageErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded", timeout: 60_000 });

  const tabs = page.getByRole("tablist", { name: "Product collections" });
  await expect(tabs.getByRole("tab").first()).toBeVisible();
  const collectionsOverflow = await tabs.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  if (collectionsOverflow) {
    await tabs.evaluate((element) => {
      element.scrollLeft = 0;
    });
    await page.getByRole("button", { name: "More collections" }).click();
    await expect.poll(() => tabs.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }

  await expect(page.getByLabel("Sort products")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bestsellers" })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();

  const storeMenu = page.getByRole("dialog", { name: "Store menu", includeHidden: true });
  const openMenu = page.getByRole("button", { name: "Open menu" });
  await expect(async () => {
    if ((await storeMenu.getAttribute("aria-hidden")) !== "false") await openMenu.click();
    await expect(storeMenu).toHaveAttribute("aria-hidden", "false");
  }).toPass({ timeout: 30_000 });
  const currencyButton = storeMenu.getByRole("button", { name: /^Currency:/ });
  await currencyButton.click();
  const currencySearch = storeMenu.getByRole("searchbox", { name: "Search currencies" });
  await currencySearch.fill("Pakistani Rupee");
  await expect(storeMenu.getByRole("option", { name: /PKR/ })).toHaveCount(0);
  await currencySearch.fill("US Dollar");
  await expect(storeMenu.getByRole("option", { name: /USD/ })).toBeVisible();
  await storeMenu.getByRole("option", { name: /USD/ }).click();
  await expect(currencyButton).toHaveAccessibleName("Currency: US Dollar");

  const menuSearch = page.getByRole("searchbox", { name: "Search products" });
  await menuSearch.fill("honey");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/shop\?q=honey$/);
  await expect(page.locator("article.store-product-card").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("account, tracking lookup, and admin entry render", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "SIGN IN" })).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await expect(page.getByRole("heading", { name: "CREATE ACCOUNT" })).toBeVisible();
  await expect(page.getByText(/Email me occasional sales/)).toHaveCount(0);

  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { name: "Sign in to use your wishlist" })).toBeVisible();

  await page.goto("/track-order");
  await expect(page.getByRole("heading", { name: "WHERE IS MY ORDER?" })).toBeVisible();
  await expect(page.getByLabel("Order number")).toBeVisible();
  await expect(page.getByLabel("Checkout email")).toBeVisible();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "SIGN IN" })).toBeVisible();
  await expect(page.getByText("Organize shop", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Product placement", { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-testid="admin-sidebar-navigation"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("support and policy pages match the live checkout model", async ({ page }) => {
  const errors = watchPageErrors(page);
  const routes: Array<[string, RegExp]> = [
    ["/about", /MODEST ESSENTIALS, CLEARLY CHOSEN/i],
    ["/faq", /QUESTIONS AND ANSWERS/i],
    ["/pages/shipping", /^SHIPPING$/i],
    ["/pages/returns", /^RETURNS$/i],
    ["/pages/privacy", /^PRIVACY$/i],
    ["/pages/contact", /CONTACT US/i],
    ["/terms", /Terms & Conditions/i],
    ["/unsubscribe", /STOP OFFER EMAILS/i],
  ];

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBeTruthy();
  }
  await page.goto("/pages/contact");
  await expect(page.getByText("+91 91529 99764")).toBeVisible();
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
