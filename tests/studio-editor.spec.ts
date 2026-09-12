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
    await expect(frame.getByTestId("homepage-collection-mosaic")).toBeAttached();
    await expect(frame.locator("footer")).toBeAttached();
    await expect(frame.getByRole("button", { name: "Add collection tile" })).toBeAttached();
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

  test("manages collection Mosaic boxes in a focused editor", async ({ page }) => {
    await page.getByRole("button", { name: "Collections", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Edit collection mosaic" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("7 collection boxes", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Collection title")).toHaveValue("KASHMIR HONEY");

    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog.getByText("8 collection boxes", { exact: true })).toBeVisible();
    await dialog.getByLabel("Small text").fill("Limited release");
    await dialog.getByLabel("Collection title").fill("RAMADAN PICKS");
    await dialog.getByLabel("Link", { exact: true }).fill("/shop?collection=Ramadan");
    await dialog.getByLabel("Collection image URL").fill("/homepage/honey.jpg");
    await expect(dialog.getByRole("button", { name: "Save draft", exact: true })).toBeEnabled();
    await expect(dialog.getByRole("button", { name: "Publish live", exact: true })).toBeEnabled();

    const frame = storefront(page);
    await expect(frame.locator('[data-mosaic-card="RAMADAN PICKS"]')).toContainText(
      "Limited release",
    );
    await expect(frame.locator('[data-mosaic-card="RAMADAN PICKS"]')).toHaveAttribute(
      "href",
      "/shop?collection=Ramadan",
    );
    await expect(dialog.getByRole("button", { name: "Move collection up" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Delete collection" })).toBeEnabled();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  test("keeps Figma-style text boxes aligned in auto width, auto height and fixed modes", async ({
    page,
  }) => {
    const frame = storefront(page);
    const title = frame.locator('[data-editor-active="true"] [data-banner-layer="title"]');
    const inspector = page.getByRole("complementary", { name: "Banner settings" });
    await title.click({ force: true });

    const initialBox = await title.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialLeft = initialBox!.x;

    await inspector.getByRole("button", { name: "Auto width", exact: true }).click();
    await expect(title).toHaveAttribute("data-text-resize", "width-and-height");
    await inspector.getByLabel("Title", { exact: true }).fill("SALE");
    await expect(title).toHaveText("SALE");
    await expect
      .poll(async () => {
        const box = await title.boundingBox();
        return box?.x ?? 0;
      })
      .toBeCloseTo(initialLeft, 1);
    const autoWidthSelection = frame.locator('.studio-selection-box[data-selection-layer="title"]');
    await expect
      .poll(async () => {
        const [textBox, selectionBox] = await Promise.all([
          title.boundingBox(),
          autoWidthSelection.boundingBox(),
        ]);
        return textBox && selectionBox ? Math.abs(textBox.width - selectionBox.width) : 999;
      })
      .toBeLessThan(1);

    await inspector.getByRole("button", { name: "Auto height", exact: true }).click();
    await inspector.getByLabel("W", { exact: true }).fill("20");
    await inspector
      .getByLabel("Title", { exact: true })
      .fill("A LONG PROMOTION TITLE THAT WRAPS CLEANLY");
    await expect(title).toHaveAttribute("data-text-resize", "height");
    await expect
      .poll(async () => (await title.boundingBox())?.height ?? 0)
      .toBeGreaterThan(initialBox!.height);

    await inspector.getByRole("button", { name: "Fixed size", exact: true }).click();
    await expect(title).toHaveAttribute("data-text-resize", "none");
  });

  test("keeps the original hero geometry stable on desktop and mobile canvases", async ({
    page,
  }) => {
    const desktopFrame = page.frameLocator('iframe[title="desktop storefront preview"]');
    const desktopScene = desktopFrame.locator('[data-editor-active="true"]');
    const desktopGeometry = await desktopScene.evaluate((root) => {
      const relativeBox = (element: Element | null) => {
        if (!element) throw new Error("Missing hero element");
        const rootBox = root.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return {
          x: box.x - rootBox.x,
          y: box.y - rootBox.y,
          width: box.width,
          height: box.height,
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      };
      return {
        hero: relativeBox(root),
        frame: relativeBox(root.querySelector("[data-banner-coordinate-root]")),
        title: relativeBox(root.querySelector('[data-banner-layer="title"]')),
        button: relativeBox(root.querySelector('[data-banner-layer="button"] span')),
      };
    });

    expect(desktopGeometry.hero.x).toBeCloseTo(0, 1);
    expect(desktopGeometry.hero.width).toBeCloseTo(1440, 1);
    expect(desktopGeometry.frame.x).toBeCloseTo((1440 - desktopGeometry.frame.width) / 2, 1);
    expect(desktopGeometry.title.x).toBeGreaterThanOrEqual(0);
    expect(desktopGeometry.title.x + desktopGeometry.title.width).toBeLessThanOrEqual(
      desktopGeometry.hero.width,
    );
    expect(desktopGeometry.button.x).toBeGreaterThanOrEqual(0);
    expect(desktopGeometry.button.x + desktopGeometry.button.width).toBeLessThanOrEqual(
      desktopGeometry.hero.width,
    );
    expect(desktopGeometry.title.fontSize).toBeCloseTo((58 / 390) * desktopGeometry.frame.width, 1);
    expect(desktopGeometry.button.fontSize).toBeCloseTo(12, 1);

    await page.getByRole("button", { name: "Mobile viewport", exact: true }).click();
    const mobileIframe = page.locator('iframe[title="mobile storefront preview"]');
    await mobileIframe.evaluate((element) => {
      element.style.width = "292px";
      element.setAttribute("width", "292");
    });
    const mobileScene = page
      .frameLocator('iframe[title="mobile storefront preview"]')
      .locator('[data-editor-active="true"]');
    await expect(mobileScene).toHaveCSS("height", "560px");
    const mobileGeometry = await mobileScene.evaluate((root) => {
      const rootBox = root.getBoundingClientRect();
      const frameBox = root.querySelector("[data-banner-coordinate-root]")!.getBoundingClientRect();
      return {
        sceneWidth: rootBox.width,
        sceneHeight: rootBox.height,
        frameX: frameBox.x - rootBox.x,
        frameWidth: frameBox.width,
      };
    });
    const expectedMobileFrameWidth = (mobileGeometry.sceneHeight * 390) / 649;
    expect(mobileGeometry.frameWidth).toBeCloseTo(expectedMobileFrameWidth, 1);
    expect(mobileGeometry.frameX).toBeCloseTo(
      (mobileGeometry.sceneWidth - expectedMobileFrameWidth) / 2,
      1,
    );
  });

  test("keeps desktop and mobile hero layout edits independent", async ({ page }) => {
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
    expect(mobileEnd.x).toBeCloseTo(mobileStart.x, 3);
    expect(mobileEnd.y).toBeCloseTo(mobileStart.y, 3);
    await page.getByRole("button", { name: "Align text left" }).click();
    await expect(mobileTitle).toHaveCSS("text-align", "left");

    await page.getByRole("button", { name: "Desktop viewport", exact: true }).click();
    await expect(title).toHaveCSS("text-align", "right");
    const desktopAfterMobileEdit = await title.evaluate((element) => ({
      x: Number.parseFloat(element.style.left),
      y: Number.parseFloat(element.style.top),
    }));
    expect(desktopAfterMobileEdit.x).toBeCloseTo(desktopEnd.x, 3);
    expect(desktopAfterMobileEdit.y).toBeCloseTo(desktopEnd.y, 3);
  });

  test("repairs legacy mobile hero layers into the visible canvas", async ({ page }) => {
    await page.getByRole("button", { name: "Mobile viewport", exact: true }).click();
    const frame = storefront(page, "mobile");
    const scene = frame.locator('[data-editor-active="true"]');
    const sceneBox = await scene.boundingBox();
    expect(sceneBox).not.toBeNull();

    for (const id of ["title", "body", "button"] as const) {
      const layerBox = await scene.locator(`[data-banner-layer="${id}"]`).boundingBox();
      expect(layerBox).not.toBeNull();
      expect(layerBox!.x).toBeGreaterThanOrEqual(sceneBox!.x - 1);
      expect(layerBox!.x + layerBox!.width).toBeLessThanOrEqual(sceneBox!.x + sceneBox!.width + 1);
    }
  });

  test("edits the fixed hero and renders true mobile responsive styles", async ({ page }) => {
    const inspector = page.getByRole("complementary", { name: "Banner settings" });
    const activeScene = storefront(page).locator('[data-editor-active="true"]');

    await inspector.getByLabel("Title", { exact: true }).fill("SUMMER COLLECTION");
    await inspector.locator("textarea").first().fill("A limited seasonal release");
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

  test("edits persistent silhouette and text shadows", async ({ page }) => {
    const frame = storefront(page);
    const scene = frame.locator('[data-editor-active="true"]');
    const image = scene.locator('[data-banner-layer="foreground"]');
    const title = scene.locator('[data-banner-layer="title"]');
    const inspector = page.getByRole("complementary", { name: "Banner settings" });

    await image.click({ force: true });
    await expect(inspector.getByRole("heading", { name: "Shadow", exact: true })).toBeVisible();
    await expect(inspector.getByLabel("Shadow X", { exact: true })).toHaveValue("18");
    await expect(inspector.getByLabel("Shadow Y", { exact: true })).toHaveValue("12");
    await expect(inspector.getByLabel("Shadow blur", { exact: true })).toHaveValue("20");
    await expect(inspector.getByLabel("Shadow opacity", { exact: true })).toHaveValue("42");
    await expect
      .poll(() => image.evaluate((element) => element.style.filter))
      .toContain("drop-shadow(rgba(50, 14, 20, 0.42) 18px 12px 20px)");

    await inspector.getByLabel("Shadow opacity", { exact: true }).fill("55");
    await expect
      .poll(() => image.evaluate((element) => element.style.filter))
      .toContain("rgba(50, 14, 20, 0.55)");

    await title.click({ force: true });
    const shadowToggle = inspector.getByRole("group", { name: "Layer shadow" });
    await shadowToggle.getByRole("button", { name: "On", exact: true }).click();
    await inspector.getByLabel("Shadow X", { exact: true }).fill("3");
    await inspector.getByLabel("Shadow Y", { exact: true }).fill("4");
    await inspector.getByLabel("Shadow blur", { exact: true }).fill("9");
    await inspector.getByLabel("Shadow opacity", { exact: true }).fill("60");
    await inspector.getByLabel("Shadow colour", { exact: true }).fill("#112233");
    await expect
      .poll(() => title.evaluate((element) => element.style.textShadow))
      .toContain("rgba(17, 34, 51, 0.6) 3px 4px 9px");

    await page.getByRole("button", { name: "Mobile viewport", exact: true }).click();
    const mobileFrame = storefront(page, "mobile");
    const mobileImage = mobileFrame.locator(
      '[data-editor-active="true"] [data-banner-layer="foreground"]',
    );
    await mobileImage.click({ force: true });
    await inspector.getByLabel("Shadow X", { exact: true }).fill("6");
    await page.getByRole("button", { name: "Desktop viewport", exact: true }).click();
    await expect(inspector.getByLabel("Shadow X", { exact: true })).toHaveValue("18");
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

  test("adds only adaptive Mosaic tiles from the homepage frame", async ({ page }) => {
    const frame = storefront(page);
    const addButton = frame.getByRole("button", { name: "Add collection tile" });
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();

    const dialog = page.getByRole("dialog", { name: "Edit collection mosaic" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("8 collection boxes", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Added collection 1", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Publish live", exact: true })).toBeDisabled();
    await expect(dialog.getByText("Add an image", { exact: true })).toBeVisible();
    await dialog.getByLabel("Collection image URL").fill("/homepage/honey.jpg");
    await dialog.getByLabel("Collection title").fill("NEW HONEY EDIT");
    await expect(dialog.getByRole("button", { name: "Publish live", exact: true })).toBeEnabled();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();

    const extras = frame.locator(".homepage-mosaic__extras");
    await expect(extras).toHaveAttribute("data-added-collections", "1");
    await expect(extras).toHaveClass(/homepage-mosaic__extras--1/);
    await expect(frame.locator('[data-mosaic-card="NEW HONEY EDIT"]')).toBeVisible();

    await frame.locator('[data-mosaic-card="NEW HONEY EDIT"]').click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Collection title")).toHaveValue("NEW HONEY EDIT");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await dialog.getByLabel("Collection image URL").fill("/homepage/makkah-gloves.jpg");
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(extras).toHaveAttribute("data-added-collections", "2");
    await expect(extras).toHaveClass(/homepage-mosaic__extras--2/);

    await addButton.click();
    await dialog.getByLabel("Collection image URL").fill("/homepage/sabr-watch-black.jpg");
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(extras).toHaveAttribute("data-added-collections", "3");
    await expect(extras).toHaveClass(/homepage-mosaic__extras--3/);

    await expect(page.getByRole("dialog", { name: "Add homepage section" })).toHaveCount(0);
    await expect(page.getByText("Banner + product row", { exact: true })).toHaveCount(0);
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

  test("blocks incomplete Mosaic tiles before publish", async ({ page }) => {
    const frame = storefront(page);
    const addButton = frame.getByRole("button", { name: "Add collection tile" });
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();
    const dialog = page.getByRole("dialog", { name: "Edit collection mosaic" });
    await expect(dialog.getByRole("button", { name: "Publish live", exact: true })).toBeDisabled();
    await expect(dialog.getByText("Add an image", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText(/needs an image/)).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Confirm homepage publish" })).toHaveCount(0);
  });

  test("restores the approved OG without deleting homepage history", async ({ page }) => {
    await page.getByRole("button", { name: "Restore OG", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Restore OG homepage" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Restore the current OG homepage?" }),
    ).toBeVisible();
    await expect(dialog.getByText(/creates a new version in history/i)).toBeVisible();
    await expect(dialog.getByText(/existing versions and banners are not deleted/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Restore OG live" })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
});
