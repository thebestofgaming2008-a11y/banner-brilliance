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
  const catalogResponse = await page.request.get("/api/catalog/products");
  expect(catalogResponse.ok()).toBeTruthy();
  expect((await catalogResponse.json()).length).toBeGreaterThanOrEqual(8);

  await page.goto("/");
  await expect(page.getByRole("img", { name: "Fawzaan" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "SHOP ALL" })).toBeVisible();
  await expect(page.getByText("Yemeni Shemagh", { exact: true }).first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("shop product cart and checkout path uses the live product", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/shop");
  await expect(page.getByText("8 products", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: /Yemeni Shemagh/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/products\/yemeni-shemagh$/);
  await expect(page.getByRole("heading", { name: "Yemeni Shemagh" })).toBeVisible();
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

test("account, tracking lookup, and admin entry render", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "SIGN IN" })).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await page.goto("/order/FZ-TEST");
  await expect(page.getByRole("heading", { name: "TRACK FZ-TEST" })).toBeVisible();

  await page.goto("/admin");
  await expect(page.locator("body")).toContainText(/Admin|Dashboard|Sign in/i);
  expect(errors).toEqual([]);
});
