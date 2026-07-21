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
  await page.route("**/api/catalog/presentation*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        taxonomy: [],
        banners: [],
        homepage: {
          schemaVersion: 2,
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
              type: "PromoBanner",
              props: {
                id: "visual-test-section",
                eyebrow: "Published content",
                title: "VISUAL EDITOR TEST",
                body: "A focused editor banner rendered after Honey.",
                buttonLabel: "Shop now",
                buttonUrl: "/shop",
                backgroundImage: "",
                foregroundImage: "",
                backgroundColor: "#F6AD32",
                textTone: "dark",
                textAlign: "left",
                titleFont: "sans",
                titleSize: 54,
                mobileTitleSize: 38,
                imageFocus: "center",
                foregroundScale: 50,
                overlayOpacity: 0,
                minHeight: 420,
              },
            },
          ],
        },
      }),
    });
  });

  await page.goto("/");
  const hero = page.getByRole("region", { name: "Featured collection" });
  await expect(hero.getByRole("heading", { name: "FIRST HERO" })).toBeVisible({ timeout: 2_000 });
  await expect(hero.locator('[data-hero-gradient][data-gradient-angle="110"]')).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await hero.getByRole("button", { name: "Show SECOND HERO" }).click();
  await expect(hero.getByRole("heading", { name: "SECOND HERO" })).toBeVisible();
  await expect(hero.locator("[data-hero-track]")).toHaveCSS("transition-duration", "0.76s");
  await expect(hero.locator('[data-hero-gradient][data-gradient-angle="145"]')).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  const heroBox = await hero.boundingBox();
  expect(heroBox).not.toBeNull();
  if (heroBox) {
    const viewport = page.viewportSize();
    const pointerY = Math.max(
      80,
      Math.min((viewport?.height ?? 720) - 80, heroBox.y + heroBox.height / 2),
    );
    await page.mouse.move(heroBox.x + heroBox.width / 2, pointerY);
    await page.mouse.down();
    await page.mouse.move(heroBox.x + heroBox.width / 2 + 120, pointerY, {
      steps: 5,
    });
    await page.mouse.up();
  }
  await expect(hero.getByRole("heading", { name: "FIRST HERO" })).toBeVisible({ timeout: 2_000 });
  await expect(page.getByRole("heading", { name: "VISUAL EDITOR TEST" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop now" })).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("heading", { name: "SHOP ALL" })).toBeVisible();
  const customHeading = page.getByRole("heading", { name: "VISUAL EDITOR TEST" });
  expect(
    await customHeading.evaluate((heading) => {
      const honey = document.querySelector("#honey");
      return Boolean(
        honey && honey.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBeTruthy();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("published banner scenes preserve responsive layers, fills, and links", async ({ page }) => {
  const errors = watchPageErrors(page);
  await page.route("**/api/catalog/presentation*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        taxonomy: [],
        banners: [],
        homepage: {
          schemaVersion: 2,
          root: { props: { title: "Scene test", backgroundColor: "#ffffff" } },
          content: [
            {
              type: "Hero",
              props: {
                id: "scene-hero",
                layout: "banner",
                editorSlide: 1,
                slides: [
                  {
                    eyebrow: "",
                    title: "SCENE HERO",
                    body: "",
                    buttonLabel: "Shop scene",
                    buttonUrl: "/shop?collection=scene",
                    backgroundImage: "",
                    foregroundImage: "",
                    backgroundColor: "#111111",
                    imageFocus: "center",
                    gradient: {
                      enabled: "off",
                      startColor: "#000000",
                      endColor: "#ffffff",
                      angle: 90,
                      opacity: 100,
                    },
                    scene: {
                      version: 1,
                      name: "Responsive scene",
                      height: 640,
                      mobileHeight: 520,
                      fills: [
                        {
                          id: "fill-solid",
                          type: "solid",
                          enabled: true,
                          opacity: 100,
                          color: "#111111",
                        },
                        {
                          id: "fill-radial",
                          type: "radial",
                          enabled: true,
                          opacity: 85,
                          centerX: 30,
                          centerY: 40,
                          stops: [
                            { color: "#F6AD32", position: 0 },
                            { color: "#F1853200", position: 100 },
                          ],
                        },
                      ],
                      layers: [
                        {
                          id: "title",
                          name: "Title",
                          type: "text",
                          semantic: "h1",
                          text: "SCENE HERO",
                          style: {
                            x: 10,
                            y: 25,
                            width: 60,
                            height: 20,
                            rotation: 0,
                            opacity: 100,
                            visible: true,
                            fontFamily: "instrument",
                            fontSize: 76,
                            fontWeight: 400,
                            lineHeight: 0.95,
                            letterSpacing: 0,
                            textAlign: "left",
                            textTransform: "none",
                            color: "#ffffff",
                          },
                          mobileStyle: { x: 8, y: 22, width: 84, fontSize: 42 },
                        },
                        {
                          id: "button",
                          name: "Button",
                          type: "button",
                          text: "Shop scene",
                          href: "/shop?collection=scene",
                          style: {
                            x: 10,
                            y: 55,
                            width: 18,
                            height: 8,
                            rotation: 0,
                            opacity: 100,
                            visible: true,
                            fontFamily: "schibsted",
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: 1,
                            letterSpacing: 0,
                            textAlign: "center",
                            textTransform: "uppercase",
                            color: "#000000",
                            backgroundColor: "#ffffff",
                          },
                        },
                      ],
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
                autoplay: "on",
              },
            },
          ],
        },
      }),
    });
  });

  await page.goto("/");
  const scene = page.locator(".homepage-banner-scene");
  const title = page.getByRole("heading", { level: 1, name: "SCENE HERO" });
  await expect(scene).toBeVisible();
  await expect(scene.locator('[data-fill-id="fill-radial"]')).toHaveCSS(
    "background-image",
    /radial-gradient/,
  );
  await expect(title).toHaveCSS("font-family", /Instrument Serif/);
  await expect(page.getByRole("link", { name: "Shop scene" })).toHaveAttribute(
    "href",
    "/shop?collection=scene",
  );

  const mobile = (page.viewportSize()?.width ?? 1280) <= 639;
  await expect(scene).toHaveAttribute("data-scene-viewport", mobile ? "mobile" : "desktop");
  await expect(title).toHaveCSS("font-size", mobile ? "42px" : "76px");
  const sceneBox = await scene.boundingBox();
  const titleBox = await title.boundingBox();
  expect(sceneBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  if (sceneBox && titleBox) {
    const expectedX = mobile ? 0.08 : 0.1;
    expect(Math.abs((titleBox.x - sceneBox.x) / sceneBox.width - expectedX)).toBeLessThan(0.02);
  }
  expect(errors).toEqual([]);
});
