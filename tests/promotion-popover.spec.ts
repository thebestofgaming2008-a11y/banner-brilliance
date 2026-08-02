import { expect, test } from "@playwright/test";

test("gift-shaped offer trigger stays circular and opens the discount panel", async ({ page }) => {
  await page.route("**/api/promotions/featured", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "launch-offer",
        code: "L12",
        title: "Launch special",
        message: "A special gift for our website launch.",
        badge: "Surprise",
        buttonLabel: "Shop now",
        buttonUrl: "/shop",
        type: "percent",
        value: 12,
        endsAt: null,
      }),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fawzaan home" }).locator("img")).toHaveAttribute(
    "src",
    "/fawzaan-logo.png",
  );
  const trigger = page.getByRole("button", { name: /show (current offer|gifts and offers)/i });
  await expect(trigger).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Launch special" })).toHaveCount(0);
  const circle = await trigger.evaluate((element) => {
    const styles = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      radius: Number.parseFloat(styles.borderTopLeftRadius),
    };
  });
  expect(circle.width).toBe(circle.height);
  expect(circle.radius).toBeGreaterThanOrEqual(circle.width / 2);

  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Launch special" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("12% off", { exact: true })).toBeVisible();
  const copyCode = dialog.getByRole("button", { name: "Copy code L12" });
  await expect(copyCode).toContainText("Copy code L12");
  await expect(dialog.getByRole("link")).toHaveCount(0);

  const panel = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(panel).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(viewport!.width);
});
