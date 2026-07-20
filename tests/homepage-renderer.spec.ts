import { expect, test, type Page } from "@playwright/test";

function watchPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("published visual homepage content renders responsively", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.route("**/api/catalog/presentation?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        taxonomy: [],
        banners: [],
        homepage: {
          root: { props: { title: "Homepage test", backgroundColor: "#ffffff" } },
          content: [
            {
              type: "TextSection",
              props: {
                id: "visual-test-section",
                eyebrow: "Published content",
                title: "VISUAL EDITOR TEST",
                body: "A published Puck document is rendered without loading the editor.",
                buttonLabel: "Shop now",
                buttonUrl: "/shop",
                backgroundColor: "#f4b400",
                textColor: "#000000",
                textAlign: "center",
                titleFont: "display",
                titleSize: 54,
                maxWidth: 760,
              },
            },
          ],
        },
      }),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "VISUAL EDITOR TEST" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop now" })).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("heading", { name: "SHOP ALL" })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
