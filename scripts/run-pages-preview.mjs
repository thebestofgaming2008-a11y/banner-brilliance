import { rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const shell = process.platform === "win32";
const build = spawnSync("npm", ["run", "build:pages"], {
  cwd: process.cwd(),
  env: process.env,
  shell,
  stdio: "inherit",
});

if (build.status !== 0) process.exit(build.status ?? 1);

// Nitro writes a Worker deploy redirect for `npm run build`; Pages preview must use wrangler.toml.
rmSync(".wrangler/deploy/config.json", { force: true });

const port = process.env.PLAYWRIGHT_PORT || "5190";
const preview = spawn("npx", ["wrangler", "pages", "dev", "dist", "--port", port], {
  cwd: process.cwd(),
  env: process.env,
  shell,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => preview.kill(signal));
}

preview.on("exit", (code) => process.exit(code ?? 0));
