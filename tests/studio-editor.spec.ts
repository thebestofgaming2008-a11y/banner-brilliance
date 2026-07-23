import { expect, test, type Page } from "@playwright/test";

function storefront(page: Page, viewport: "desktop" | "mobile" = "desktop") {
  return page.frameLocator(`iframe[title="${viewport} storefront preview"]`);
}

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
    await expect(page.locator('iframe[title="desktop storefront preview"]')).toBeVisible();
  });

  test("shows the exact scrollable homepage without a left panel or free-form tools", async ({
    page,
  }) => {
    await expect(page.locator(".studio-left-panel")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "File", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Assets", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Editor tools" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tablet viewport" })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Banner settings" })).toBeVisible();
    await expect(page.locator(".studio-layer-row")).toHaveCount(0);

    const frame = storefront(page);
    await expect(frame.locator("#honey")).toBeAttached();
    await expect(frame.locator("footer")).toBeAttached();
    await expect(frame.getByRole("button", { name: "Add homepage section" })).toBeAttached();
    const frameSize = await frame.locator("html").evaluate((element) => ({
      width: element.clientWidth,
      height: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(frameSize.width).toBe(1440);
    expect(frameSize.scrollHeight).toBeGreaterThan(frameSize.height);

    const title = frame.locator('[data-editor-active="true"] [data-banner-layer="title"]');
    await title.click({ force: true });
    await expect(frame.locator(".studio-selection-box")).toHaveCount(0);
  });

  test("edits the fixed hero and renders true mobile responsive styles", async ({ page }) => {
    const inspector = page.getByRole("complementary", { name: "Banner settings" });
    const activeScene = storefront(page).locator('[data-editor-active="true"]');

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
    const mobileFrame = storefront(page, "mobile");
    const mobileScene = mobileFrame.locator('[data-editor-active="true"]');
    const mobileTitle = mobileScene.locator('[data-banner-layer="title"]');
    expect(await mobileFrame.locator("html").evaluate((element) => element.clientWidth)).toBe(390);
    const footerColumns = await mobileFrame
      .locator("footer > div")
      .first()
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(footerColumns.trim().split(/\s+/)).toHaveLength(1);
    expect(
      await mobileFrame
        .locator("html")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    const sceneBox = await mobileScene.boundingBox();
    const titleBox = await mobileTitle.boundingBox();
    expect(sceneBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(titleBox!.x).toBeGreaterThanOrEqual(sceneBox!.x - 1);
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(sceneBox!.x + sceneBox!.width + 1);
  });

  test("navigates, reorders and adds heroes from the right panel", async ({ page }) => {
    await expect(page.getByText("Slide 1 of 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next hero" }).click();
    await expect(page.getByText("Slide 2 of 2", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Move banner up" })).toBeEnabled();
    await page.getByRole("button", { name: "Add hero banner" }).click();
    await expect(page.getByText("Slide 3 of 3", { exact: true })).toBeVisible();

    const inspector = page.getByRole("complementary", { name: "Banner settings" });
    await expect(inspector.getByText("Hero banner", { exact: true })).toBeVisible();
    await expect(inspector.getByLabel("Title", { exact: true })).toHaveValue("NEW COLLECTION 3");
    await expect(inspector.locator("textarea").first()).toHaveValue(
      "Discover the latest collection",
    );
    await expect(
      storefront(page).locator('[data-editor-active="true"] [data-banner-layer="button"]'),
    ).toHaveText("Shop the collection");
  });

  test("adds only the two supported post-Honey section templates", async ({ page }) => {
    const frame = storefront(page);
    const addButton = frame.getByRole("button", { name: "Add homepage section" });
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
    await expect(frame.locator('[data-editor-active="true"]')).toContainText("RAMADAN OFFER");

    await frame.getByRole("button", { name: "Add homepage section" }).click();
    await page
      .getByRole("dialog", { name: "Add homepage section" })
      .getByRole("button", { name: /Banner \+ product row/ })
      .click();
    inspector = page.getByRole("complementary", { name: "Banner settings" });
    await expect(inspector.getByText("Banner + products", { exact: true })).toBeVisible();
    await expect(inspector.locator("select").first()).toHaveValue("all");
    await expect(frame.locator('[data-editor-active="true"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Move banner up" })).toBeEnabled();
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
