const CHECKERBOARD_MAX_SIZE = 1200;
const LIGHT_MIN = 218;
const CHANNEL_SPREAD_MAX = 18;
const COLOR_DISTANCE_MAX = 28;

type Rgb = [number, number, number];

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function imageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = src;
  });
}

function scaleForImage(width: number, height: number) {
  const longest = Math.max(width, height);
  return longest > CHECKERBOARD_MAX_SIZE ? CHECKERBOARD_MAX_SIZE / longest : 1;
}

function isLightNeutral(r: number, g: number, b: number) {
  return (
    r >= LIGHT_MIN &&
    g >= LIGHT_MIN &&
    b >= LIGHT_MIN &&
    Math.max(r, g, b) - Math.min(r, g, b) <= CHANNEL_SPREAD_MAX
  );
}

function colorDistance(a: Rgb, r: number, g: number, b: number) {
  return Math.abs(a[0] - r) + Math.abs(a[1] - g) + Math.abs(a[2] - b);
}

function nearestColor(colors: Rgb[], r: number, g: number, b: number) {
  return colors.some((color) => colorDistance(color, r, g, b) <= COLOR_DISTANCE_MAX);
}

function collectBorderColors(data: Uint8ClampedArray, width: number, height: number): Rgb[] {
  const buckets = new Map<string, { color: Rgb; count: number }>();
  const step = Math.max(1, Math.floor(Math.min(width, height) / 80));
  const record = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 245 || !isLightNeutral(r, g, b)) return;
    const key = `${Math.round(r / 8) * 8},${Math.round(g / 8) * 8},${Math.round(b / 8) * 8}`;
    const existing = buckets.get(key);
    if (existing) existing.count += 1;
    else buckets.set(key, { color: [r, g, b], count: 1 });
  };

  for (let x = 0; x < width; x += step) {
    record(x, 0);
    record(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    record(0, y);
    record(width - 1, y);
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((bucket) => bucket.color);
}

function cleanCanvasCheckerboard(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const colors = collectBorderColors(image.data, width, height);
  if (colors.length < 2) return false;

  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  let cleared = 0;

  const matchesBackground = (index: number) => {
    const i = index * 4;
    const r = image.data[i];
    const g = image.data[i + 1];
    const b = image.data[i + 2];
    const a = image.data[i + 3];
    return a >= 245 && isLightNeutral(r, g, b) && nearestColor(colors, r, g, b);
  };

  const push = (index: number) => {
    if (visited[index] || !matchesBackground(index)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    image.data[index * 4 + 3] = 0;
    cleared += 1;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }

  if (cleared < total * 0.03) return false;
  ctx.putImageData(image, 0, 0);
  return true;
}

export async function cleanCheckerboardImageUrl(src: string): Promise<string | null> {
  if (!isBrowser() || !src || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)) return null;
  try {
    const image = await imageFromUrl(src);
    const scale = scaleForImage(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (!cleanCanvasCheckerboard(canvas)) return null;
    return canvas.toDataURL("image/webp", 0.92);
  } catch {
    return null;
  }
}

export async function cleanCheckerboardImageFile(file: File): Promise<File> {
  if (!isBrowser() || !/^image\/(png|jpe?g|webp)$/i.test(file.type)) return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const cleaned = await cleanCheckerboardImageUrl(objectUrl);
    if (!cleaned) return file;
    const blob = await fetch(cleaned).then((response) => response.blob());
    const name = file.name.replace(/\.[^.]+$/, "") || "product-image";
    return new File([blob], `${name}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
