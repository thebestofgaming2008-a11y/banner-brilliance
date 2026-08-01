import { expect, test } from "@playwright/test";

test("promotion trigger stays circular and opens the branded offer panel", async ({ page }) => {
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
  const trigger = page.getByRole("button", { name: /current offer/i });
  await expect(trigger).toBeVisible();
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
  await expect(dialog.getByText("L12", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Shop now" })).toHaveAttribute("href", "/shop");

  const panel = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(panel).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(viewport!.width);
});
