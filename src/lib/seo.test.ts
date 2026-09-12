import { describe, expect, it } from "vitest";

import { canonicalStorefrontHref } from "./seo";

describe("canonicalStorefrontHref", () => {
  it("normalizes collection values without changing unrelated parameters", () => {
    expect(canonicalStorefrontHref("/shop?collection=Shemaghs&filter=New#products")).toBe(
      "/shop?collection=shemaghs&filter=New#products",
    );
  });

  it("leaves product paths and external URLs untouched", () => {
    expect(canonicalStorefrontHref("/products/Maroon-niqab")).toBe("/products/Maroon-niqab");
    expect(canonicalStorefrontHref("https://example.com/shop?collection=Shemaghs")).toBe(
      "https://example.com/shop?collection=Shemaghs",
    );
  });
});
