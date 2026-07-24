import { expect, test, type Page } from "@playwright/test";

function storefront(page: Page, viewport: "desktop" | "mobile" = "desktop") {
  return page.frameLocator(`iframe[title="${viewport} storefront preview"]`);
}

test.describe("fixed-template homepage studio", () => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL && process.env.PLAYWRIGHT_STUDIO !== "1",
    "The studio harness runs against the Vite dev server.",
  );
  test.skip(({ isMobile }) => isMobile, "The admin studio requires a desktop-sized workspace.");

  test.beforeEach(async ({ page }) => {
    const harness = `${process.cwd().replaceAll("\\", "/")}/work/studio-harness.html`;
    await page.goto(`/@fs/${harness}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Homepage banners", { exact: true })).toBeVisible();
    await expect(page.locator('iframe[title="desktop storefront preview"]')).toBeVisible();
  });

  test("shows the exact scrollable homepage with targeted hero text selection", async ({
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
    await expect(frame.locator(".studio-selection-box")).toHaveCount(1);
    await expect(
      page
        .getByRole("complementary", { name: "Banner settings" })
        .getByRole("heading", { name: "Title", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Align text left" })).toBeVisible();
  });

  test("drags hero text with center guides and changes its own alignment", async ({ page }) => {
    const frame = storefront(page);
    const title = frame.locator('[data-editor-active="true"] [data-banner-layer="title"]');
    const scene = frame.locator('[data-editor-active="true"]');
    await title.click({ force: true });

    const desktopStart = await title.evaluate((element) => ({
      x: Number.parseFloat(element.style.left),
      y: Number.parseFloat(element.style.top),
    }));
    await page.getByRole("button", { name: "Mobile viewport", exact: true }).click();
    const mobileTitleBefore = storefront(page, "mobile").locator(
      '[data-editor-active="true"] [data-banner-layer="title"]',
    );
    await mobileTitleBefore.click({ force: true });
    const mobileStart = await mobileTitleBefore.evaluate((element) => ({
      x: Number.parseFloat(element.style.left),
      y: Number.parseFloat(element.style.top),
    }));
    await page.getByRole("button", { name: "Desktop viewport", exact: true }).click();
    await title.click({ force: true });

    const titleBox = await title.boundingBox();
    const sceneBox = await scene.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(sceneBox).not.toBeNull();

    const startX = titleBox!.x + titleBox!.width / 2;
    const startY = titleBox!.y + titleBox!.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(sceneBox!.x + sceneBox!.width / 2, startY + 40, { steps: 8 });
    await expect(frame.locator(".studio-smart-guide.is-vertical")).toBeVisible();
    await page.mouse.up();

    const desktopEnd = await title.evaluate((element) => ({
      x: Number.parseFloat(element.style.left),
      y: Number.parseFloat(element.style.top),
    }));
    await page.getByRole("button", { name: "Align text right" }).click();
    await expect(title).toHaveCSS("text-align", "right");

    await page.getByRole("button", { name: "Mobile viewport", exact: true }).click();
    const mobileTitle = storefront(page, "mobile").locator(
      '[data-editor-active="true"] [data-banner-layer="title"]',
    );
    await mobileTitle.click({ force: true });
    const mobileEnd = await mobileTitle.evaluate((element) => ({
      x: Number.parseFloat(element.style.left),
      y: Number.parseFloat(element.style.top),
    }));
    expect(mobileEnd.x - mobileStart.x).toBeCloseTo(desktopEnd.x - desktopStart.x, 3);
    expect(mobileEnd.y - mobileStart.y).toBeCloseTo(desktopEnd.y - desktopStart.y, 3);
    await page.getByRole("button", { name: "Align text left" }).click();
    await expect(mobileTitle).toHaveCSS("text-align", "left");
  });

  test("edits the fixed hero and renders true mobile responsive styles", async ({ page }) => {
    const inspector = page.getByRole("complementary", { name: "Banner settings" });
    const activeScene = storefront(page).locator('[data-editor-active="true"]');

    await inspector.getByLabel("Title", { exact: true }).fill("SUMMER COLLECTION");
    await inspector.getByLabel("Subtitle", { exact: true }).fill("A limited seasonal release");
    await inspector.getByLabel("Shop button text", { exact: true }).fill("Explore summer");
    await inspector.getByLabel("Shop button link", { exact: true }).fill("/shop?collection=summer");
    await expect(activeScene.locator('[data-banner-layer="title"]')).toHaveText(
      "SUMMER COLLECTION",
    );
    await expect(activeScene.locator('[data-banner-layer="body"]')).toHaveText(
      "A limited seasonal release",
    );
    await expect(activeScene.locator('[data-banner-layer="button"]')).toHaveText("Explore summer");
    const heroButton = activeScene.locator('[data-banner-layer="button"]');
    await heroButton.click({ force: true });
    await inspector.getByLabel("Text colour", { exact: true }).fill("#112233");
    await expect(heroButton).toHaveCSS("color", "rgb(17, 34, 51)");
    await inspector.getByRole("button", { name: "Filled", exact: true }).click();
    await inspector.getByLabel("Button colour", { exact: true }).fill("#fedcba");
    await expect(heroButton).toHaveCSS("background-color", "rgb(254, 220, 186)");

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

  test("selects, resizes and crops the hero product image", async ({ page }) => {
    const frame = storefront(page);
    const image = frame.locator('[data-editor-active="true"] [data-banner-layer="foreground"]');
    const inspector = page.getByRole("complementary", { name: "Banner settings" });

    await image.click({ force: true });
    await expect(frame.locator(".studio-selection-box")).toHaveCount(1);
    await expect(
      inspector.getByRole("heading", { name: "Product image", exact: true }).first(),
    ).toBeVisible();

    const width = inspector.getByLabel("W", { exact: true });
    const originalWidth = Number(await width.inputValue());
    const nextWidth = (originalWidth - 3).toFixed(1);
    await width.fill(nextWidth);
    await expect(width).toHaveValue(nextWidth);

    await inspector.getByLabel("Zoom %", { exact: true }).fill("135");
    await expect
      .poll(() => image.locator("img").evaluate((element) => element.style.transform))
      .toContain("scale(1.35)");
    await expect(inspector.getByRole("button", { name: "Crop product image" })).toBeVisible();
    await image.dblclick({ force: true });
    await expect(page.getByText("Crop image", { exact: true })).toBeVisible();
    await expect(image).toHaveClass(/is-cropping/);
    await page.getByRole("button", { name: "Done", exact: true }).click();
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
    await inspector.getByLabel("Small label", { exact: true }).fill("LIMITED RELEASE");
    await inspector.getByLabel("Title", { exact: true }).fill("RAMADAN OFFER");
    await inspector.getByLabel("Shop button text", { exact: true }).fill("View the offer");
    await inspector.getByRole("button", { name: "Align text right" }).click();
    const standalone = frame.locator('[data-homepage-banner-id][data-editor-active="true"]');
    await expect(standalone).toContainText("LIMITED RELEASE");
    await expect(standalone).toContainText("RAMADAN OFFER");
    await expect(standalone).toContainText("View the offer");
    await expect(standalone.getByRole("heading", { name: "RAMADAN OFFER" })).toHaveCSS(
      "text-align",
      "right",
    );
    const presetTitle = standalone.locator('[data-banner-layer="title"]');
    await expect(presetTitle).toHaveAttribute("data-layer-locked", "true");
    await presetTitle.dblclick();
    await presetTitle.locator('[contenteditable="true"]').fill("RAMADAN OFFER UPDATED");
    await presetTitle.locator('[contenteditable="true"]').press("Tab");
    await expect(inspector.getByLabel("Title", { exact: true })).toHaveValue(
      "RAMADAN OFFER UPDATED",
    );
    await inspector.getByLabel("Text colour", { exact: true }).fill("#123456");
    await inspector.getByLabel("Button colour", { exact: true }).fill("#fedcba");
    await inspector.getByLabel("Button text", { exact: true }).fill("#102030");
    await expect(standalone.getByRole("heading", { name: "RAMADAN OFFER UPDATED" })).toHaveCSS(
      "color",
      "rgb(18, 52, 86)",
    );
    await expect(standalone.locator('[data-banner-layer="button"]')).toHaveCSS(
      "background-color",
      "rgb(254, 220, 186)",
    );

    await inspector.getByLabel("Banner image URL").fill("/homepage/hero-shemagh.webp");
    await expect(inspector.getByRole("button", { name: "Crop image" })).toBeVisible();
    await expect(inspector.getByText("Desktop crop", { exact: true })).toBeVisible();
    await expect(inspector.getByLabel("X", { exact: true })).toHaveCount(0);
    await expect(inspector.getByLabel("W", { exact: true })).toHaveCount(0);
    await inspector.getByLabel("Zoom %", { exact: true }).fill("125");
    const bannerImage = standalone.locator('[data-banner-layer="banner-image"]');
    await expect
      .poll(() => bannerImage.locator("img").evaluate((element) => element.style.transform))
      .toContain("scale(1.25)");
    await bannerImage.click({ position: { x: 100, y: 50 } });
    await expect(bannerImage).toHaveAttribute("data-layer-locked", "true");
    await expect(
      standalone.locator('.studio-selection-box[data-selection-layer="banner-image"]'),
    ).toHaveCount(0);
    await expect(bannerImage).toHaveCSS("left", "0px");
    await expect(bannerImage).toHaveCSS("width", "1180px");

    await inspector.getByRole("button", { name: "Crop image" }).click();
    await expect(page.getByText("Crop image", { exact: true })).toBeVisible();
    await expect(bannerImage).toHaveClass(/is-cropping/);
    const objectPositionBeforeCrop = await bannerImage
      .locator("img")
      .evaluate((element) => element.style.objectPosition);
    const imageBox = await bannerImage.boundingBox();
    expect(imageBox).not.toBeNull();
    if (imageBox) {
      await page.mouse.move(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        imageBox.x + imageBox.width / 2 + 30,
        imageBox.y + imageBox.height / 2 + 10,
        { steps: 4 },
      );
      await page.mouse.up();
    }
    await expect
      .poll(() => bannerImage.locator("img").evaluate((element) => element.style.objectPosition))
      .not.toBe(objectPositionBeforeCrop);
    await page.getByRole("button", { name: "Done", exact: true }).click();

    await page.getByRole("button", { name: "Mobile viewport" }).click();
    await expect(inspector.getByText("Mobile crop", { exact: true })).toBeVisible();
    await expect(inspector.getByLabel("Zoom %", { exact: true })).toHaveValue("100");
    await inspector.getByLabel("Zoom %", { exact: true }).fill("140");
    await page.getByRole("button", { name: "Desktop viewport" }).click();
    await expect(inspector.getByLabel("Zoom %", { exact: true })).toHaveValue("125");
    await inspector.getByRole("button", { name: "Reset crop" }).click();
    await expect(inspector.getByLabel("Zoom %", { exact: true })).toHaveValue("100");

    await inspector.getByRole("button", { name: "Image only", exact: true }).click();
    await expect(standalone.getByRole("heading", { name: "RAMADAN OFFER UPDATED" })).toHaveCount(0);
    await expect(standalone.locator('[data-banner-layer="button"]')).toHaveCount(0);
    await expect(bannerImage.locator("img")).toBeVisible();
    await expect(inspector.getByLabel("Title", { exact: true })).toHaveCount(0);
    await inspector.getByLabel("Image description", { exact: true }).fill("Ramadan collection");
    await inspector.getByLabel("Poster link (optional)", { exact: true }).fill("/shop");

    await frame.getByRole("button", { name: "Add homepage section" }).click();
    await page
      .getByRole("dialog", { name: "Add homepage section" })
      .getByRole("button", { name: /Banner \+ product row/ })
      .click();
    inspector = page.getByRole("complementary", { name: "Banner settings" });
    await expect(inspector.getByText("Banner + products", { exact: true })).toBeVisible();
    await expect(inspector.locator("select").first()).toHaveValue("all");
    await expect(
      frame.locator('[data-homepage-banner-id][data-editor-active="true"]'),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Move banner up" })).toBeEnabled();

    await inspector.getByRole("button", { name: "Choose products", exact: true }).click();
    await expect(inspector.getByText("4/8", { exact: true })).toBeVisible();
    await expect(inspector.locator(".studio-product-picker__selected > div")).toHaveCount(4);
    await inspector
      .locator(".studio-product-picker__selected > div")
      .first()
      .getByRole("button", { name: /Remove/ })
      .click();
    await expect(inspector.getByText("3/8", { exact: true })).toBeVisible();
    await expect(
      frame
        .locator('[data-homepage-banner-id][data-editor-active="true"]')
        .locator("xpath=..")
        .locator("article"),
    ).toHaveCount(3);

    await inspector.getByLabel("Banner image URL").fill("/homepage/honey.jpg");
    const collectionBanner = frame.locator('[data-homepage-banner-id][data-editor-active="true"]');
    const collectionImage = collectionBanner.locator('[data-banner-layer="banner-image"]');
    await expect(collectionImage.locator("img")).toBeVisible();
    await collectionImage.click({ position: { x: 400, y: 180 } });
    await expect(collectionImage).toHaveAttribute("data-layer-locked", "true");
    await inspector.getByRole("button", { name: "Crop image" }).click();
    await expect(collectionImage).toHaveClass(/is-cropping/);
    await page.getByRole("button", { name: "Done", exact: true }).click();
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

  test("blocks incomplete banners before publish", async ({ page }) => {
    const frame = storefront(page);
    const addButton = frame.getByRole("button", { name: "Add homepage section" });
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();
    await page
      .getByRole("dialog", { name: "Add homepage section" })
      .getByRole("button", { name: /Banner only/ })
      .click();

    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(
      page.getByText(/Fix before publishing: NEW BANNER needs a banner image/),
    ).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Confirm homepage publish" })).toHaveCount(0);
  });

  test("makes the canonical OG restore explicit and difficult to trigger accidentally", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Restore OG", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Restore OG homepage" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Restore the current OG homepage?" }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/removes all editor drafts, published versions, browser backups/i),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Restore OG live" })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
});
