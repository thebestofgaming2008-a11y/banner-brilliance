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
              type: "Hero",
              props: {
                id: "hero-test",
                layout: "original",
                editorSlide: 1,
                slides: [
                  {
                    eyebrow: "First collection",
                    title: "FIRST HERO",
                    body: "",
                    buttonLabel: "Shop first",
                    buttonUrl: "/shop?collection=first",
                    backgroundImage: "",
                    foregroundImage: "",
                    backgroundColor: "#F39A3B",
                    imageFocus: "center",
                    gradient: {
                      enabled: "on",
                      startColor: "#F8C247",
                      endColor: "#E96A3A",
                      angle: 110,
                      opacity: 72,
                    },
                  },
                  {
                    eyebrow: "Second collection",
                    title: "SECOND HERO",
                    body: "",
                    buttonLabel: "Shop second",
                    buttonUrl: "/shop?collection=second",
                    backgroundImage: "",
                    foregroundImage: "",
                    backgroundColor: "#E96A3A",
                    imageFocus: "center",
                    gradient: {
                      enabled: "on",
                      startColor: "#FFD66D",
                      endColor: "#D9502C",
                      angle: 145,
                      opacity: 64,
                    },
                  },
                ],
                textAlign: "left",
                textTone: "light",
                titleFont: "display",
                titleSize: 76,
                mobileTitleSize: 50,
                contentWidth: 650,
                contentOffsetX: 6,
                contentOffsetY: 12,
                foregroundScale: 100,
                overlayOpacity: 10,
                autoplay: "off",
              },
            },
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
  const hero = page.getByRole("region", { name: "Featured collection" });
  await expect(hero.getByRole("heading", { name: "FIRST HERO" })).toBeVisible();
  await expect(hero.locator('[data-hero-gradient][data-gradient-angle="110"]')).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await hero.getByRole("button", { name: "Show SECOND HERO" }).click();
  await expect(hero.getByRole("heading", { name: "SECOND HERO" })).toBeVisible();
  await expect(hero.locator('[data-hero-gradient][data-gradient-angle="145"]')).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await expect(page.getByRole("heading", { name: "VISUAL EDITOR TEST" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop now" })).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("heading", { name: "SHOP ALL" })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
