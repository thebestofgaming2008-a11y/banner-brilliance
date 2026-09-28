import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// This release must preserve the original storefront, admin and backend exactly.
// Deliberately pinned to the last production version before information-page work.
const baseline = "ff05af9";
const allowed = new Set([
  "src/components/store/info-page.tsx",
  "src/components/store/support-navigation.tsx",
  "src/lib/info-seo.ts",
  "src/routes/about.tsx",
  "src/routes/faq.tsx",
  "src/routes/pages.contact.tsx",
  "src/routes/pages.privacy.tsx",
  "src/routes/pages.returns.tsx",
  "src/routes/pages.shipping.tsx",
  "src/routes/terms.tsx",
]);
const protectedPaths = [
  "src",
  "convex",
  "public",
  "package.json",
  "package-lock.json",
  "wrangler.toml",
  "vite.config.ts",
  "tsconfig.json",
  ".github",
  ".lovable",
];
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const paths = (output) => (output ? output.split("\n").map((path) => path.trim()) : []);
const changed = paths(git("diff", "--name-only", baseline, "--", ...protectedPaths));
const untracked = paths(git("ls-files", "--others", "--exclude-standard", "--", ...protectedPaths));
const unexpected = [...new Set([...changed, ...untracked])].filter((path) => !allowed.has(path));
assert.deepEqual(unexpected, [], `Changes outside information pages: ${unexpected.join(", ")}`);
console.log(
  `Scope verified against ${baseline}: ${changed.length} permitted information-page files changed; protected storefront, admin, backend, assets, dependencies and config unchanged.`,
);
