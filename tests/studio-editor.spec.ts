import { expect, test } from "@playwright/test";

test.describe("fixed-template homepage studio", () => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL,
    "The studio harness runs against the Vite dev server.",
  );
  test.skip(({ isMobile }) => isMobile, "The admin studio requires a desktop-sized workspace.");

  test.beforeEach(async ({ page }) => {
    const harness = `${process.cwd().replaceAll("\\", "/")}/work/studio-harness.html`;
    await page.goto(`/@fs/${harness}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Homepage banners", { exact: true })).toBeVisible();
  });

  test("shows the real scrollable homepage with only structured editing controls", async ({
    page,
  }) => {
    await expect(page.getByRole("button", { name: "File", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Assets", exact: true })).toHaveCount(0);
    const tools = page.getByRole("navigation", { name: "Editor tools" });
    await expect(tools.getByRole("button", { name: "Text", exact: true })).toHaveCount(0);
    await expect(tools.getByRole("button", { name: "Image", exact: true })).toHaveCount(0);
    await expect(page.getByText("Original storefront", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Collections through Honey are locked", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Banner settings" })).toBeVisible();
    await expect(page.locator(".studio-layer-row")).toHaveCount(0);

    const storefront = page.getByRole("region", { name: "desktop storefront preview" });
    await expect(storefront.locator("#honey")).toBeAttached();
    await expect(storefront.locator("footer")).toBeAttached();
    await expect(storefront.getByRole("button", { name: "Add homepage section" })).toBeAttached();
    expect(await storefront.evaluate((frame) => frame.scrollHeight)).toBeGreaterThan(4000);
    expect(await storefront.evaluate((frame) => frame.scrollHeight > frame.clientHeight)).toBe(
      true,
    );

    const title = storefront.locator('[data-editor-active="true"] [data-banner-layer="title"]');
    await title.click({ force: true });
    await expect(storefront.locator(".studio-selection-box")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Banner settings" })).toBeVisible();
  });

  test("edits the fixed hero content, image, gradient and mobile presentation", async ({
    page,
  }) => {
    const inspector = page.getByRole("complementary", { name: "Banner settings" });
    const storefront = page.getByRole("region", { name: "desktop storefront preview" });
    const activeScene = storefront.locator('[data-editor-active="true"]');

    await inspector.getByLabel("Title", { exact: true }).fill("SUMMER COLLECTION");
    await inspector.getByLabel("Subtitle", { exact: true }).fill("A limited seasonal release");
    await inspector.getByLabel("Shop button link", { exact: true }).fill("/shop?collection=summer");
    await expect(activeScene.locator('[data-banner-layer="title"]')).toHaveText(
      "SUMMER COLLECTION",
    );
    await expect(activeScene.locator('[data-banner-layer="body"]')).toHaveText(
      "A limited seasonal release",
    );
    await expect(activeScene.locator('[data-banner-layer="button"]')).toHaveText(
      "Shop the collection",
    );

    await inspector.getByLabel("Product image URL").fill("/homepage/hero-niqab.webp");
    await expect(activeScene.locator('[data-banner-layer="foreground"] img')).toHaveAttribute(
      "src",
      "/homepage/hero-niqab.webp",
    );
    await inspector.getByLabel("Gradient start").fill("#112233");
    await inspector.getByLabel("Gradient end").fill("#445566");
    await expect
      .poll(() =>
        activeScene
          .locator('[data-fill-id="fill-gradient"]')
          .evaluate((element) => getComputedStyle(element).backgroundImage),
      )
      .toContain("rgb(17, 34, 51)");

    await inspector.getByRole("button", { name: "Image", exact: true }).click();
    await inspector.getByLabel("Background image URL").fill("/homepage/hero-shemagh.webp");
    await expect(activeScene.locator('[data-fill-id="fill-image"] img')).toHaveAttribute(
      "src",
      "/homepage/hero-shemagh.webp",
    );

    await page.getByRole("button", { name: "Mobile viewport", exact: true }).click();
    const mobileStorefront = page.getByRole("region", { name: "mobile storefront preview" });
    const mobileScene = mobileStorefront.locator('[data-editor-active="true"]');
    const mobileTitle = mobileScene.locator('[data-banner-layer="title"]');
    const sceneBox = await mobileScene.boundingBox();
    const titleBox = await mobileTitle.boundingBox();
    expect(sceneBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(titleBox!.x).toBeGreaterThanOrEqual(sceneBox!.x - 1);
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(sceneBox!.x + sceneBox!.width + 1);
  });

  test("adds another hero using the same fixed template", async ({ page }) => {
    const heroList = page.locator(".studio-banner-list").first();
    await expect(heroList.locator(":scope > button")).toHaveCount(2);
    await page.getByRole("button", { name: "Add hero banner" }).click();
    await expect(heroList.locator(":scope > button")).toHaveCount(3);

    const inspector = page.getByRole("complementary", { name: "Banner settings" });
    await expect(inspector.getByText("Hero banner", { exact: true })).toBeVisible();
    await expect(inspector.getByLabel("Title", { exact: true })).toHaveValue("NEW COLLECTION 3");
    await expect(inspector.locator("textarea").first()).toHaveValue(
      "Discover the latest collection",
    );
    await expect(
      page
        .getByRole("region", { name: "desktop storefront preview" })
        .locator('[data-editor-active="true"] [data-banner-layer="button"]'),
    ).toHaveText("Shop the collection");
  });

  test("adds only the two supported post-Honey section templates", async ({ page }) => {
    const storefront = page.getByRole("region", { name: "desktop storefront preview" });
    const addButton = storefront.getByRole("button", { name: "Add homepage section" });
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();

    const dialog = page.getByRole("dialog", { name: "Add homepage section" });
    await expect(dialog).toBeVisible();
    const choices = dialog.locator(".studio-template-add-options > button");
    await expect(choices).toHaveCount(2);
    await expect(dialog.getByRole("button", { name: /Banner only/ })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Banner \+ product row/ })).toBeVisible();
    await expect(dialog.getByText(/Banner left|Banner right/)).toHaveCount(0);

    await dialog.getByRole("button", { name: /Banner only/ }).click();
    let inspector = page.getByRole("complementary", { name: "Banner settings" });
    await expect(inspector.getByText("Banner only", { exact: true })).toBeVisible();
    await inspector.getByLabel("Title", { exact: true }).fill("RAMADAN OFFER");
    await expect(storefront.locator('[data-editor-active="true"]')).toContainText("RAMADAN OFFER");

    await storefront.getByRole("button", { name: "Add homepage section" }).click();
    await page
      .getByRole("dialog", { name: "Add homepage section" })
      .getByRole("button", { name: /Banner \+ product row/ })
      .click();
    inspector = page.getByRole("complementary", { name: "Banner settings" });
    await expect(inspector.getByText("Banner + products", { exact: true })).toBeVisible();
    await expect(inspector.locator("select").first()).toHaveValue("all");
    await expect(storefront.locator('[data-editor-active="true"]')).toBeVisible();
  });

  test("keeps Preview separate from publishing", async ({ page }) => {
    const publish = page.getByRole("button", { name: "Publish", exact: true });
    await expect(publish).toBeDisabled();

    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Draft homepage preview" })).toBeVisible();
    await expect(
      page.getByText("Nothing here is live until Publish.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Confirm homepage publish" })).toHaveCount(0);
    await page.getByRole("button", { name: "Close", exact: true }).click();

    await page
      .getByRole("complementary", { name: "Banner settings" })
      .getByLabel("Title", { exact: true })
      .fill("DRAFT TITLE");
    await expect(publish).toBeEnabled();
    await publish.click();
    await expect(page.getByRole("dialog", { name: "Confirm homepage publish" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish live", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  });
});
