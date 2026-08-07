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

  const ratesResponse = await page.request.get("/api/rates?base=INR&v=2");
  expect(ratesResponse.ok()).toBeTruthy();
  const rates = (await ratesResponse.json()) as {
    source: string;
    rates: Record<string, number>;
  };
  expect(["exchangerate-api.com", "open.er-api.com", "fallback"]).toContain(rates.source);
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
    badge?: string | null;
    cover_image_url?: string | null;
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
  expect(presentation.taxonomy.map((item) => item.slug)).not.toContain("omani");
  expect(presentation.taxonomy.map((item) => item.slug)).toContain("other");
  expect(catalog.some((product) => product.tags?.includes("test"))).toBeFalsy();
  expect(catalog.find((product) => product.slug === "yemini-shemaghs")?.badge).toBe("Pre-order");
  expect(catalog.find((product) => product.slug === "omani-ghutra")?.badge).toBe("Pre-order");
  expect(catalog.find((product) => product.slug === "kashmir-acacia-honey")?.cover_image_url).toBe(
    "https://fawzaanstore.pages.dev/homepage/mosaic-honey.webp",
  );

  await page.goto("/");
  await expect(page.getByRole("img", { name: "Fawzaan" }).first()).toBeVisible();
  const hero = page.getByRole("region", { name: /Featured collections?/ }).first();
  await expect(hero).toBeVisible();
  await expect
    .poll(() =>
      hero.evaluate((element) =>
        [element, ...element.querySelectorAll("*")].some((candidate) =>
          getComputedStyle(candidate).backgroundImage.includes("linear-gradient"),
        ),
      ),
    )
    .toBeTruthy();
  await expect(hero).toHaveCSS("touch-action", "pan-y");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#shop-all").getByRole("heading", { name: "SHOP ALL" })).toBeVisible();
  const managedFilter = presentation.taxonomy.find((item) => item.type === "filter");
  if (managedFilter) {
    const filterTab = page.getByRole("tab", { name: managedFilter.name, exact: true });
    await expect(filterTab).toBeVisible();
    await filterTab.click();
    await expect(page.locator("#shop-all .product-card")).toHaveCount(
      catalog.filter((product) => product.tags?.includes(managedFilter.slug)).length,
    );
    await page.getByRole("tab", { name: "All", exact: true }).click();
  }
  await expect(page.locator("#shop-all .product-card").first()).toBeVisible();
  const mosaic = page.getByTestId("homepage-collection-mosaic");
  await expect(mosaic.locator("[data-mosaic-card]")).toHaveCount(7);
  await expect(mosaic.locator('[data-mosaic-card="SHOP ALL"]')).toHaveAttribute("href", "/shop");
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
    badge?: string | null;
  }>;
  const inStockProduct = catalog.find(
    (product) =>
      product.is_active !== false &&
      Number(product.stock_quantity ?? 0) > 0 &&
      !/^pre[\s-]?order$/i.test(product.badge?.trim() ?? ""),
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
  await expect(page.getByRole("heading", { name: productName, exact: true })).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(page.locator("main img, section img").first()).toBeVisible();
  const addToCartButton = page.getByRole("button", { name: /^add$/i }).first();
  await expect(addToCartButton).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(addToCartButton).toHaveCSS(
    "background-image",
    /linear-gradient\(105deg, rgb\(255, 187, 0\).+rgb\(255, 0, 81\)/,
  );
  await expect(page.getByRole("heading", { name: "YOU MAY ALSO LIKE" })).toHaveCount(0);
  await page.getByRole("button", { name: /^add$/i }).first().click();
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

test("pre-order products use purchase buttons instead of image badges", async ({ page }) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    name: string;
    slug: string;
    badge?: string | null;
  }>;
  const preOrderProduct = catalog.find((product) =>
    /^pre[\s-]?order$/i.test(product.badge?.trim() ?? ""),
  );
  expect(preOrderProduct, "The live catalog needs a pre-order product").toBeTruthy();

  await page.goto("/shop", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const card = page.locator(
    `article.store-product-card:has(a[href="/products/${preOrderProduct!.slug}"])`,
  );
  await expect(card).toBeVisible();
  await expect(card.getByText(/pre[ -]?order/i)).toHaveCount(1);
  await expect(card.locator(".store-product-card__media").getByText(/pre[ -]?order/i)).toHaveCount(
    0,
  );

  await card.locator(`a[href="/products/${preOrderProduct!.slug}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/products/${preOrderProduct!.slug}$`));
  await expect(page.getByRole("button", { name: "Pre order", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "YOU MAY ALSO LIKE" })).toHaveCount(0);
});

test("catalog cards support quick add and expose sold-out stock before navigation", async ({
  page,
}) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    name: string;
    slug: string;
    stock_quantity?: number;
    is_active?: boolean;
  }>;
  const available = catalog.find(
    (product) => product.is_active !== false && Number(product.stock_quantity ?? 0) > 0,
  );
  expect(available, "The live catalog needs an in-stock product for quick add").toBeTruthy();

  await page.goto("/shop", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const availableCard = page
    .locator(`article.store-product-card:has(a[href="/products/${available!.slug}"])`)
    .first();
  await expect(availableCard).toHaveAttribute("data-product-stock", "available");
  const quickAdd = availableCard.getByRole("button", {
    name: /^(Add|Choose options and add):/,
  });
  await expect(quickAdd).toBeEnabled();
  await quickAdd.click();

  const optionDialog = page.getByRole("dialog", { name: available!.name });
  if (await optionDialog.isVisible().catch(() => false)) {
    await optionDialog.getByRole("button", { name: /^add$/i }).click();
  }
  const cart = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(cart).toBeVisible();
  await expect(cart.getByText(available!.name, { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(cart).toBeHidden();

  const soldOut = catalog.find(
    (product) => product.is_active !== false && Number(product.stock_quantity ?? 0) <= 0,
  );
  if (soldOut) {
    const soldOutCard = page
      .locator(`article.store-product-card:has(a[href="/products/${soldOut.slug}"])`)
      .first();
    await expect(soldOutCard).toHaveAttribute("data-product-stock", "sold-out");
    await expect(soldOutCard.locator("span", { hasText: "Sold out" })).toBeVisible();
    await expect(
      soldOutCard.getByRole("button", { name: `Sold out: ${soldOut.name}` }),
    ).toBeDisabled();
  }

  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const homepageAvailableCard = page
    .locator(`#shop-all article.product-card:has(a[href="/products/${available!.slug}"])`)
    .first();
  await expect(homepageAvailableCard).toHaveAttribute("data-product-stock", "available");
  await expect(
    homepageAvailableCard.getByRole("button", { name: /^(Add|Choose options and add):/ }),
  ).toBeEnabled();

  if (soldOut) {
    const homepageSoldOutCard = page
      .locator(`#shop-all article.product-card:has(a[href="/products/${soldOut.slug}"])`)
      .first();
    await expect(homepageSoldOutCard).toHaveAttribute("data-product-stock", "sold-out");
    await expect(
      homepageSoldOutCard.getByRole("button", { name: `Sold out: ${soldOut.name}` }),
    ).toBeDisabled();
  }
});

test("cart drawer opens after an add request, traps focus, and offers a checkout path", async ({
  page,
}) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    id: string;
    slug: string;
    name: string;
    sale_price_inr?: number | null;
    price_inr?: number | null;
    cover_image_url?: string | null;
    stock_quantity?: number;
  }>;
  const product = catalog.find((item) => Number(item.stock_quantity ?? 0) > 0)!;
  await page.addInitScript((item) => {
    localStorage.setItem(
      "fawzaan-cart-v2",
      JSON.stringify([
        {
          id: `${item.slug}__default`,
          productId: item.id,
          slug: item.slug,
          name: item.name,
          price: item.sale_price_inr || item.price_inr || 1,
          img: item.cover_image_url || "",
          qty: 1,
        },
      ]),
    );
  }, product);

  await page.goto("/");
  await page.getByRole("button", { name: "Open cart, 1 item" }).click();
  const drawer = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "Complete your order" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Proceed to checkout" })).toBeVisible();
  const close = drawer.getByRole("button", { name: "Close cart" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(drawer.getByRole("link", { name: "View cart" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await close.click();
  await expect(page.getByRole("button", { name: "Open cart, 1 item" })).toBeFocused();
});

test("oversized live product covers use optimized storefront copies", async ({ page }) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{ slug: string }>;
  test.skip(
    !catalog.some((product) => product.slug === "sabr-watch-black"),
    "The watch is not currently published.",
  );
  await page.goto("/shop");
  const watch = page
    .locator('article.store-product-card a[href="/products/sabr-watch-black"] img')
    .first();
  await expect(watch).toHaveAttribute("src", "/product-media/sabr-watch-black.webp");
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

test("acacia honey consistently presents the unheated product fact", async ({ page }) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  expect(catalogResponse.ok()).toBeTruthy();
  const catalog = (await catalogResponse.json()) as Array<{
    slug: string;
    short_description?: string;
    description?: string;
    highlights?: string[];
  }>;
  const product = catalog.find((item) => item.slug === "kashmir-acacia-honey");
  expect(product).toBeTruthy();
  expect(product!.highlights).toContain("Unheated");
  expect(
    [product!.short_description, product!.description, ...(product!.highlights ?? [])]
      .filter(Boolean)
      .join(" "),
  ).not.toMatch(/slow to crystallise/i);

  await page.goto("/products/kashmir-acacia-honey", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.getByText("Unheated", { exact: true })).toBeVisible();
  await expect(page.getByText(/slow to crystallise/i)).toHaveCount(0);
});

test("product choices remain attached to the cart line", async ({ page }) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{
    slug: string;
    stock_quantity?: number;
    is_active?: boolean;
    badge?: string;
    color_options?: string[];
    size_options?: string[];
  }>;
  const product = catalog.find(
    (item) =>
      item.is_active !== false &&
      Number(item.stock_quantity ?? 0) > 0 &&
      !/^pre[\s-]?order$/i.test(item.badge?.trim() ?? "") &&
      Boolean(
        item.color_options?.length ||
        item.size_options?.some((value) => value.trim().toLowerCase() !== "free size"),
      ),
  );
  expect(product, "The live catalog needs an in-stock product with customer choices").toBeTruthy();

  await page.goto(`/products/${product!.slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle");
  const selectedValues: string[] = [];
  for (const [name, values] of [
    ["colour", product!.color_options],
    ["size", product!.size_options],
  ] as const) {
    if (!values?.length) {
      continue;
    }
    if (values.every((value) => value.trim().toLowerCase() === "free size")) {
      selectedValues.push(values[0]);
      continue;
    }
    const value = values.at(-1)!;
    await page
      .getByRole("group", { name: `Select ${name}` })
      .getByRole("button", { name: value })
      .click();
    selectedValues.push(value);
  }

  await page.getByRole("button", { name: /^add$/i }).first().click();
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
  expect(product!.size_options).toEqual(["Size Dimensions are available in description"]);

  await page.goto("/products/khadija-niqab", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(
    page.getByRole("group", { name: "Select colour" }).getByRole("button", { name: "Black" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Select size" }).getByRole("button", {
      name: "Size Dimensions are available in description",
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
    await expect(async () => {
      await collectionFilter.selectOption(collectionSlug);
      await expect(collectionFilter).toHaveValue(collectionSlug);
      await expect(page.getByRole("tab", { name: collectionName, exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }).toPass({ timeout: 30_000 });
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
    "700",
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

test("homepage shop controls filter, pluralize, and link to the selected collection", async ({
  page,
}) => {
  const catalogResponse = await page.request.get("/api/catalog/products");
  const catalog = (await catalogResponse.json()) as Array<{ category_id?: string }>;
  const shemaghCount = catalog.filter((product) => product.category_id === "shemaghs").length;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByText(/2026 Fawzaan Store\. All rights reserved\./)).toBeVisible();

  const shop = page.locator("#shop-all");
  await expect(shop.getByText("21% off", { exact: true })).toHaveCount(0);
  const kufiCard = shop.locator('article:has(a[href="/products/white-kufi"])');
  await expect(kufiCard.getByText("Kufis", { exact: true })).toBeVisible();
  await expect(kufiCard.getByText("Books", { exact: true })).toHaveCount(0);
  await expect(shop.getByRole("button", { name: "Previous collections" })).toBeVisible();
  await expect(shop.getByRole("button", { name: "More collections" })).toBeVisible();
  await expect(shop.getByPlaceholder("Search products")).toBeVisible();
  await expect(shop.getByLabel("Sort homepage products")).toBeVisible();

  const shemaghsTab = shop.getByRole("tab", { name: "Shemaghs", exact: true });
  await expect(async () => {
    await shemaghsTab.click();
    await expect(shemaghsTab).toHaveAttribute("aria-selected", "true");
  }).toPass({ timeout: 30_000 });
  await expect(
    shop.getByLabel("Filter homepage products by collection").locator("xpath=..").locator("span"),
  ).toHaveText(`${shemaghCount} product${shemaghCount === 1 ? "" : "s"}`);
  await expect(shop.getByRole("link", { name: "Shemaghs", exact: true })).toHaveAttribute(
    "href",
    "/shop?collection=shemaghs",
  );
});

test("empty shop collection messages remain clear and visible after filtering", async ({
  page,
}) => {
  await page.goto("/shop", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle");

  for (const collectionName of ["Watches", "Other"]) {
    const tab = page.getByRole("tab", { name: collectionName, exact: true });
    await expect(async () => {
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
    }).toPass({ timeout: 30_000 });

    const message = page.getByRole("heading", {
      name: `${collectionName} coming soon`,
      exact: true,
    });
    const cards = page.locator("article.store-product-card");

    if (collectionName === "Watches") {
      await expect(cards).toHaveCount(0);
      await expect(message).toBeVisible();
      await page.waitForTimeout(700);
      await expect(message).toBeVisible();
      expect(
        await message.locator("xpath=..").evaluate((element) => getComputedStyle(element).opacity),
      ).toBe("1");
    } else if ((await cards.count()) === 0) {
      await expect(message).toBeVisible();
      await page.waitForTimeout(700);
      await expect(message).toBeVisible();
    } else {
      await expect(message).toHaveCount(0);
    }
  }
});

test("hero preset supplies a responsive conversion lockup", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });

  const firstSlide = page
    .locator('section[aria-label="Featured collection"]')
    .locator("article")
    .first();
  await expect(firstSlide.locator('[data-banner-layer="title"]')).toHaveText(/AL-\s*IKHWAAN SET/);
  await expect(firstSlide.locator('[data-banner-layer="body"]')).toHaveText("LIL-MUSLIMEEN");
  await expect(firstSlide.locator('[data-banner-layer^="ornament-"]')).toHaveCount(0);
  await expect(firstSlide.locator('[data-banner-layer="button"]')).toHaveText(
    "Shop the collection",
  );
  await expect
    .poll(() =>
      firstSlide
        .locator('[data-banner-layer="foreground"] img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(1200);
  await expect
    .poll(() =>
      page
        .locator('section[aria-label="Featured collection"] article')
        .nth(1)
        .locator('[data-banner-layer="foreground"] img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(1200);
  await expect(firstSlide.locator('[data-banner-layer="foreground"]')).toHaveCSS(
    "filter",
    /drop-shadow/,
  );

  const collectionBannerImages = page.locator("#catalog .collection-banner > img");
  await collectionBannerImages.first().scrollIntoViewIfNeeded();
  await expect(collectionBannerImages).toHaveCount(2);
  await expect(collectionBannerImages.first()).toHaveAttribute("src", "/homepage/honey.jpg");
  await expect
    .poll(() =>
      collectionBannerImages.evaluateAll((images: HTMLImageElement[]) =>
        images.map((image) => [image.naturalWidth, image.naturalHeight]),
      ),
    )
    .toEqual([
      [578, 1280],
      [578, 1280],
    ]);
  const collectionBannerBox = await page
    .locator("#catalog .collection-banner")
    .first()
    .boundingBox();
  expect(collectionBannerBox).not.toBeNull();
  expect(collectionBannerBox!.height).toBeGreaterThan(collectionBannerBox!.width);

  const mosaic = page.getByTestId("homepage-collection-mosaic");
  const mosaicCards = mosaic.locator("[data-mosaic-card]");
  await mosaicCards.last().scrollIntoViewIfNeeded();
  await expect(mosaicCards).toHaveCount(7);
  await expect(mosaicCards.first()).toHaveAttribute("data-mosaic-card", "KASHMIR HONEY");
  await expect(mosaicCards.last()).toHaveAttribute("data-mosaic-card", "SHOP ALL");
});

test("hero captions stay inside phone, tablet, zoomed, and desktop viewports", async ({ page }) => {
  const errors = watchPageErrors(page);
  for (const width of [360, 768, 1023, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/?responsive-audit=${width}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const scene = page
      .locator('section[aria-label="Featured collection"] article')
      .first()
      .locator(".homepage-banner-scene");
    await expect(scene).toHaveAttribute(
      "data-scene-viewport",
      width <= 1023 ? "mobile" : "desktop",
    );
    const sceneBox = await scene.boundingBox();
    expect(sceneBox).not.toBeNull();
    const scrim = scene.locator(".hero-mobile-legibility-scrim");
    if (width <= 1023) {
      const scrimBox = await scrim.boundingBox();
      expect(scrimBox).not.toBeNull();
      expect(scrimBox!.x).toBeCloseTo(sceneBox!.x, 0);
      expect(scrimBox!.width).toBeCloseTo(sceneBox!.width, 0);
      const [scrimZIndex, coordinateRootZIndex] = await Promise.all([
        scrim.evaluate((element) => Number.parseInt(window.getComputedStyle(element).zIndex, 10)),
        scene
          .locator("[data-banner-coordinate-root]")
          .evaluate((element) => Number.parseInt(window.getComputedStyle(element).zIndex, 10)),
      ]);
      expect(coordinateRootZIndex).toBeGreaterThan(scrimZIndex);
    } else {
      await expect(scrim).toBeHidden();
    }
    for (const id of ["title", "body", "button"] as const) {
      const layerBox = await scene.locator(`[data-banner-layer="${id}"]`).boundingBox();
      expect(layerBox).not.toBeNull();
      expect(layerBox!.x).toBeGreaterThanOrEqual(sceneBox!.x - 1);
      expect(layerBox!.x + layerBox!.width).toBeLessThanOrEqual(sceneBox!.x + sceneBox!.width + 1);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBeTruthy();
  }
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

  await page.goto("/products/khadija-niqab", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const conversionButton = page.locator(".conversion-nudge").last();
  await conversionButton.evaluate((element) => element.removeAttribute("disabled"));
  await expect
    .poll(() => conversionButton.evaluate((element) => getComputedStyle(element).animationName))
    .toBe("none");
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
  await page.goto("/pages/shipping");
  await expect(
    page.getByText("Clear delivery expectations from dispatch to your door."),
  ).toHaveCount(0);

  await page.goto("/pages/contact");
  await expect(page.getByText("+91 91529 99764")).toBeVisible();
  await expect(page.getByRole("link", { name: "@fawzaan.store" })).toHaveAttribute(
    "href",
    "https://www.instagram.com/fawzaan.store/",
  );
  await expect(page.getByRole("link", { name: "faizk4511@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:faizk4511@gmail.com",
  );
  await expect(page.getByText("Kurla West, Mumbai, Maharashtra 400070")).toBeVisible();
  const whatsappHref = await page
    .getByRole("link", { name: "+91 91529 99764" })
    .getAttribute("href");
  expect(decodeURIComponent(whatsappHref ?? "")).toContain("السلام عليكم ورحمة الله وبركاته");
  expect(decodeURIComponent(whatsappHref ?? "")).toContain(
    "I want to inquire about something related to Fawzaan Store.",
  );

  await page.goto("/pages/returns");
  await expect(
    page.getByText("Eligible unused items must be returned within 5 days of delivery."),
  ).toBeVisible();
  await expect(page.getByText(/same payment method used for the order/i)).toBeVisible();
  await expect(
    page.getByText("A straightforward return process for eligible unused items."),
  ).toHaveCount(0);

  await page.goto("/pages/privacy");
  await expect(page.getByText(/your data is never sold/i)).toBeVisible();

  await page.goto("/terms");
  await expect(
    page.getByText(/By browsing this site, you accept our store policies/i),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "7. Website Content" })).toBeVisible();
  await expect(page.getByText(/does not claim.*registered trademark/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "8. Service Responsibility" })).toBeVisible();
  await expect(
    page.getByText(/consumer right or remedy.*cannot legally be excluded/i),
  ).toBeVisible();
  await expect(page.getByText(/trademark laws/i)).toHaveCount(0);
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
