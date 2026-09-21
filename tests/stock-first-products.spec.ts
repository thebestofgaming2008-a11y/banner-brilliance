import { expect, test } from "@playwright/test";

for (const path of ["/", "/shop"]) {
  test(`${path} defaults to available Saudi shemagh first and keeps explicit price sorting`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const catalogResponse = await page.request.get("/api/catalog/products");
    expect(catalogResponse.ok()).toBeTruthy();
    const catalog = (await catalogResponse.json()) as Array<{
      slug: string;
      price: number;
      price_inr?: number;
      sale_price?: number | null;
      sale_price_inr?: number | null;
      stock_quantity?: number;
      in_stock?: boolean;
    }>;
    const bySlug = new Map(catalog.map((product) => [product.slug, product]));
    const available = (slug: string) => {
      const product = bySlug.get(slug)!;
      expect(product, slug).toBeTruthy();
      return product.in_stock !== false && Number(product.stock_quantity ?? 0) > 0;
    };
    const selector = path === "/" ? "#shop-all article.product-card" : "article.store-product-card";
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const cards = page.locator(selector);
    const slugs = () =>
      cards.evaluateAll((nodes) =>
        nodes.map((node) =>
          node
            .querySelector('a[href^="/products/"]')!
            .getAttribute("href")!
            .slice("/products/".length),
        ),
      );
    await expect(cards).toHaveCount(catalog.length);
    const assertFeatured = (items: string[]) => {
      if (items.includes("saudi-red-shemagh") && available("saudi-red-shemagh"))
        expect(items[0]).toBe("saudi-red-shemagh");
      const statuses = items.map((slug) => Number(!available(slug)));
      expect(statuses).toEqual([...statuses].sort());
    };
    assertFeatured(await slugs());
    // Check the first HTML response too, not just the hydrated browser order.
    const serverSlugs = await page.evaluate(
      ({ html, selector }) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        return [...doc.querySelectorAll(selector)].map((node) =>
          node
            .querySelector('a[href^="/products/"]')!
            .getAttribute("href")!
            .slice("/products/".length),
        );
      },
      { html: await response!.text(), selector },
    );
    expect(serverSlugs).toEqual(await slugs());
    const sort = page.getByRole("combobox", {
      name: path === "/" ? "Sort homepage products" : "Sort products",
      exact: true,
    });
    for (const order of ["price-low", "price-high"]) {
      await sort.selectOption(order);
      const prices = (await slugs()).map((slug) => {
        const product = bySlug.get(slug)!;
        const regular = Number(product.price_inr ?? product.price);
        const sale = Number(product.sale_price_inr ?? product.sale_price ?? 0);
        return sale > 0 && sale < regular ? sale : regular;
      });
      expect(prices).toEqual([...prices].sort((a, b) => (order === "price-low" ? a - b : b - a)));
    }
    await sort.selectOption("featured");
    assertFeatured(await slugs());
    await page.getByRole("tab", { name: /^shemaghs$/i }).click();
    await expect(cards).toHaveCount(2);
    expect(await slugs()).toEqual(["saudi-red-shemagh", "yemeni-shemagh"]);
    expect(errors).toEqual([]);
  });
}
