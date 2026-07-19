import { spawnSync } from "node:child_process";

const productionConvexUrl =
  process.env.PRODUCTION_CONVEX_URL || "https://steady-cobra-91.convex.cloud";
const productionConvexSiteUrl =
  process.env.PRODUCTION_CONVEX_SITE_URL || "https://steady-cobra-91.convex.site";

const result = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NITRO_PRESET: "cloudflare-pages",
    VITE_CONVEX_URL: productionConvexUrl,
    VITE_CONVEX_SITE_URL: productionConvexSiteUrl,
  },
});

process.exit(result.status ?? 1);
