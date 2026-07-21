import { expect, test } from "@playwright/test";

test.describe("focused homepage studio", () => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL,
    "The studio harness runs against the Vite dev server.",
  );
  test.skip(({ isMobile }) => isMobile, "The admin studio requires a desktop-sized workspace.");

  test.beforeEach(async ({ page }) => {
    const harness = `${process.cwd().replaceAll("\\", "/")}/work/studio-harness.html`;
    await page.goto(`/@fs/${harness}`);
    await expect(page.getByText("Homepage banners", { exact: true })).toBeVisible();
  });

  test("uses the Figma panel model and protects the coded middle", async ({ page }) => {
    await expect(page.getByRole("button", { name: "File", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Assets", exact: true })).toBeVisible();
    await expect(page.getByText("Original storefront", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Collections through Honey are locked", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("After Honey", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Design", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prototype", exact: true })).toBeVisible();
    const storefront = page.frameLocator('iframe[title="desktop storefront preview"]');
    await expect(storefront.locator("#honey")).toBeAttached();
    await expect(storefront.locator("footer")).toBeAttached();

    const frameHeight = await storefront.locator("body").evaluate((body) => body.scrollHeight);
    expect(frameHeight).toBeGreaterThan(4000);
    const canScroll = await storefront
      .locator("body")
      .evaluate((body) => body.scrollHeight > body.ownerDocument.defaultView!.innerHeight);
    expect(canScroll).toBe(true);

    const toolbar = page.getByRole("navigation", { name: "Editor tools" });
    const box = await toolbar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThan((page.viewportSize()?.height ?? 800) - 100);
  });

  test("selects, resizes, edits text, and enters image crop mode", async ({ page }) => {
    await page.getByRole("button", { name: /Title/ }).first().click();
    const storefront = page.frameLocator('iframe[title="desktop storefront preview"]');
    expect(await storefront.locator(".moveable-control").count()).toBeGreaterThanOrEqual(8);

    const title = storefront.locator('.studio-edit-surface [data-banner-layer="title"]');
    await title.dblclick({ force: true });
    await expect(title.locator('[contenteditable="true"]')).toBeVisible();

    await page.getByRole("button", { name: /Product image/ }).click();
    const image = storefront.locator('.studio-edit-surface [data-banner-layer="foreground"]');
    await image.dblclick({ force: true });
    await expect(storefront.locator(".studio-crop-label")).toBeVisible();
    await expect(page.getByRole("button", { name: "Done cropping" })).toBeVisible();
    await expect(page.getByText("Crop X", { exact: true })).toBeVisible();
    await expect(page.getByText("Zoom", { exact: true }).last()).toBeVisible();
  });

  test("adds only supported sections after Honey", async ({ page }) => {
    await page.getByRole("button", { name: "Add section", exact: true }).click();
    await page.getByRole("button", { name: /Banner left/ }).click();
    await expect(page.getByText("NEW COLLECTION", { exact: true }).first()).toBeVisible();
    await expect(page.locator('select:has(option[value="banner-left"])')).toHaveValue(
      "banner-left",
    );
    await expect(page.getByText("Original storefront", { exact: true })).toBeVisible();
    const storefront = page.frameLocator('iframe[title="desktop storefront preview"]');
    await expect(storefront.locator(".studio-edit-surface")).toBeVisible();
    await expect
      .poll(() =>
        storefront.locator("body").evaluate((body) => body.ownerDocument.defaultView!.scrollY),
      )
      .toBeGreaterThan(2500);
  });
});
