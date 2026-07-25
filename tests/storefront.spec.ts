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
  const hero = page.getByTestId("hero-slider");
  await expect(hero).toHaveCSS("background-image", /linear-gradient/);
  await expect(hero).toHaveCSS("touch-action", "pan-y");
  const heroBox = await hero.boundingBox();
  expect(heroBox).not.toBeNull();
  if (heroBox) {
    const pointerY = heroBox.y + Math.min(240, heroBox.height / 2);
    await page.mouse.move(heroBox.x + heroBox.width * 0.72, pointerY);
    await page.mouse.down();
    await page.mouse.move(heroBox.x + heroBox.width * 0.28, pointerY, { steps: 8 });
    await page.mouse.up();
    await expect(hero.getByRole("button", { name: "Show AS-SALIHAAT SET" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page).toHaveURL(/\/$/);
  }
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
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    slug: string;
    stock_quantity?: number;
    is_active?: boolean;
  }>;
  const inStockProduct = catalog.find(
    (product) => product.is_active !== false && Number(product.stock_quantity ?? 0) > 0,
  );
  expect(inStockProduct, "The live catalog needs at least one in-stock product").toBeTruthy();
  await page.goto("/shop", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByText(/^\d+ products$/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "THE FAWZAAN EDIT" })).toHaveCount(0);
  const productLink = page
    .locator(`article.store-product-card a[href="/products/${inStockProduct!.slug}"]`)
    .first();
  await expect(productLink).toBeVisible();
  const href = await productLink.getAttribute("href");
  const selectedSlug = href?.split("/products/")[1] ?? "";
  const productName = (await productLink.locator("img").getAttribute("alt")) ?? "";
  expect(selectedSlug).not.toBe("");
  expect(productName).not.toBe("");
  await productLink.click();
  await expect(page).toHaveURL(new RegExp(`/products/${selectedSlug}$`));
  await expect(page.getByRole("heading", { name: productName, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: productName, exact: true })).toHaveCSS(
    "font-family",
    /Cormorant Garamond/,
  );
  await expect(page.locator("main img, section img").first()).toBeVisible();
  const addToCartButton = page.getByRole("button", { name: "Add to cart" }).first();
  await expect(addToCartButton).toHaveCSS("color", "rgb(255, 255, 255)");
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
  const promotionCode = page.getByLabel("Promotion code");
  await expect(promotionCode).toBeVisible();
  await promotionCode.fill("not-a-real-code");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("Promotion code not found.")).toBeVisible();
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

test("product feature rows use readable Poppins typography", async ({ page }) => {
  await page.goto("/products/kashmir-acacia-honey", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const featureCopy = page.locator(".product-feature-copy").first();
  await expect(featureCopy).toBeVisible();
  await expect(featureCopy).toHaveCSS("font-family", /Poppins/);
  await expect(featureCopy).toHaveCSS("font-weight", "400");
  await expect(featureCopy).toHaveCSS("line-height", "21.7px");
  const reviewsHeading = page.getByRole("heading", { name: "Reviews", exact: true });
  await expect(reviewsHeading).toHaveCSS("font-family", /Poppins/);
  await expect(reviewsHeading).toHaveCSS("font-weight", "700");
});

test("product choices remain attached to the cart line", async ({ page }) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    slug: string;
    stock_quantity?: number;
    is_active?: boolean;
    color_options?: string[];
    size_options?: string[];
  }>;
  const product = catalog.find(
    (item) =>
      item.is_active !== false &&
      Number(item.stock_quantity ?? 0) > 0 &&
      Boolean(item.color_options?.length || item.size_options?.length),
  );
  expect(product, "The live catalog needs an in-stock product with customer choices").toBeTruthy();

  await page.goto(`/products/${product!.slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const selectedValues: string[] = [];
  for (const [name, values] of [
    ["colour", product!.color_options],
    ["size", product!.size_options],
  ] as const) {
    if (!values?.length) continue;
    const value = values.at(-1)!;
    await page
      .getByRole("group", { name: `Select ${name}` })
      .getByRole("button", { name: value })
      .click();
    selectedValues.push(value);
  }

  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.goto("/cart");
  await expect(
    page.getByRole("article").getByText(selectedValues.join(" / "), { exact: true }),
  ).toBeVisible();
});

test("yemeni shemagh includes red as a colour option", async ({ page }) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    slug: string;
    color_options?: string[];
    size_options?: string[];
  }>;
  const product = catalog.find((item) => item.slug === "yemeni-shemagh");
  expect(product, "Yemeni Shemagh must stay in the live catalog").toBeTruthy();
  expect(product!.color_options).toEqual(expect.arrayContaining(["Red"]));
  expect(product!.size_options).toEqual(expect.arrayContaining(["60 x 60 cm"]));

  await page.goto("/products/yemeni-shemagh", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(
    page.getByRole("group", { name: "Select colour" }).getByRole("button", { name: "Red" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Select size" }).getByRole("button", { name: "60 x 60 cm" }),
  ).toBeVisible();
});

test("white kufi has one white colour and a fixed free size", async ({ page }) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    slug: string;
    color_options?: string[];
    size_options?: string[];
  }>;
  const product = catalog.find((item) => item.slug === "white-kufi");
  expect(product, "White Woven Kufi must stay in the live catalog").toBeTruthy();
  expect(product!.color_options).toEqual(["White"]);
  expect(product!.size_options).toEqual(["Free Size"]);

  await page.goto("/products/white-kufi", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(
    page.getByRole("group", { name: "Select colour" }).getByRole("button", { name: "White" }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "Select size" })).toHaveCount(0);
  await expect(page.getByText("Free Size", { exact: true })).toBeVisible();
});

test("khadija niqab presents the corrected comfort, colour, and size details", async ({ page }) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    slug: string;
    short_description?: string;
    highlights?: string[];
    color_options?: string[];
    size_options?: string[];
  }>;
  const product = catalog.find((item) => item.slug === "khadija-niqab");
  expect(product, "Khadija Niqab must stay in the live catalog").toBeTruthy();
  expect(product!.short_description).toBe("Daily comfort wear.");
  expect(product!.highlights).toEqual(["Premium chiffon fabric"]);
  expect(product!.color_options).toEqual(["Black"]);
  expect(product!.size_options).toEqual([
    "One Size - Layers: 54 / 34 in; Veil: 22.5 x 13.5 in; Gear: 82 in",
  ]);

  await page.goto("/products/khadija-niqab", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.getByText("Daily comfort wear.", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Select colour" }).getByRole("button", { name: "Black" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Select size" }).getByRole("button", {
      name: "One Size - Layers: 54 / 34 in; Veil: 22.5 x 13.5 in; Gear: 82 in",
    }),
  ).toBeVisible();
  await expect(page.getByText("Premium chiffon fabric", { exact: true })).toBeVisible();
  await expect(page.getByText("Adjustable elastic band", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Onyx Black", { exact: true })).toHaveCount(0);
});

test("stale generated product media falls back to a stable catalog image", async ({ page }) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    slug: string;
    cover_image_url?: string | null;
  }>;
  const product = catalog.find((item) =>
    /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(item.cover_image_url ?? ""),
  );
  test.skip(!product, "The live catalog has no stale generated product media.");

  await page.goto(`/products/${product!.slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const productImage = page.locator("section figure img").first();
  await expect(productImage).toBeVisible();
  await expect.poll(() => productImage.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
});

test("mobile shop controls scroll and menu search filters the live catalog", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchPageErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded", timeout: 60_000 });

  const tabs = page.getByRole("tablist", { name: "Product collections" });
  await expect(tabs.getByRole("tab").first()).toBeVisible();
  const previousCollections = page.getByRole("button", { name: "Previous collections" });
  const moreCollections = page.getByRole("button", { name: "More collections" });
  const [previousBox, tabsBox, moreBox] = await Promise.all([
    previousCollections.boundingBox(),
    tabs.boundingBox(),
    moreCollections.boundingBox(),
  ]);
  expect(previousBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  expect(moreBox).not.toBeNull();
  expect(Math.abs(previousBox!.y - tabsBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(moreBox!.y - tabsBox!.y)).toBeLessThanOrEqual(1);
  expect(previousBox!.x + previousBox!.width).toBeLessThanOrEqual(tabsBox!.x);
  expect(moreBox!.x).toBeGreaterThanOrEqual(tabsBox!.x + tabsBox!.width);
  const searchControl = page.locator(".store-toolbar-control input").first();
  const searchBox = await searchControl.boundingBox();
  expect(searchBox).not.toBeNull();
  expect(searchBox!.y).toBeGreaterThan(previousBox!.y + previousBox!.height);
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
  const collectionFilter = page.getByLabel("Filter products by collection");
  await expect(collectionFilter).toBeVisible();
  const filterOptions = await collectionFilter.locator("option").allTextContents();
  expect(filterOptions).toContain("All products");
  const selectableCollection = collectionFilter.locator("option").nth(1);
  if ((await selectableCollection.count()) > 0) {
    const collectionSlug = (await selectableCollection.getAttribute("value"))!;
    const collectionName = (await selectableCollection.textContent())!.trim();
    await collectionFilter.selectOption(collectionSlug);
    await expect(collectionFilter).toHaveValue(collectionSlug);
    await expect(page.getByRole("tab", { name: collectionName, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
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
  await expect(storeMenu.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(storeMenu.getByRole("link", { name: "Shop all", exact: true })).toHaveCSS(
    "font-family",
    /Cormorant Garamond/,
  );
  await expect(storeMenu.getByRole("link", { name: "Shop all", exact: true })).toHaveCSS(
    "font-weight",
    "500",
  );
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

test("storefront motion respects reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shop", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const firstCard = page.locator("article.store-product-card").first();
  await firstCard.scrollIntoViewIfNeeded();
  await expect(firstCard).toBeVisible();
  await expect
    .poll(() => firstCard.evaluate((element) => getComputedStyle(element).transitionDuration))
    .toBe("0s");
  await expect
    .poll(() => firstCard.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
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

  const crossOriginResponse = await request.post("/api/create-order", {
    headers: { origin: "https://example.invalid" },
    data: { cart: [], customer: {} },
  });
  expect(crossOriginResponse.status()).toBe(403);
});

test("guest cart storage rejects malformed values and clamps quantities", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "fawzaan-cart-v2",
      JSON.stringify([
        {
          id: "valid-line",
          slug: "yemeni-shemagh",
          name: "Stored product",
          price: 100,
          img: "/fawzaan-logo.png",
          qty: 500,
        },
        {
          id: "invalid-line",
          name: "Invalid product",
          price: -500,
          img: "",
          qty: -3,
        },
      ]),
    );
  });
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "SHOPPING CART" })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article").getByText("99", { exact: true })).toBeVisible();
  await expect(page.getByText("Invalid product")).toHaveCount(0);
});
