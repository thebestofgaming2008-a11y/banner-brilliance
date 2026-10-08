type StockedProduct = {
  slug: string;
  inStock?: boolean;
  stockQuantity?: number;
};

/** Apply only to default listing order, after the existing featured ordering. */
export function stockFirstProducts<T extends StockedProduct>(products: readonly T[]): T[] {
  const rank = (product: T) => {
    // Match the availability shown by the existing product cards.
    const available = product.inStock !== false && Number(product.stockQuantity ?? 1) > 0;
    if (!available) return 2;
    return product.slug === "saudi-red-shemagh" ? 0 : 1;
  };

  // Stable sort keeps the existing featured order within each availability group.
  return [...products].sort((a, b) => rank(a) - rank(b));
}
