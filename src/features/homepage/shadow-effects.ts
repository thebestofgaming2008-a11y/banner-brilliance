import type { BannerLayerStyle } from "./types";

export const HERO_PRODUCT_SHADOW = {
  shadowX: 18,
  shadowY: 12,
  shadowBlur: 20,
  shadowColor: "#320e14",
  shadowOpacity: 42,
} satisfies Partial<BannerLayerStyle>;

function hexChannel(value: string) {
  return Number.parseInt(value, 16);
}

export function shadowColorWithOpacity(style: BannerLayerStyle) {
  const color = style.shadowColor || "#000000";
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  const embeddedOpacity = match?.[2] ? (hexChannel(match[2]) / 255) * 100 : undefined;
  const opacity = Math.min(100, Math.max(0, style.shadowOpacity ?? embeddedOpacity ?? 34)) / 100;

  if (!match) {
    return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
  }

  const channels = match[1];
  return `rgba(${hexChannel(channels.slice(0, 2))}, ${hexChannel(channels.slice(2, 4))}, ${hexChannel(channels.slice(4, 6))}, ${Number(opacity.toFixed(3))})`;
}

export function layerShadowValue(style: BannerLayerStyle) {
  if ((style.shadowBlur ?? 0) <= 0 || (style.shadowOpacity ?? 100) <= 0) return undefined;
  return `${style.shadowX ?? 0}px ${style.shadowY ?? 8}px ${style.shadowBlur}px ${shadowColorWithOpacity(style)}`;
}
