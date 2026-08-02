const OPTIMIZED_PRODUCT_MEDIA: Record<string, string> = {
  "1785371963696-802f993b-41ec-4c0e-9791-e0871755211e.jpg": "/product-media/sabr-watch-black.webp",
  "1784525479412-413ab418-fe61-43d9-bf6c-9b9f2fb7fca8.jpg": "/product-media/sabr-watch-white.webp",
  "1784454353251-f538ae9f-3b66-4696-b7aa-8edae7295335.png": "/product-media/khadija-niqab.webp",
};

export function storefrontImageUrl(src: string) {
  const clean = src.split("#")[0];
  const match = Object.entries(OPTIMIZED_PRODUCT_MEDIA).find(([fileName]) =>
    clean.includes(fileName),
  );
  return match?.[1] ?? src;
}
