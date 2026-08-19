import { describe, expect, it } from "vitest";

import { storefrontImageUrl } from "./storefront-image";

describe("storefrontImageUrl", () => {
  it("serves legacy Pages media through the current storefront host", () => {
    expect(
      storefrontImageUrl(
        "https://fawzaanstore.pages.dev/api/media/file/products%2Fexample.webp?version=2",
      ),
    ).toBe("/api/media/file/products%2Fexample.webp?version=2");
  });

  it("canonicalizes deployment-specific Pages media", () => {
    expect(
      storefrontImageUrl(
        "https://preview-branch.fawzaanstore.pages.dev/api/media/file/example.jpg",
      ),
    ).toBe("/api/media/file/example.jpg");
  });

  it("leaves unrelated external media unchanged", () => {
    const source = "https://cdn.example.com/products/example.webp";
    expect(storefrontImageUrl(source)).toBe(source);
  });
});
