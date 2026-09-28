import { defineConfig, devices } from "@playwright/test";

const studioMode = process.env.PLAYWRIGHT_STUDIO === "1";
const studioBaseUrl = "http://127.0.0.1:5178";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: 2,
  webServer: studioMode
    ? {
        command: "npm run dev -- --host 127.0.0.1 --port 5178",
        url: studioBaseUrl,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : process.env.PLAYWRIGHT_BASE_URL
      ? undefined
      : {
          command: "node scripts/run-pages-preview.mjs",
          url: "http://127.0.0.1:5190",
          reuseExistingServer: true,
          timeout: 120_000,
        },
  use: {
    baseURL: studioMode
      ? studioBaseUrl
      : process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5190",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], channel: "chromium" } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], channel: "chromium" } },
  ],
});
