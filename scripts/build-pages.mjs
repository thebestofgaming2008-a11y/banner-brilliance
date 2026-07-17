import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NITRO_PRESET: "cloudflare-pages",
  },
});

process.exit(result.status ?? 1);
