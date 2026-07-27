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
      textAutoResize: "none",
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
      lockAspectRatio: true,
      ...style,
    }),
  };
}

const LUXURY_HERO_TEMPLATE_VERSION = 3;

function defaultHeroSubtitle(slide: HeroSlide, index: number) {
  if (slide.body.trim()) return slide.body;
  if (index === 0 || /ikhwaan/i.test(slide.title)) return "LIL-MUSLIMEEN";
  if (index === 1 || /salihaat|akhwat/i.test(slide.title)) return "LIL MUSLIMAAT";
  return "";
}

function originalHeroCaptionLayers(slide: HeroSlide, index: number, color: string) {
  const title = textLayer(
    "title",
    "Title",
    slide.title,
    {
      x: -86,
      y: 53,
      width: 84,
      height: 11,
      fontFamily: "instrument",
      fontSize: 58,
      fontWeight: 400,
      lineHeight: 0.95,
      textAlign: "left",
      whiteSpace: "nowrap",
      color: "#211719",
    },
    "h1",
  );
  title.mobileStyle = {
    x: 6,
    y: 72,
    width: 88,
    height: 8,
    fontSize: 42,
    lineHeight: 0.95,
    textAlign: "center",
    color,
  };

  const subtitle = textLayer("body", "Subtitle", defaultHeroSubtitle(slide, index), {
    x: -86,
    y: 65.5,
    width: 70,
    height: 4,
    fontFamily: "schibsted",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1,
    textAlign: "left",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    color: "#211719",
  });
  subtitle.mobileStyle = {
    x: 12,
    y: 80.5,
    width: 76,
    height: 3,
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
    color,
  };

  const button = buttonLayer(
    "button",
    slide.buttonLabel || "Shop the collection",
    slide.buttonUrl,
    {
      x: -86,
      y: 72,
      width: 38,
      height: 6.2,
      color: "#ffffff",
      backgroundColor: "#211719",
      borderWidth: 0,
      borderRadius: 2,
      fontSize: 12,
      fontWeight: 700,
      textAlign: "center",
      textDecoration: "none",
      paddingX: 16,
      paddingY: 0,
    },
  );
  button.mobileStyle = {
    x: 27,
    y: 86,
    width: 46,
    height: 6.8,
    fontSize: 11,
    textAlign: "center",
    color: "#211719",
    backgroundColor: "#ffffff",
    borderRadius: 2,
  };

  return [title, subtitle, button];
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
    const mobileHeight = 649;
    const gradient = { ...DEFAULT_HERO_GRADIENT, ...slide.gradient };
    return {
      version: 1,
      templateVersion: LUXURY_HERO_TEMPLATE_VERSION,
      name: slide.title || `Hero ${index + 1}`,
      height: 820,
      mobileHeight,
      coordinateMode: "original-hero",
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
          x: 8,
          y: 0,
          width: 115,
          height: 100,
          objectFit: "contain",
          objectPosition: "center bottom",
        }),
        ...originalHeroCaptionLayers(slide, index, color),
      ].map((layer) =>
        layer.id === "foreground"
          ? { ...layer, mobileStyle: { x: 0, y: 0, width: 100, height: 100 } }
          : layer,
      ),
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

const CUSTOM_BANNER_TEMPLATE_VERSION = 4;
const CUSTOM_BANNER_HEIGHT = 520;
const CUSTOM_BANNER_MOBILE_HEIGHT = 420;

function presetBannerImage(src: string, alt = ""): BannerLayer {
  const image = imageLayer("banner-image", "Banner image", src, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    locked: false,
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
    locked: false,
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
): BannerScene {
  if (!previous) return generated;
  const previousImage = previous.layers?.find((layer) => layer.id === "banner-image");
  const previousFill = [...(previous.fills ?? [])]
    .reverse()
    .find((fill) => fill.type === "image" && fill.src);
  const cropValue = (value: number | undefined) =>
    Math.min(50, Math.max(-50, Number.isFinite(value) ? Number(value) : 0));
  const zoomValue = (value: number | undefined) =>
    Math.min(300, Math.max(100, Number.isFinite(value) ? Number(value) : 100));
  const frameValue = (value: number | undefined, fallback: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(value) ? Number(value) : fallback));
  return {
    ...generated,
    layers: generated.layers.map((layer) => {
      if (layer.id !== "banner-image") return layer;
      if (!preserveCrop) return layer;
      return {
        ...layer,
        style: {
          ...layer.style,
          x: frameValue(previousImage?.style.x, layer.style.x, -100, 200),
          y: frameValue(previousImage?.style.y, layer.style.y, -100, 200),
          width: frameValue(previousImage?.style.width, layer.style.width, 0.5, 250),
          height: frameValue(previousImage?.style.height, layer.style.height, 0.5, 250),
          locked: false,
          cropX: cropValue(previousImage?.style.cropX ?? previousFill?.offsetX),
          cropY: cropValue(previousImage?.style.cropY ?? previousFill?.offsetY),
          cropZoom: zoomValue(previousImage?.style.cropZoom ?? previousFill?.zoom),
        },
        mobileStyle: {
          ...(layer.mobileStyle ?? {}),
          x: frameValue(
            previousImage?.mobileStyle?.x,
            layer.mobileStyle?.x ?? layer.style.x,
            -100,
            200,
          ),
          y: frameValue(
            previousImage?.mobileStyle?.y,
            layer.mobileStyle?.y ?? layer.style.y,
            -100,
            200,
          ),
          width: frameValue(
            previousImage?.mobileStyle?.width,
            layer.mobileStyle?.width ?? layer.style.width,
            0.5,
            250,
          ),
          height: frameValue(
            previousImage?.mobileStyle?.height,
            layer.mobileStyle?.height ?? layer.style.height,
            0.5,
            250,
          ),
          locked: false,
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
    "contentMode" | "eyebrow" | "title" | "body" | "buttonLabel" | "buttonUrl"
  >,
  includeButton = false,
) {
  const imageOnly = props.contentMode === "image-only";
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
      backgroundImage:
        "linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.15) 50%, rgba(0, 0, 0, 0.76) 100%)",
    }),
  };
  const eyebrow = textLayer("eyebrow", "Eyebrow", props.eyebrow, {
    x: 3.05,
    y: 72.2,
    width: 93.9,
    height: 2.2,
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1,
    textTransform: "uppercase",
    textAlign: "left",
    color: "#ffffff",
    opacity: 72,
    locked: true,
    visible: !imageOnly,
  });
  eyebrow.mobileStyle = { x: 6.88, y: 73.4, width: 86.24, height: 2.5 };
  const title = textLayer(
    "title",
    "Title",
    props.title,
    {
      x: 3.05,
      y: 75.65,
      width: 93.9,
      height: 11,
      fontFamily: "schibsted",
      fontSize: 62,
      fontWeight: 850,
      lineHeight: 0.88,
      textAlign: "left",
      textTransform: "uppercase",
      color: "#ffffff",
      locked: true,
      visible: !imageOnly,
    },
    "h2",
  );
  title.mobileStyle = {
    x: 6.88,
    y: 77.7,
    width: 86.24,
    height: 10,
    fontSize: 38,
  };
  const body = textLayer("body", "Description", props.body, {
    x: 3.05,
    y: 89.2,
    width: 27.12,
    height: 4,
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.55,
    textAlign: "left",
    color: "#ffffff",
    opacity: 74,
    locked: true,
    visible: !imageOnly,
  });
  body.mobileStyle = { x: 6.88, y: 89.5, width: 86.24, height: 4.8 };
  const button = buttonLayer(
    "button",
    props.buttonLabel || "Shop edit",
    props.buttonUrl || "/shop",
    {
      x: 3.05,
      y: 94,
      width: 12,
      height: 8.46,
      fontSize: 10,
      fontWeight: 700,
      lineHeight: 1,
      textAlign: "center",
      textTransform: "uppercase",
      color: "#000000",
      backgroundColor: "#ffffff",
      paddingX: 20,
      paddingY: 0,
      locked: true,
      visible: includeButton && !imageOnly,
    },
  );
  button.mobileStyle = { x: 6.88, y: 89.5, width: 22, height: 10.48 };
  return imageOnly ? [] : [overlay, eyebrow, title, body, ...(includeButton ? [button] : [])];
}

export function sceneFromCollectionFeature(props: CollectionFeatureProps): BannerScene {
  const image = presetBannerImage(props.image, props.imageAlt);
  return {
    version: 1,
    templateVersion: CUSTOM_BANNER_TEMPLATE_VERSION,
    name: props.title || "Collection with products",
    height: CUSTOM_BANNER_HEIGHT,
    mobileHeight: CUSTOM_BANNER_MOBILE_HEIGHT,
    preset: "honey-banner",
    fills: [{ id: "fill-solid", type: "solid", enabled: true, opacity: 100, color: "#000000" }],
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
    preset: "honey-banner",
    fills: [
      {
        id: "fill-solid",
        type: "solid",
        enabled: true,
        opacity: 100,
        color: "#000000",
      },
    ],
    layers: [image, ...presetBannerTextLayers(props, true)],
  };
}

export function ensureCustomBannerScenes(data: HomepageData): HomepageData {
  const next = JSON.parse(JSON.stringify(data)) as HomepageData;
  next.content = next.content.map((item) => {
    if (item.type === "CollectionFeature") {
      item.props.contentMode =
        item.props.contentMode === "image-only" ? "image-only" : "text-overlay";
      item.props.layout = "banner-top";
      item.props.bannerColor = "#000000";
      item.props.textTone = "light";
      item.props.textColor = "#ffffff";
      item.props.textAlign = "left";
      item.props.titleFont = "sans";
      item.props.titleSize = 62;
      item.props.mobileTitleSize = 38;
      item.props.imageAlt = String(item.props.imageAlt ?? "");
      item.props.imageLink = String(item.props.imageLink ?? "");
      item.props.scene = migratePresetBannerScene(
        sceneFromCollectionFeature(item.props),
        item.props.scene,
      );
    } else if (item.type === "PromoBanner") {
      item.props.contentMode =
        item.props.contentMode === "image-only" ? "image-only" : "text-overlay";
      item.props.buttonLabel = String(item.props.buttonLabel || "Shop edit");
      item.props.buttonUrl = String(item.props.buttonUrl || "/shop");
      item.props.backgroundColor = "#000000";
      item.props.textTone = "light";
      item.props.textColor = "#ffffff";
      item.props.textAlign = "left";
      item.props.titleFont = "sans";
      item.props.titleSize = 62;
      item.props.mobileTitleSize = 38;
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
      item.props.slides = item.props.slides.map((slide, index) => {
        const withSubtitle = { ...slide, body: defaultHeroSubtitle(slide, index) };
        const sourceScene = withSubtitle.scene ?? sceneFromHero(withSubtitle, index);
        return {
          ...withSubtitle,
          scene:
            (withSubtitle.layout ?? item.props.layout ?? "original") === "original"
              ? upgradeOriginalHeroScene(restoreOriginalHeroScene(sourceScene), withSubtitle, index)
              : sourceScene,
        };
      });
    }
    return item;
  });
  return next;
}

function upgradeOriginalHeroScene(
  scene: BannerScene,
  slide: HeroSlide,
  index: number,
): BannerScene {
  if ((scene.templateVersion ?? 0) >= LUXURY_HERO_TEMPLATE_VERSION) return scene;
  const foreground = scene.layers.find((layer) => layer.id === "foreground");
  const migratedForeground = foreground
    ? {
        ...foreground,
        style: {
          ...foreground.style,
          x: 8,
        },
      }
    : null;
  const currentTitle = scene.layers.find((layer) => layer.id === "title")?.text?.trim();
  const currentSubtitle = scene.layers.find((layer) => layer.id === "body")?.text?.trim();
  const currentButton = scene.layers.find((layer) => layer.id === "button");
  const migratedSlide = {
    ...slide,
    title: currentTitle || slide.title,
    body: currentSubtitle || defaultHeroSubtitle(slide, index),
    buttonLabel: currentButton?.text || slide.buttonLabel,
    buttonUrl: currentButton?.href || slide.buttonUrl,
  };
  return {
    ...scene,
    templateVersion: LUXURY_HERO_TEMPLATE_VERSION,
    name: migratedSlide.title || scene.name,
    layers: [
      ...(migratedForeground ? [migratedForeground] : []),
      ...originalHeroCaptionLayers(
        migratedSlide,
        index,
        (scene.layers.find((layer) => layer.id === "title")?.style.color as string) || "#ffffff",
      ),
    ],
  };
}

function restoreOriginalHeroScene(scene: BannerScene): BannerScene {
  if (scene.coordinateMode === "original-hero") return scene;
  const desktopWidth = 1440;
  const frameWidth = (scene.height * 390) / 649;
  const frameWidthPercent = (frameWidth / desktopWidth) * 100;
  const frameLeftPercent = (100 - frameWidthPercent) / 2;
  return {
    ...scene,
    coordinateMode: "original-hero",
    layers: scene.layers.map((layer) => ({
      ...layer,
      style: {
        ...layer.style,
        x: ((layer.style.x - frameLeftPercent) / frameWidthPercent) * 100,
        width: (layer.style.width / frameWidthPercent) * 100,
        fontSize:
          layer.id === "title" || layer.id === "body"
            ? (layer.style.fontSize ?? 16) * (390 / frameWidth)
            : layer.style.fontSize,
      },
      mobileStyle: {
        x: ((layer.style.x - frameLeftPercent) / frameWidthPercent) * 100,
        y: layer.style.y,
        width: (layer.style.width / frameWidthPercent) * 100,
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
    buttonLabel: "Shop edit",
    buttonUrl: "/shop",
    backgroundImage: "",
    foregroundImage: "",
    backgroundColor: "#000000",
    textTone: "light",
    textColor: "#ffffff",
    textAlign: "left",
    titleFont: "sans",
    titleSize: 62,
    mobileTitleSize: 38,
    buttonBackgroundColor: "#ffffff",
    buttonTextColor: "#000000",
    imageFocus: "center",
    foregroundScale: 55,
    overlayOpacity: 12,
    minHeight: 520,
  };
  props.scene = sceneFromPromo(props);
  return { type: "PromoBanner", props };
}

export function createCollectionWithProducts(collection = "all"): HomepageContentItem {
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
    titleSize: 62,
    mobileTitleSize: 38,
    buttonBackgroundColor: "#ffffff",
    buttonTextColor: "#000000",
    productLimit: 4,
    productSelection: "collection",
    layout: "banner-top",
  };
  props.scene = sceneFromCollectionFeature(props);
  return { type: "CollectionFeature", props };
}
