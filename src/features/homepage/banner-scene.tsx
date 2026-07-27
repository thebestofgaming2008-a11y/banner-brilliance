import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type {
  BannerFill,
  BannerLayer,
  BannerLayerStyle,
  BannerScene,
  HomepageViewport,
} from "./types";
import { useStudioBannerSession, useStudioViewport } from "./studio-session-context";

type SceneViewport = HomepageViewport | "auto";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function snapPosition(value: number, size: number, targets: number[]) {
  const anchors = [0, size / 2, size];
  const candidates = targets.flatMap((guide) =>
    anchors.map((anchor) => {
      const candidate = guide - anchor;
      return { value: candidate, guide, distance: Math.abs(candidate - value) };
    }),
  );
  const best = candidates.reduce<(typeof candidates)[number] | null>(
    (closest, candidate) =>
      !closest || candidate.distance < closest.distance ? candidate : closest,
    null,
  );
  return best && best.distance <= 1 ? { value: best.value, guide: best.guide } : { value };
}

function safeHref(value: string | undefined) {
  const href = String(value || "#").trim();
  return href.startsWith("/") || href.startsWith("#") || /^https:\/\//i.test(href) ? href : "#";
}

function focusEditableText(layerElement: HTMLElement) {
  const ownerWindow = layerElement.ownerDocument.defaultView ?? window;
  let attempts = 0;
  const focus = () => {
    const editable = layerElement.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!editable && attempts < 2) {
      attempts += 1;
      ownerWindow.requestAnimationFrame(focus);
      return;
    }
    if (!editable) return;
    editable.focus();
    const selection = ownerWindow.getSelection();
    const range = layerElement.ownerDocument.createRange();
    range.selectNodeContents(editable);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };
  ownerWindow.requestAnimationFrame(focus);
}

function fontFamily(value: BannerLayerStyle["fontFamily"]) {
  if (value === "instrument") return '"Instrument Serif", Georgia, serif';
  if (value === "serif") return "Georgia, Times, serif";
  if (value === "sans") return "Arial, Helvetica, sans-serif";
  return "var(--font-sans-ui)";
}

function withAlpha(color: string | undefined, fallback: string) {
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color || "") ? color! : fallback;
}

function fillStyle(fill: BannerFill): CSSProperties {
  if (fill.type === "solid") return { backgroundColor: withAlpha(fill.color, "#ffffff") };
  if (fill.type === "image") {
    return {};
  }
  const stops = (
    fill.stops?.length
      ? fill.stops
      : [
          { color: "#000000", position: 0 },
          { color: "#ffffff", position: 100 },
        ]
  )
    .map((stop) => `${withAlpha(stop.color, "#000000")} ${clamp(stop.position, 0, 100)}%`)
    .join(", ");
  if (fill.type === "radial") {
    return {
      backgroundImage: `radial-gradient(circle at ${clamp(fill.centerX ?? 50, 0, 100)}% ${clamp(fill.centerY ?? 50, 0, 100)}%, ${stops})`,
    };
  }
  if (fill.type === "conic") {
    return {
      backgroundImage: `conic-gradient(from ${clamp(fill.angle ?? 0, 0, 360)}deg at ${clamp(fill.centerX ?? 50, 0, 100)}% ${clamp(fill.centerY ?? 50, 0, 100)}%, ${stops})`,
    };
  }
  return { backgroundImage: `linear-gradient(${clamp(fill.angle ?? 90, 0, 360)}deg, ${stops})` };
}

function resolveLayerStyle(layer: BannerLayer, viewport: HomepageViewport): BannerLayerStyle {
  return viewport === "mobile" ? { ...layer.style, ...(layer.mobileStyle ?? {}) } : layer.style;
}

function layerCss(style: BannerLayerStyle, scene: BannerScene, layer: BannerLayer): CSSProperties {
  const borderWidth = clamp(style.borderWidth ?? 0, 0, 40);
  const borderAlign = style.borderAlign || "inside";
  const textAutoResize = layer.type === "text" ? (style.textAutoResize ?? "none") : "none";
  const scalesWithOriginalFrame =
    scene.coordinateMode === "original-hero" && (layer.id === "title" || layer.id === "body");
  return {
    left: `${clamp(style.x, -100, 200)}%`,
    top: `${clamp(style.y, -100, 200)}%`,
    width:
      textAutoResize === "width-and-height" ? "max-content" : `${clamp(style.width, 0.5, 250)}%`,
    height: textAutoResize === "none" ? `${clamp(style.height, 0.5, 250)}%` : "auto",
    maxWidth: textAutoResize === "width-and-height" ? "none" : undefined,
    transform: `rotate(${clamp(style.rotation, -360, 360)}deg) scaleX(${style.flipX ? -1 : 1}) scaleY(${style.flipY ? -1 : 1})`,
    opacity: clamp(style.opacity, 0, 100) / 100,
    display: style.visible === false ? "none" : undefined,
    color: withAlpha(style.color, "#ffffff"),
    backgroundColor: style.backgroundColor || undefined,
    backgroundImage: style.backgroundImage || undefined,
    borderColor: borderAlign === "inside" ? style.borderColor || "transparent" : undefined,
    borderWidth: borderAlign === "inside" ? `${borderWidth}px` : 0,
    borderStyle: borderAlign === "inside" ? "solid" : undefined,
    outline:
      borderAlign !== "inside" && borderWidth > 0
        ? `${borderWidth}px solid ${style.borderColor || "#000000"}`
        : undefined,
    outlineOffset: borderAlign === "center" ? `${-borderWidth / 2}px` : undefined,
    borderRadius: `${clamp(style.borderRadius ?? 0, 0, 999)}px`,
    padding: `${clamp(style.paddingY ?? 0, 0, 120)}px ${clamp(style.paddingX ?? 0, 0, 120)}px`,
    fontFamily: fontFamily(style.fontFamily),
    fontSize: scalesWithOriginalFrame
      ? `${(clamp(style.fontSize ?? 16, 6, 360) / 390) * 100}cqw`
      : `${clamp(style.fontSize ?? 16, 6, 360)}px`,
    fontWeight: clamp(style.fontWeight ?? 400, 100, 900),
    fontStyle: style.fontStyle || "normal",
    lineHeight: clamp(style.lineHeight ?? 1.2, 0.5, 4),
    letterSpacing: `${clamp(style.letterSpacing ?? 0, -10, 40)}px`,
    textAlign: style.textAlign || "left",
    textTransform: style.textTransform || "none",
    textDecoration: style.textDecoration || "none",
    textUnderlineOffset: style.textDecoration === "underline" ? "4px" : undefined,
    whiteSpace: textAutoResize === "width-and-height" ? "nowrap" : style.whiteSpace || "pre-wrap",
    boxShadow:
      (style.shadowBlur ?? 0) > 0
        ? `${style.shadowX ?? 0}px ${style.shadowY ?? 8}px ${style.shadowBlur}px ${style.shadowColor ?? "#00000055"}`
        : undefined,
    filter: (style.blur ?? 0) > 0 ? `blur(${clamp(style.blur ?? 0, 0, 40)}px)` : undefined,
    objectFit: style.objectFit || "contain",
    objectPosition: style.objectPosition || "center",
    mixBlendMode: style.blendMode || "normal",
    transformOrigin: "center",
  };
}

function useSceneViewport(viewport: SceneViewport) {
  const [automatic, setAutomatic] = useState<HomepageViewport>("desktop");
  useEffect(() => {
    if (viewport !== "auto") return;
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setAutomatic(media.matches ? "mobile" : "desktop");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [viewport]);
  return viewport === "auto" ? automatic : viewport;
}

export function BannerSceneView({
  scene,
  editorKey,
  viewport = "auto",
  className = "",
  selectedLayerId,
  editingLayerId,
  cropLayerId,
  interactive = true,
  onSelectLayer,
  onEditLayer,
  onTextChange,
  onCropChange,
  onSelectBackground,
  onBackgroundCropChange,
}: {
  scene: BannerScene;
  editorKey?: string;
  viewport?: SceneViewport;
  className?: string;
  selectedLayerId?: string | null;
  editingLayerId?: string | null;
  cropLayerId?: string | null;
  interactive?: boolean;
  onSelectLayer?: (id: string, event: MouseEvent<HTMLElement>) => void;
  onEditLayer?: (id: string | null) => void;
  onTextChange?: (id: string, text: string) => void;
  onCropChange?: (
    id: string,
    patch: Pick<BannerLayerStyle, "cropX" | "cropY" | "cropZoom">,
  ) => void;
  onSelectBackground?: () => void;
  onBackgroundCropChange?: (
    id: string,
    patch: Pick<BannerFill, "offsetX" | "offsetY" | "zoom">,
  ) => void;
}) {
  const studio = useStudioBannerSession(editorKey);
  const studioViewport = useStudioViewport();
  const studioSelectedLayerId =
    studio?.selectedLayerIds.length === 1 ? studio.selectedLayerIds[0] : null;
  const activeSelectedLayerId = studio ? studioSelectedLayerId : selectedLayerId;
  const activeEditingLayerId = studio ? studio.editingLayerId : editingLayerId;
  const activeCropLayerId = studio ? studio.cropLayerId : cropLayerId;
  const activeCropFillId = studio?.cropFillId ?? null;
  const selectLayer = studio
    ? (id: string, event: MouseEvent<HTMLElement>) => studio.onSelectLayer(id, event.shiftKey)
    : onSelectLayer;
  const editLayer = studio?.onEditLayer ?? onEditLayer;
  const textChange = studio?.onTextChange ?? onTextChange;
  const cropChange = studio?.onCropChange ?? onCropChange;
  const selectBackground = studio?.onSelectBackground ?? onSelectBackground;
  const backgroundCropChange = studio?.onBackgroundCropChange ?? onBackgroundCropChange;
  const resolvedViewport = useSceneViewport(studioViewport ?? viewport);
  const height = resolvedViewport === "mobile" ? scene.mobileHeight : scene.height;
  const fixedHoneyPreset = scene.preset === "honey-banner";
  const fills = useMemo(() => scene.fills.filter((fill) => fill.enabled), [scene.fills]);
  const backgroundSelected = Boolean(
    studio && !studio.interactionDisabled && studio.selectedLayerIds.length === 0,
  );

  return (
    <div
      className={`homepage-banner-scene relative isolate w-full overflow-hidden ${backgroundSelected ? "is-background-selected" : ""} ${activeCropFillId ? "is-background-cropping" : ""} ${className}`}
      style={{
        height: scene.coordinateMode === "original-hero" ? "100%" : `${Math.max(160, height)}px`,
      }}
      data-scene-viewport={resolvedViewport}
      data-editor-banner-key={editorKey}
      data-editor-active={studio ? "true" : undefined}
      onPointerDown={(event) => {
        if (studio?.interactionDisabled) return;
        if (event.target !== event.currentTarget) return;
        selectBackground?.();
        const imageFill = [...fills].reverse().find((fill) => fill.type === "image");
        if (!imageFill || !backgroundCropChange || activeCropFillId !== imageFill.id) return;
        const startX = event.clientX;
        const startY = event.clientY;
        const startOffsetX = imageFill.offsetX ?? 0;
        const startOffsetY = imageFill.offsetY ?? 0;
        const rect = event.currentTarget.getBoundingClientRect();
        const ownerWindow = event.currentTarget.ownerDocument.defaultView ?? window;
        const move = (moveEvent: PointerEvent) => {
          backgroundCropChange(imageFill.id, {
            offsetX: startOffsetX + ((moveEvent.clientX - startX) / Math.max(1, rect.width)) * 100,
            offsetY: startOffsetY + ((moveEvent.clientY - startY) / Math.max(1, rect.height)) * 100,
            zoom: imageFill.zoom ?? 100,
          });
        };
        const stop = () => {
          ownerWindow.removeEventListener("pointermove", move);
          ownerWindow.removeEventListener("pointerup", stop);
          ownerWindow.removeEventListener("pointercancel", stop);
        };
        ownerWindow.addEventListener("pointermove", move);
        ownerWindow.addEventListener("pointerup", stop);
        ownerWindow.addEventListener("pointercancel", stop);
      }}
      onDoubleClick={(event) => {
        if (event.target !== event.currentTarget || !studio || studio.interactionDisabled) return;
        event.preventDefault();
        const imageFill = [...fills].reverse().find((fill) => fill.type === "image");
        studio.onEditBackground(imageFill?.id ?? null);
      }}
      onWheel={(event) => {
        if (event.target !== event.currentTarget || !backgroundCropChange) return;
        const imageFill = [...fills].reverse().find((fill) => fill.type === "image");
        if (!imageFill || activeCropFillId !== imageFill.id) return;
        event.preventDefault();
        backgroundCropChange(imageFill.id, {
          offsetX: imageFill.offsetX ?? 0,
          offsetY: imageFill.offsetY ?? 0,
          zoom: clamp((imageFill.zoom ?? 100) - event.deltaY * 0.15, 10, 500),
        });
      }}
    >
      {backgroundSelected && activeCropFillId ? (
        <span className="studio-background-label">Background</span>
      ) : null}
      {fills.map((fill) =>
        fill.type === "image" ? (
          <div
            key={fill.id}
            className="pointer-events-none absolute inset-0 overflow-hidden"
            data-fill-id={fill.id}
            style={{
              opacity: clamp(fill.opacity, 0, 100) / 100,
              mixBlendMode: fill.blendMode,
              backgroundImage:
                fill.fit === "tile" && fill.src
                  ? `url("${String(fill.src).replaceAll('"', "%22")}")`
                  : undefined,
              backgroundRepeat: fill.fit === "tile" ? "repeat" : undefined,
              backgroundPosition:
                fill.fit === "tile"
                  ? `${50 + (fill.offsetX ?? 0)}% ${50 + (fill.offsetY ?? 0)}%`
                  : undefined,
              backgroundSize: fill.fit === "tile" ? `${fill.zoom ?? 100}% auto` : undefined,
            }}
          >
            {fill.src && fill.fit !== "tile" ? (
              <img
                src={fill.src}
                alt=""
                className="absolute inset-0 h-full w-full max-w-none"
                style={{
                  objectFit:
                    fill.fit === "fill" ? "fill" : fill.fit === "contain" ? "contain" : "cover",
                  objectPosition: fill.position || "center",
                  transform: `translate(${fill.offsetX ?? 0}%, ${fill.offsetY ?? 0}%) scale(${clamp(fill.zoom ?? 100, 10, 500) / 100})`,
                  filter: (fill.blur ?? 0) > 0 ? `blur(${fill.blur}px)` : undefined,
                }}
              />
            ) : null}
          </div>
        ) : (
          <div
            key={fill.id}
            className="pointer-events-none absolute inset-0"
            data-fill-id={fill.id}
            style={{
              ...fillStyle(fill),
              opacity: clamp(fill.opacity, 0, 100) / 100,
              mixBlendMode: fill.blendMode,
            }}
          />
        ),
      )}

      <div
        className={
          scene.coordinateMode === "original-hero"
            ? "homepage-banner-coordinate-root absolute left-1/2 top-0 h-full"
            : "homepage-banner-coordinate-root absolute inset-0"
        }
        data-banner-coordinate-root
        style={
          scene.coordinateMode === "original-hero"
            ? {
                aspectRatio: "390 / 649",
                containerType: "inline-size",
                pointerEvents: "none",
                transform: "translateX(-50%)",
              }
            : fixedHoneyPreset
              ? {
                  pointerEvents: "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  alignItems: "flex-start",
                  boxSizing: "border-box",
                  padding: resolvedViewport === "mobile" ? "24px" : "36px",
                }
              : { pointerEvents: "none" }
        }
      >
        {scene.layers.map((layer, index) => {
          const style = resolveLayerStyle(layer, resolvedViewport);
          const layerEditable =
            !studio?.editableLayerIds || studio.editableLayerIds.includes(layer.id);
          const selected = activeSelectedLayerId === layer.id;
          const editing = activeEditingLayerId === layer.id;
          const cropping = activeCropLayerId === layer.id;
          const fixedBannerTypography = fixedHoneyPreset
            ? layer.id === "title"
              ? "banner-heading"
              : layer.id === "eyebrow"
                ? "section-kicker"
                : layer.id === "body"
                  ? "commerce-copy"
                  : ""
            : "";
          const fixedBannerFlowLayer =
            fixedHoneyPreset &&
            (layer.id === "eyebrow" ||
              layer.id === "title" ||
              layer.id === "body" ||
              layer.id === "button");
          const fixedBannerTextStyle: CSSProperties = fixedBannerFlowLayer
            ? {
                position: "static",
                left: "auto",
                top: "auto",
                width:
                  layer.id === "button"
                    ? "auto"
                    : layer.id === "body"
                      ? "min(320px, 100%)"
                      : "100%",
                height: layer.id === "button" ? "44px" : "auto",
                flex: "0 0 auto",
                marginTop:
                  layer.id === "title"
                    ? "8px"
                    : layer.id === "body"
                      ? "16px"
                      : layer.id === "button"
                        ? "28px"
                        : 0,
                whiteSpace: "normal",
                display:
                  style.visible === false || !layer.text
                    ? "none"
                    : layer.id === "button"
                      ? "inline-flex"
                      : undefined,
                alignItems: layer.id === "button" ? "center" : undefined,
                justifyContent: layer.id === "button" ? "center" : undefined,
              }
            : {};
          const startLayerDrag = (event: ReactPointerEvent<HTMLElement>) => {
            if (
              !studio ||
              studio.interactionDisabled ||
              !layerEditable ||
              editing ||
              cropping ||
              style.locked ||
              event.ctrlKey ||
              event.metaKey ||
              event.button !== 0 ||
              !event.isPrimary
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            studio.onSelectLayer(layer.id, event.shiftKey);
            if (event.shiftKey) return;
            const coordinateRoot = event.currentTarget.closest<HTMLElement>(
              "[data-banner-coordinate-root]",
            );
            if (!coordinateRoot) return;
            const movingIds = studio.selectedLayerIds.includes(layer.id)
              ? studio.selectedLayerIds
              : [layer.id];
            const rect = coordinateRoot.getBoundingClientRect();
            const origins = scene.layers
              .filter((item) => movingIds.includes(item.id))
              .map((item) => {
                const itemStyle = { ...resolveLayerStyle(item, resolvedViewport) };
                if (item.type === "text" && (itemStyle.textAutoResize ?? "none") !== "none") {
                  const element = coordinateRoot.querySelector<HTMLElement>(
                    `[data-banner-layer="${CSS.escape(item.id)}"]`,
                  );
                  const elementRect = element?.getBoundingClientRect();
                  if (elementRect && rect.width && rect.height) {
                    itemStyle.x = ((elementRect.left - rect.left) / rect.width) * 100;
                    itemStyle.y = ((elementRect.top - rect.top) / rect.height) * 100;
                    itemStyle.width = (elementRect.width / rect.width) * 100;
                    itemStyle.height = (elementRect.height / rect.height) * 100;
                  }
                }
                return { id: item.id, style: itemStyle };
              })
              .filter((item) => !item.style.locked);
            const startX = event.clientX;
            const startY = event.clientY;
            const ownerWindow = event.currentTarget.ownerDocument.defaultView ?? window;
            const alignmentLayers = scene.layers.filter(
              (item) =>
                !movingIds.includes(item.id) &&
                (!studio.editableLayerIds || studio.editableLayerIds.includes(item.id)),
            );
            const xTargets = [
              0,
              50,
              100,
              ...alignmentLayers.flatMap((item) => {
                const itemStyle = resolveLayerStyle(item, resolvedViewport);
                return [
                  itemStyle.x,
                  itemStyle.x + itemStyle.width / 2,
                  itemStyle.x + itemStyle.width,
                ];
              }),
            ];
            const yTargets = [
              0,
              50,
              100,
              ...alignmentLayers.flatMap((item) => {
                const itemStyle = resolveLayerStyle(item, resolvedViewport);
                return [
                  itemStyle.y,
                  itemStyle.y + itemStyle.height / 2,
                  itemStyle.y + itemStyle.height,
                ];
              }),
            ];
            const move = (moveEvent: PointerEvent) => {
              const deltaX = ((moveEvent.clientX - startX) / Math.max(1, rect.width)) * 100;
              const deltaY = ((moveEvent.clientY - startY) / Math.max(1, rect.height)) * 100;
              origins.forEach((item, itemIndex) => {
                const snappedX = snapPosition(item.style.x + deltaX, item.style.width, xTargets);
                const snappedY = snapPosition(item.style.y + deltaY, item.style.height, yTargets);
                if (itemIndex === 0) {
                  studio.onSnapGuides(
                    snappedX.guide === undefined && snappedY.guide === undefined
                      ? null
                      : { x: snappedX.guide, y: snappedY.guide },
                  );
                }
                studio.onPatchLayer(item.id, {
                  x: studio.constrainLayersToCanvas
                    ? clamp(snappedX.value, 0, Math.max(0, 100 - item.style.width))
                    : clamp(snappedX.value, -100, 200),
                  y: studio.constrainLayersToCanvas
                    ? clamp(snappedY.value, 0, Math.max(0, 100 - item.style.height))
                    : clamp(snappedY.value, -100, 200),
                });
              });
            };
            const stop = () => {
              studio.onSnapGuides(null);
              ownerWindow.removeEventListener("pointermove", move);
              ownerWindow.removeEventListener("pointerup", stop);
              ownerWindow.removeEventListener("pointercancel", stop);
            };
            ownerWindow.addEventListener("pointermove", move);
            ownerWindow.addEventListener("pointerup", stop);
            ownerWindow.addEventListener("pointercancel", stop);
          };
          const commonProps = {
            "data-banner-layer": layer.id,
            "data-layer-type": layer.type,
            "data-text-resize":
              layer.type === "text" ? (style.textAutoResize ?? "none") : undefined,
            "data-layer-locked": style.locked || undefined,
            "data-selected": selected || undefined,
            className: `homepage-banner-layer absolute z-10 box-border m-0 overflow-visible ${fixedBannerTypography} ${selected ? "is-selected" : ""}`,
            style: {
              ...layerCss(style, scene, layer),
              ...fixedBannerTextStyle,
              zIndex: index + 1,
              pointerEvents: studio && !layerEditable ? ("none" as const) : ("auto" as const),
            },
            onMouseDown: (event: MouseEvent<HTMLElement>) => {
              event.stopPropagation();
              if (studio?.interactionDisabled || !layerEditable) return;
              if (studio && (event.ctrlKey || event.metaKey)) {
                studio.onSelectDeep(event.clientX, event.clientY);
              } else {
                selectLayer?.(layer.id, event);
              }
            },
            onPointerDown: startLayerDrag,
            onDoubleClick: (event: MouseEvent<HTMLElement>) => {
              event.preventDefault();
              event.stopPropagation();
              if (studio?.interactionDisabled || !layerEditable) return;
              editLayer?.(layer.id);
              if (layer.type === "text" || layer.type === "button") {
                focusEditableText(event.currentTarget);
              }
            },
          };

          if (layer.type === "image") {
            return layer.src ? (
              <div
                key={layer.id}
                {...commonProps}
                className={`${commonProps.className} overflow-hidden ${cropping ? "is-cropping" : ""}`}
                onPointerDown={(event) => {
                  if (!cropping || !cropChange) {
                    startLayerDrag(event);
                    return;
                  }
                  event.preventDefault();
                  const startX = event.clientX;
                  const startY = event.clientY;
                  const startCropX = style.cropX ?? 0;
                  const startCropY = style.cropY ?? 0;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ownerWindow = event.currentTarget.ownerDocument.defaultView ?? window;
                  const move = (moveEvent: PointerEvent) => {
                    cropChange(layer.id, {
                      cropX: clamp(
                        startCropX + ((moveEvent.clientX - startX) / Math.max(1, rect.width)) * 100,
                        -50,
                        50,
                      ),
                      cropY: clamp(
                        startCropY +
                          ((moveEvent.clientY - startY) / Math.max(1, rect.height)) * 100,
                        -50,
                        50,
                      ),
                      cropZoom: style.cropZoom ?? 100,
                    });
                  };
                  const stop = () => {
                    ownerWindow.removeEventListener("pointermove", move);
                    ownerWindow.removeEventListener("pointerup", stop);
                    ownerWindow.removeEventListener("pointercancel", stop);
                  };
                  ownerWindow.addEventListener("pointermove", move);
                  ownerWindow.addEventListener("pointerup", stop);
                  ownerWindow.addEventListener("pointercancel", stop);
                }}
                onWheel={(event) => {
                  if (!cropping || !cropChange) return;
                  event.preventDefault();
                  cropChange(layer.id, {
                    cropX: style.cropX ?? 0,
                    cropY: style.cropY ?? 0,
                    cropZoom: clamp((style.cropZoom ?? 100) - event.deltaY * 0.15, 100, 300),
                  });
                }}
              >
                <img
                  src={layer.src}
                  alt={layer.alt || ""}
                  draggable={false}
                  loading={interactive ? "lazy" : "eager"}
                  className="pointer-events-none absolute inset-0 h-full w-full max-w-none"
                  style={{
                    inset: fixedHoneyPreset ? "-1px" : undefined,
                    width: fixedHoneyPreset ? "calc(100% + 2px)" : undefined,
                    height: fixedHoneyPreset ? "calc(100% + 2px)" : undefined,
                    objectFit: style.objectFit || "contain",
                    objectPosition:
                      style.cropX !== undefined || style.cropY !== undefined
                        ? `${clamp(50 + (style.cropX ?? 0), 0, 100)}% ${clamp(
                            50 + (style.cropY ?? 0),
                            0,
                            100,
                          )}%`
                        : style.objectPosition || "center",
                    transform: `scale(${clamp(style.cropZoom ?? 100, 100, 300) / 100})`,
                    transformOrigin: "center",
                    filter:
                      scene.coordinateMode === "original-hero" && layer.id === "foreground"
                        ? "drop-shadow(18px 12px 20px rgba(50, 14, 20, 0.26))"
                        : undefined,
                  }}
                />
                {cropping ? <span className="studio-crop-overlay" aria-hidden="true" /> : null}
              </div>
            ) : studio && layerEditable ? (
              <div
                key={layer.id}
                {...commonProps}
                className={`${commonProps.className} homepage-banner-layer--empty`}
                aria-label={layer.name}
              />
            ) : null;
          }

          if (layer.type === "shape") return <div key={layer.id} {...commonProps} />;

          const content = (
            <span
              className={
                layer.type === "button"
                  ? scene.coordinateMode === "original-hero"
                    ? "block h-full w-full"
                    : `flex h-full items-center ${
                        style.textAlign === "left"
                          ? "justify-start"
                          : style.textAlign === "right"
                            ? "justify-end"
                            : "justify-center"
                      }`
                  : "block h-full w-full"
              }
              contentEditable={editing}
              suppressContentEditableWarning
              onBlur={(event) => {
                textChange?.(layer.id, event.currentTarget.textContent ?? "");
                editLayer?.(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") event.currentTarget.blur();
              }}
            >
              {layer.text}
            </span>
          );

          if (layer.type === "button" && interactive && !selectLayer) {
            return (
              <a key={layer.id} {...commonProps} href={safeHref(layer.href)}>
                {content}
              </a>
            );
          }
          const TextTag = layer.semantic || "p";
          return (
            <TextTag key={layer.id} {...commonProps}>
              {content}
            </TextTag>
          );
        })}
        {studio?.snapGuides?.x !== undefined ? (
          <span
            className="studio-smart-guide is-vertical"
            style={{ left: `${studio.snapGuides.x}%` }}
            aria-hidden="true"
          />
        ) : null}
        {studio?.snapGuides?.y !== undefined ? (
          <span
            className="studio-smart-guide is-horizontal"
            style={{ top: `${studio.snapGuides.y}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
