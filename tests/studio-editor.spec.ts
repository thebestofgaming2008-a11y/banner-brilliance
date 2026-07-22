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

  test("scrubs pixel properties and applies Figma controls", async ({ page }) => {
    await page.getByRole("button", { name: /Title/ }).first().click();
    const inspector = page.getByRole("complementary", { name: "Properties inspector" });
    const xInput = inspector.getByRole("spinbutton", { name: "X", exact: true }).first();
    const initialX = Number(await xInput.inputValue());
    const scrubHandle = xInput.locator("xpath=preceding-sibling::span");
    const handleBox = await scrubHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + 12,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.up();
    await expect.poll(async () => Number(await xInput.inputValue())).toBeCloseTo(initialX + 12, 0);

    await inspector.getByRole("button", { name: "Align left", exact: true }).click();
    await expect(xInput).toHaveValue("0");
    await inspector.getByRole("button", { name: "Flip horizontal", exact: true }).click();
    await expect(
      inspector.getByRole("button", { name: "Flip horizontal", exact: true }),
    ).toHaveClass(/is-active/);

    await inspector.getByRole("button", { name: "Edit Fill", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "Colour picker" });
    await expect(picker).toBeVisible();
    await picker.getByRole("button", { name: "Set colour #EF4444", exact: true }).click();
    await picker.getByRole("button", { name: "Close", exact: true }).click();
    await expect(inspector.getByRole("textbox", { name: "Fill hex", exact: true })).toHaveValue(
      "EF4444",
    );

    const storefront = page.frameLocator('iframe[title="desktop storefront preview"]');
    const title = storefront.locator('.studio-edit-surface [data-banner-layer="title"]');
    await expect
      .poll(() => title.evaluate((element) => getComputedStyle(element).color))
      .toBe("rgb(239, 68, 68)");
    await expect
      .poll(() => title.evaluate((element) => getComputedStyle(element).transform))
      .toContain("-1");

    await page.getByRole("button", { name: /Product image/ }).click();
    await inspector.getByRole("button", { name: "Fill frame", exact: true }).click();
    await expect(inspector.getByRole("button", { name: "Fill frame", exact: true })).toHaveClass(
      /is-active/,
    );
    const cropX = inspector.getByRole("spinbutton", { name: "Crop X", exact: true });
    await cropX.fill("10");
    await expect(cropX).toHaveValue("10");
    const image = storefront.locator('.studio-edit-surface [data-banner-layer="foreground"]');
    await expect
      .poll(() => image.evaluate((element) => getComputedStyle(element).objectFit))
      .toBe("cover");
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

    await page.getByRole("button", { name: "Add section", exact: true }).click();
    await page.getByRole("button", { name: /Banner left/ }).click();
    await expect(publish).toBeEnabled();
    await publish.click();
    await expect(page.getByRole("dialog", { name: "Confirm homepage publish" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish live", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  });
});
