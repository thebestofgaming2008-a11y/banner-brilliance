import { DEFAULT_HERO_GRADIENT } from "./brand";
import type {
  BannerFill,
  BannerLayer,
  BannerLayerStyle,
  BannerScene,
  CollectionCard,
  CollectionFeatureProps,
  HeroSlide,
  HomepageContentItem,
  HomepageData,
  PromoBannerProps,
} from "./types";

export type StudioBannerRef = {
  key: string;
  itemId: string;
  kind: "hero" | "collection-feature" | "standalone";
  index?: number;
  label: string;
  group: string;
};

const baseStyle = (overrides: Partial<BannerLayerStyle>): BannerLayerStyle => ({
  x: 0,
  y: 0,
  width: 30,
  height: 10,
  rotation: 0,
  opacity: 100,
  visible: true,
  ...overrides,
});

export function createStudioId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function textLayer(
  id: string,
  name: string,
  text: string,
  style: Partial<BannerLayerStyle>,
  semantic: BannerLayer["semantic"] = "p",
): BannerLayer {
  return {
    id,
    name,
    type: "text",
    semantic,
    text,
    style: baseStyle({
      fontFamily: "schibsted",
      fontSize: 16,
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: "left",
      textTransform: "none",
      color: "#ffffff",
      ...style,
    }),
  };
}

function buttonLayer(
  id: string,
  text: string,
  href: string,
  style: Partial<BannerLayerStyle>,
): BannerLayer {
  return {
    id,
    name: "Button",
    type: "button",
    text,
    href,
    style: baseStyle({
      width: 18,
      height: 7,
      fontFamily: "schibsted",
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1,
      letterSpacing: 0,
      textAlign: "center",
      textTransform: "uppercase",
      color: "#000000",
      backgroundColor: "#ffffff",
      borderColor: "#ffffff",
      borderWidth: 0,
      borderRadius: 0,
      paddingX: 20,
      paddingY: 12,
      ...style,
    }),
  };
}

function imageLayer(
  id: string,
  name: string,
  src: string,
  style: Partial<BannerLayerStyle>,
): BannerLayer {
  return {
    id,
    name,
    type: "image" as const,
    src,
    style: baseStyle({
      objectFit: "contain",
      objectPosition: "center bottom",
      ...style,
    }),
  };
}

function defaultFills(
  color: string,
  image: string,
  gradient?: {
    enabled?: "on" | "off";
    startColor?: string;
    endColor?: string;
    angle?: number;
    opacity?: number;
  },
): BannerFill[] {
  const fills: BannerFill[] = [
    { id: "fill-solid", type: "solid", enabled: true, opacity: 100, color },
  ];
  if (image) {
    fills.push({
      id: "fill-image",
      type: "image",
      enabled: true,
      opacity: 100,
      src: image,
      fit: "cover",
      position: "center",
    });
  }
  const selected = { ...DEFAULT_HERO_GRADIENT, ...gradient };
  if (selected.enabled === "on") {
    fills.push({
      id: "fill-gradient",
      type: "linear",
      enabled: true,
      opacity: selected.opacity,
      angle: selected.angle,
      stops: [
        { color: selected.startColor, position: 0 },
        { color: selected.endColor, position: 100 },
      ],
    });
  }
  return fills;
}

export function sceneFromHero(slide: HeroSlide, index = 0): BannerScene {
  const original = (slide.layout ?? "original") === "original";
  const light = (slide.textTone ?? "light") === "light";
  const color = light ? "#ffffff" : "#000000";
  if (original) {
    const desktopWidth = 1440;
    const desktopHeight = 820;
    const mobileWidth = 390;
    const mobileHeight = 649;
    const originalFrameWidth = (desktopHeight * mobileWidth) / mobileHeight;
    const originalFrameLeft = (desktopWidth - originalFrameWidth) / 2;
    const desktopX = (value: number) =>
      ((originalFrameLeft + (value / mobileWidth) * originalFrameWidth) / desktopWidth) * 100;
    const desktopWidthPercent = (value: number) =>
      (((value / mobileWidth) * originalFrameWidth) / desktopWidth) * 100;
    const titleFrame =
      index === 0
        ? { left: 37, top: 121, width: 316 }
        : index === 1
          ? { left: 41, top: 100, width: 319 }
          : { left: 30, top: 110, width: 330 };
    const gradient = { ...DEFAULT_HERO_GRADIENT, ...slide.gradient };
    return {
      version: 1,
      name: slide.title || `Hero ${index + 1}`,
      height: desktopHeight,
      mobileHeight,
      coordinateMode: "full",
      fills: [
        {
          id: "fill-solid",
          type: "solid",
          enabled: true,
          opacity: 100,
          color: slide.backgroundColor || "#F6AD32",
        },
        ...(slide.backgroundImage
          ? [
              {
                id: "fill-image",
                type: "image" as const,
                enabled: true,
                opacity: 100,
                src: slide.backgroundImage,
                fit: "cover" as const,
                position: slide.imageFocus || "center",
              },
            ]
          : []),
        ...(gradient.enabled === "on"
          ? [
              {
                id: "fill-gradient",
                type: "linear" as const,
                enabled: true,
                opacity: gradient.opacity,
                angle: gradient.angle,
                stops: [
                  { color: gradient.startColor, position: 0 },
                  ...(gradient.startColor.toLowerCase() === "#fbcb3d" &&
                  gradient.endColor.toLowerCase() === "#f18532"
                    ? [{ color: "#F8B937", position: 58 }]
                    : []),
                  { color: gradient.endColor, position: 100 },
                ],
              },
            ]
          : []),
      ],
      layers: [
        imageLayer("foreground", "Product image", slide.foregroundImage, {
          x: desktopX(0),
          y: 0,
          width: desktopWidthPercent(mobileWidth),
          height: 100,
          objectFit: "contain",
          objectPosition: "center bottom",
        }),
        textLayer(
          "title",
          "Title",
          slide.title,
          {
            x: desktopX(titleFrame.left),
            y: (titleFrame.top / mobileHeight) * 100,
            width: desktopWidthPercent(titleFrame.width),
            height: 8.1,
            fontFamily: "instrument",
            fontSize: (52 / mobileHeight) * desktopHeight,
            fontWeight: 400,
            lineHeight: 1,
            textAlign: "center",
            whiteSpace: "nowrap",
            color,
          },
          "h1",
        ),
        textLayer("body", "Subtitle", slide.body, {
          x: desktopX(titleFrame.left),
          y: ((titleFrame.top + 58) / mobileHeight) * 100,
          width: desktopWidthPercent(titleFrame.width),
          height: 5,
          fontFamily: "schibsted",
          fontSize: (14 / mobileHeight) * desktopHeight,
          fontWeight: 500,
          lineHeight: 1.2,
          textAlign: "center",
          color,
        }),
        buttonLayer("button", slide.buttonLabel || "Shop the collection", slide.buttonUrl, {
          x: desktopX(25),
          y: (614 / mobileHeight) * 100,
          width: desktopWidthPercent((42 / 100) * mobileWidth),
          height: 2.6,
          color,
          backgroundColor: "#00000000",
          borderWidth: 0,
          textAlign: "left",
          textDecoration: "underline",
          paddingX: 0,
          paddingY: 0,
        }),
      ].map((layer) => {
        if (layer.id === "foreground") {
          return {
            ...layer,
            mobileStyle: { x: 0, y: 0, width: 100, height: 100 },
          };
        }
        if (layer.id === "title" || layer.id === "body") {
          return {
            ...layer,
            mobileStyle: {
              x: (titleFrame.left / mobileWidth) * 100,
              y: ((titleFrame.top + (layer.id === "body" ? 58 : 0)) / mobileHeight) * 100,
              width: (titleFrame.width / mobileWidth) * 100,
              height: layer.style.height,
              fontSize: layer.id === "title" ? 52 : 14,
            },
          };
        }
        return {
          ...layer,
          mobileStyle: {
            x: (25 / mobileWidth) * 100,
            y: (614 / mobileHeight) * 100,
            width: 42,
            height: 2.6,
          },
        };
      }),
    };
  }
  const align = slide.textAlign ?? "left";
  return {
    version: 1,
    name: slide.title || `Hero ${index + 1}`,
    height: 720,
    mobileHeight: 620,
    fills: defaultFills(slide.backgroundColor || "#F6AD32", slide.backgroundImage, slide.gradient),
    layers: [
      imageLayer("foreground", "Product image", slide.foregroundImage, {
        x: 50,
        y: 4,
        width: 47,
        height: 96,
      }),
      textLayer("eyebrow", "Eyebrow", slide.eyebrow, {
        x: 6,
        y: 54,
        width: 38,
        height: 5,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        textAlign: align,
        color,
      }),
      textLayer(
        "title",
        "Title",
        slide.title,
        {
          x: 6,
          y: 60,
          width: 43,
          height: 16,
          fontFamily: (slide.titleFont ?? "display") === "display" ? "instrument" : "schibsted",
          fontSize: slide.titleSize ?? 76,
          fontWeight: 400,
          lineHeight: 0.92,
          textAlign: align,
          color,
        },
        "h1",
      ),
      textLayer("body", "Description", slide.body, {
        x: 6,
        y: 77,
        width: 34,
        height: 7,
        fontSize: 14,
        lineHeight: 1.45,
        textAlign: align,
        color,
      }),
      buttonLayer("button", slide.buttonLabel, slide.buttonUrl, {
        x: 6,
        y: 86,
        width: 18,
        height: 7,
      }),
    ],
  };
}

export function sceneFromCollectionCard(card: CollectionCard, index = 0): BannerScene {
  return {
    version: 1,
    name: card.title || `Collection banner ${index + 1}`,
    height: 620,
    mobileHeight: 520,
    fills: [
      { id: "fill-solid", type: "solid", enabled: true, opacity: 100, color: "#111111" },
      {
        id: "fill-image",
        type: "image",
        enabled: Boolean(card.image),
        opacity: 100,
        src: card.image,
        fit: "cover",
        position: "center",
      },
      {
        id: "fill-gradient",
        type: "linear",
        enabled: true,
        opacity: 82,
        angle: 0,
        stops: [
          { color: "#000000", position: 0 },
          { color: "#00000000", position: 72 },
        ],
      },
    ],
    layers: [
      textLayer("eyebrow", "Eyebrow", card.eyebrow, {
        x: 7,
        y: 70,
        width: 65,
        height: 5,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
      }),
      textLayer(
        "title",
        "Title",
        card.title,
        {
          x: 7,
          y: 76,
          width: 78,
          height: 12,
          fontFamily: "schibsted",
          fontSize: 60,
          fontWeight: 400,
          lineHeight: 0.95,
        },
        "h3",
      ),
      textLayer("body", "Description", card.body, {
        x: 7,
        y: 88,
        width: 66,
        height: 5,
        fontSize: 14,
        lineHeight: 1.4,
      }),
      buttonLayer("button", card.buttonLabel, card.buttonUrl, {
        x: 7,
        y: 94,
        width: 25,
        height: 7,
      }),
    ],
  };
}

const CUSTOM_BANNER_TEMPLATE_VERSION = 2;
const CUSTOM_BANNER_HEIGHT = 620;
const CUSTOM_BANNER_MOBILE_HEIGHT = 500;

function presetBannerImage(src: string, alt = ""): BannerLayer {
  const image = imageLayer("banner-image", "Banner image", src, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    locked: true,
    objectFit: "cover",
    objectPosition: "center",
    cropX: 0,
    cropY: 0,
    cropZoom: 100,
    lockAspectRatio: true,
  });
  image.alt = alt;
  image.mobileStyle = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    locked: true,
    objectFit: "cover",
    objectPosition: "center",
    cropX: 0,
    cropY: 0,
    cropZoom: 100,
    lockAspectRatio: true,
  };
  return image;
}

export function migratePresetBannerScene(
  generated: BannerScene,
  previous?: BannerScene,
  preserveCrop = true,
  preserveTextStyles = true,
): BannerScene {
  if (!previous) return generated;
  const previousImage = previous.layers?.find((layer) => layer.id === "banner-image");
  const previousFill = [...(previous.fills ?? [])]
    .reverse()
    .find((fill) => fill.type === "image" && fill.src);
  const currentTemplate = previous.templateVersion === CUSTOM_BANNER_TEMPLATE_VERSION;
  const cropValue = (value: number | undefined) =>
    Math.min(50, Math.max(-50, Number.isFinite(value) ? Number(value) : 0));
  const zoomValue = (value: number | undefined) =>
    Math.min(300, Math.max(100, Number.isFinite(value) ? Number(value) : 100));
  const preservedTextStyle = (
    style: Partial<BannerLayerStyle> | undefined,
  ): Partial<BannerLayerStyle> => {
    if (!style) return {};
    const result: Partial<BannerLayerStyle> = {
      x: style.x,
      y: style.y,
      width: style.width,
      height: style.height,
      rotation: style.rotation,
    };
    if (preserveTextStyles) {
      result.fontFamily = style.fontFamily;
      result.fontSize = style.fontSize;
      result.fontWeight = style.fontWeight;
      result.lineHeight = style.lineHeight;
      result.textAlign = style.textAlign;
      result.color = style.color;
    }
    return Object.fromEntries(
      Object.entries(result).filter(([, value]) => value !== undefined),
    ) as Partial<BannerLayerStyle>;
  };
  return {
    ...generated,
    layers: generated.layers.map((layer) => {
      if (layer.id !== "banner-image") {
        const previousLayer = currentTemplate
          ? previous.layers.find((candidate) => candidate.id === layer.id)
          : undefined;
        if (!previousLayer || layer.type !== "text") return layer;
        return {
          ...layer,
          style: {
            ...layer.style,
            ...preservedTextStyle(previousLayer.style),
          },
          mobileStyle: {
            ...(layer.mobileStyle ?? {}),
            ...preservedTextStyle(previousLayer.mobileStyle),
          },
        };
      }
      if (!preserveCrop) return layer;
      return {
        ...layer,
        style: {
          ...layer.style,
          cropX: cropValue(previousImage?.style.cropX ?? previousFill?.offsetX),
          cropY: cropValue(previousImage?.style.cropY ?? previousFill?.offsetY),
          cropZoom: zoomValue(previousImage?.style.cropZoom ?? previousFill?.zoom),
        },
        mobileStyle: {
          ...(layer.mobileStyle ?? {}),
          cropX: cropValue(
            previousImage?.mobileStyle?.cropX ??
              previousImage?.style.cropX ??
              previousFill?.offsetX,
          ),
          cropY: cropValue(
            previousImage?.mobileStyle?.cropY ??
              previousImage?.style.cropY ??
              previousFill?.offsetY,
          ),
          cropZoom: zoomValue(
            previousImage?.mobileStyle?.cropZoom ??
              previousImage?.style.cropZoom ??
              previousFill?.zoom,
          ),
        },
      };
    }),
  };
}

function presetBannerTextLayers(
  props: Pick<
    CollectionFeatureProps,
    | "contentMode"
    | "eyebrow"
    | "title"
    | "body"
    | "textTone"
    | "textColor"
    | "textAlign"
    | "titleSize"
    | "mobileTitleSize"
  >,
) {
  const imageOnly = props.contentMode === "image-only";
  const light = props.textTone === "light";
  const color = props.textColor || (light ? "#ffffff" : "#000000");
  const overlay: BannerLayer = {
    id: "banner-overlay",
    name: "Text overlay",
    type: "shape",
    style: baseStyle({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      locked: true,
      visible: !imageOnly,
      backgroundImage: light
        ? "linear-gradient(180deg, transparent 30%, rgba(0, 0, 0, 0.72) 100%)"
        : "linear-gradient(180deg, transparent 30%, rgba(255, 255, 255, 0.82) 100%)",
    }),
  };
  const eyebrow = textLayer("eyebrow", "Eyebrow", props.eyebrow, {
    x: 6,
    y: 56,
    width: 88,
    height: 5,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    textAlign: props.textAlign,
    color,
    visible: !imageOnly,
  });
  eyebrow.mobileStyle = { x: 6, y: 57, width: 88, height: 5 };
  const title = textLayer(
    "title",
    "Title",
    props.title,
    {
      x: 6,
      y: 63,
      width: 88,
      height: 16,
      fontFamily: "schibsted",
      fontSize: props.titleSize,
      fontWeight: 400,
      lineHeight: 0.95,
      textAlign: props.textAlign,
      color,
      visible: !imageOnly,
    },
    "h2",
  );
  title.mobileStyle = {
    x: 6,
    y: 64,
    width: 88,
    height: 16,
    fontSize: props.mobileTitleSize,
  };
  const body = textLayer("body", "Description", props.body, {
    x: 6,
    y: 82,
    width: 88,
    height: 9,
    fontSize: 14,
    lineHeight: 1.4,
    textAlign: props.textAlign,
    color,
    visible: !imageOnly,
  });
  body.mobileStyle = { x: 6, y: 82, width: 88, height: 9 };
  return imageOnly ? [] : [overlay, eyebrow, title, body];
}

export function sceneFromCollectionFeature(props: CollectionFeatureProps): BannerScene {
  const image = presetBannerImage(props.image, props.imageAlt);
  return {
    version: 1,
    templateVersion: CUSTOM_BANNER_TEMPLATE_VERSION,
    name: props.title || "Collection with products",
    height: CUSTOM_BANNER_HEIGHT,
    mobileHeight: CUSTOM_BANNER_MOBILE_HEIGHT,
    fills: [
      { id: "fill-solid", type: "solid", enabled: true, opacity: 100, color: props.bannerColor },
    ],
    layers: [image, ...presetBannerTextLayers(props)],
  };
}

export function sceneFromPromo(props: PromoBannerProps): BannerScene {
  const image = presetBannerImage(props.backgroundImage, props.imageAlt);
  return {
    version: 1,
    templateVersion: CUSTOM_BANNER_TEMPLATE_VERSION,
    name: props.title || "Standalone banner",
    height: CUSTOM_BANNER_HEIGHT,
    mobileHeight: CUSTOM_BANNER_MOBILE_HEIGHT,
    fills: [
      {
        id: "fill-solid",
        type: "solid",
        enabled: true,
        opacity: 100,
        color: props.backgroundColor,
      },
    ],
    layers: [image, ...presetBannerTextLayers(props)],
  };
}

export function ensureCustomBannerScenes(data: HomepageData): HomepageData {
  const next = JSON.parse(JSON.stringify(data)) as HomepageData;
  next.content = next.content.map((item) => {
    if (item.type === "CollectionFeature") {
      item.props.contentMode =
        item.props.contentMode === "image-only" ? "image-only" : "text-overlay";
      item.props.imageAlt = String(item.props.imageAlt ?? "");
      item.props.imageLink = String(item.props.imageLink ?? "");
      item.props.scene = migratePresetBannerScene(
        sceneFromCollectionFeature(item.props),
        item.props.scene,
      );
    } else if (item.type === "PromoBanner") {
      item.props.contentMode =
        item.props.contentMode === "image-only" ? "image-only" : "text-overlay";
      item.props.imageAlt = String(item.props.imageAlt ?? "");
      item.props.imageLink = String(item.props.imageLink ?? "");
      item.props.scene = migratePresetBannerScene(sceneFromPromo(item.props), item.props.scene);
    }
    return item;
  });
  return next;
}

export function ensureHomepageScenes(data: HomepageData): HomepageData {
  const next = ensureCustomBannerScenes(data);
  next.content = next.content.map((item) => {
    if (item.type === "Hero") {
      item.props.slides = item.props.slides.map((slide, index) => ({
        ...slide,
        scene:
          slide.scene?.coordinateMode === "original-hero"
            ? migrateOriginalHeroScene(slide.scene)
            : (slide.scene ?? sceneFromHero(slide, index)),
      }));
    }
    return item;
  });
  return next;
}

function migrateOriginalHeroScene(scene: BannerScene): BannerScene {
  const desktopWidth = 1440;
  const frameWidth = (scene.height * 390) / 649;
  const frameWidthPercent = (frameWidth / desktopWidth) * 100;
  const frameLeftPercent = (100 - frameWidthPercent) / 2;
  return {
    ...scene,
    coordinateMode: "full",
    layers: scene.layers.map((layer) => ({
      ...layer,
      style: {
        ...layer.style,
        x: frameLeftPercent + (layer.style.x * frameWidthPercent) / 100,
        width: (layer.style.width * frameWidthPercent) / 100,
      },
      mobileStyle: {
        x: layer.style.x,
        y: layer.style.y,
        width: layer.style.width,
        height: layer.style.height,
        ...(layer.mobileStyle ?? {}),
      },
    })),
  };
}

export function listStudioBanners(data: HomepageData): StudioBannerRef[] {
  const refs: StudioBannerRef[] = [];
  data.content.forEach((item) => {
    const itemId = item.props.id;
    if (item.type === "Hero") {
      item.props.slides.forEach((slide, index) =>
        refs.push({
          key: `${itemId}:hero:${index}`,
          itemId,
          kind: "hero",
          index,
          label: slide.scene?.name || slide.title || `Hero ${index + 1}`,
          group: "Hero carousel",
        }),
      );
    } else if (item.type === "CollectionFeature") {
      refs.push({
        key: `${itemId}:feature`,
        itemId,
        kind: "collection-feature",
        label: item.props.scene?.name || item.props.title,
        group: "Banner + products",
      });
    } else if (item.type === "PromoBanner") {
      refs.push({
        key: `${itemId}:standalone`,
        itemId,
        kind: "standalone",
        label: item.props.scene?.name || item.props.title,
        group: "Standalone banners",
      });
    }
  });
  return refs;
}

export function getScene(data: HomepageData, ref: StudioBannerRef | null): BannerScene | null {
  if (!ref) return null;
  const item = data.content.find((entry) => entry.props.id === ref.itemId);
  if (!item) return null;
  if (ref.kind === "hero" && item.type === "Hero")
    return item.props.slides[ref.index ?? 0]?.scene ?? null;
  if (ref.kind === "collection-feature" && item.type === "CollectionFeature")
    return item.props.scene ?? null;
  if (ref.kind === "standalone" && item.type === "PromoBanner") return item.props.scene ?? null;
  return null;
}

export function updateScene(
  data: HomepageData,
  ref: StudioBannerRef,
  updater: (scene: BannerScene) => BannerScene,
): HomepageData {
  const next = JSON.parse(JSON.stringify(data)) as HomepageData;
  const item = next.content.find((entry) => entry.props.id === ref.itemId);
  if (!item) return next;
  if (ref.kind === "hero" && item.type === "Hero") {
    const slide = item.props.slides[ref.index ?? 0];
    if (slide?.scene) slide.scene = updater(slide.scene);
  } else if (
    ref.kind === "collection-feature" &&
    item.type === "CollectionFeature" &&
    item.props.scene
  ) {
    item.props.scene = updater(item.props.scene);
  } else if (ref.kind === "standalone" && item.type === "PromoBanner" && item.props.scene) {
    item.props.scene = updater(item.props.scene);
  }
  return next;
}

export function createLayer(type: BannerLayer["type"], order: number): BannerLayer {
  const id = createStudioId(type);
  if (type === "image")
    return imageLayer(id, `Image ${order}`, "", { x: 55, y: 18, width: 35, height: 64 });
  if (type === "shape") {
    return {
      id,
      name: `Rectangle ${order}`,
      type,
      style: baseStyle({
        x: 12,
        y: 18,
        width: 24,
        height: 24,
        backgroundColor: "#F6AD32",
        borderColor: "#000000",
        borderWidth: 0,
        borderRadius: 0,
      }),
    };
  }
  if (type === "button") return buttonLayer(id, "Button", "/shop", { x: 10, y: 72 });
  return textLayer(
    id,
    `Text ${order}`,
    "Double-click to edit",
    {
      x: 10,
      y: 28,
      width: 42,
      height: 12,
      fontFamily: "instrument",
      fontSize: 52,
      fontWeight: 400,
    },
    "p",
  );
}

export function createHeroSlide(index: number): HeroSlide {
  const slide: HeroSlide = {
    eyebrow: "",
    title: `NEW COLLECTION ${index + 1}`,
    body: "Discover the latest collection",
    buttonLabel: "Shop the collection",
    buttonUrl: "/shop",
    backgroundImage: "",
    foregroundImage: "",
    backgroundColor: "#F6AD32",
    imageFocus: "center",
    gradient: { ...DEFAULT_HERO_GRADIENT },
    layout: "original",
    textAlign: "center",
    textTone: "light",
    titleFont: "display",
    titleSize: 52,
    mobileTitleSize: 52,
    contentWidth: 650,
    contentOffsetX: 6,
    contentOffsetY: 9,
    foregroundScale: 100,
    overlayOpacity: 0,
  };
  slide.scene = sceneFromHero(slide, index);
  return slide;
}

export function createStandaloneBanner(): HomepageContentItem {
  const id = createStudioId("banner");
  const props: PromoBannerProps & { id: string } = {
    id,
    contentMode: "text-overlay",
    imageAlt: "",
    imageLink: "",
    eyebrow: "Collection",
    title: "NEW BANNER",
    body: "",
    buttonLabel: "",
    buttonUrl: "",
    backgroundImage: "",
    foregroundImage: "",
    backgroundColor: "#F6AD32",
    textTone: "light",
    textColor: "#ffffff",
    textAlign: "left",
    titleFont: "sans",
    titleSize: 72,
    mobileTitleSize: 44,
    buttonBackgroundColor: "#ffffff",
    buttonTextColor: "#000000",
    imageFocus: "center",
    foregroundScale: 55,
    overlayOpacity: 12,
    minHeight: 560,
  };
  props.scene = sceneFromPromo(props);
  return { type: "PromoBanner", props };
}

export function createCollectionWithProducts(
  collection = "all",
  layout: CollectionFeatureProps["layout"] = "banner-top",
): HomepageContentItem {
  const id = createStudioId("collection");
  const props: CollectionFeatureProps & { id: string } = {
    id,
    contentMode: "text-overlay",
    imageAlt: "",
    imageLink: "",
    eyebrow: "Collection",
    title: "NEW COLLECTION",
    body: "",
    buttonLabel: "",
    buttonUrl: "",
    collection,
    image: "",
    backgroundColor: "#ffffff",
    bannerColor: "#111111",
    textTone: "light",
    textColor: "#ffffff",
    textAlign: "left",
    titleFont: "sans",
    titleSize: 68,
    mobileTitleSize: 42,
    buttonBackgroundColor: "#ffffff",
    buttonTextColor: "#000000",
    productLimit: 4,
    productSelection: "collection",
    layout,
  };
  props.scene = sceneFromCollectionFeature(props);
  return { type: "CollectionFeature", props };
}
