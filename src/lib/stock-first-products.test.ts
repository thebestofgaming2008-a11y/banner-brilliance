import { describe, expect, it } from "vitest";
import { stockFirstProducts } from "./stock-first-products";

describe("default stock-first listing", () => {
  it("features the available Saudi shemagh and moves sold-out products last", () => {
    const products = [
      { slug: "yemeni-shemagh", stockQuantity: 0 },
      { slug: "khadija-niqab", stockQuantity: 3 },
      { slug: "white-kufi", stockQuantity: 1 },
      { slug: "saudi-red-shemagh", stockQuantity: 9 },
    ];
    expect(stockFirstProducts(products).map((product) => product.slug)).toEqual([
      "saudi-red-shemagh",
      "khadija-niqab",
      "white-kufi",
      "yemeni-shemagh",
    ]);
  });

  it("does not keep the Saudi shemagh first when it sells out", () => {
    expect(
      stockFirstProducts([
        { slug: "saudi-red-shemagh", stockQuantity: 0 },
        { slug: "available", stockQuantity: 1 },
      ]).map((product) => product.slug),
    ).toEqual(["available", "saudi-red-shemagh"]);
  });

  it("honours explicit unavailability and matches card handling of missing stock", () => {
    expect(
      stockFirstProducts([
        { slug: "disabled", inStock: false, stockQuantity: 20 },
        { slug: "negative", stockQuantity: -1 },
        { slug: "fallback" },
        { slug: "available", inStock: true, stockQuantity: 1 },
      ]).map((product) => product.slug),
    ).toEqual(["fallback", "available", "disabled", "negative"]);
  });

  it("preserves featured order rather than sorting by exact stock quantity", () => {
    const products = [
      { slug: "first", stockQuantity: 1 },
      { slug: "second", stockQuantity: 100 },
    ];
    expect(stockFirstProducts(products)).toEqual(products);
  });

  it("does not mutate the input array or product records", () => {
    const soldOut = Object.freeze({ slug: "sold-out", stockQuantity: 0 });
    const available = Object.freeze({ slug: "available", stockQuantity: 1 });
    const input = Object.freeze([soldOut, available]);
    const output = stockFirstProducts(input);
    expect(input).toEqual([soldOut, available]);
    expect(output).toEqual([available, soldOut]);
    expect(output[0]).toBe(available);
  });

  it("handles filtered lists without the featured item and empty collections", () => {
    expect(stockFirstProducts([])).toEqual([]);
    expect(stockFirstProducts([{ slug: "only-product", stockQuantity: 0 }])).toEqual([
      { slug: "only-product", stockQuantity: 0 },
    ]);
  });
});
