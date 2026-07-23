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

function snapPosition(value: number, size: number) {
  const targets = [0, 50 - size / 2, 100 - size];
  const closest = targets.reduce((best, target) =>
    Math.abs(target - value) < Math.abs(best - value) ? target : best,
  );
  return Math.abs(closest - value) <= 1
    ? { value: closest, guide: closest === 0 ? 0 : closest === 100 - size ? 100 : 50 }
    : { value };
}

function safeHref(value: string | undefined) {
  const href = String(value || "#").trim();
  return href.startsWith("/") || href.startsWith("#") || /^https:\/\//i.test(href) ? href : "#";
}

function fontFamily(value: BannerLayerStyle["fontFamily"]) {
  if (value === "instrument") return '"Instrument Serif", Georgia, serif';
  if (value === "serif") return "Georgia, Times, serif";
  if (value === "sans") return "Arial, Helvetica, sans-serif";
  return '"Schibsted Grotesk", Arial, sans-serif';
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

function layerCss(style: BannerLayerStyle): CSSProperties {
  const borderWidth = clamp(style.borderWidth ?? 0, 0, 40);
  const borderAlign = style.borderAlign || "inside";
  return {
    left: `${clamp(style.x, -100, 200)}%`,
    top: `${clamp(style.y, -100, 200)}%`,
    width: `${clamp(style.width, 0.5, 250)}%`,
    height: `${clamp(style.height, 0.5, 250)}%`,
    transform: `rotate(${clamp(style.rotation, -360, 360)}deg) scaleX(${style.flipX ? -1 : 1}) scaleY(${style.flipY ? -1 : 1})`,
    opacity: clamp(style.opacity, 0, 100) / 100,
    display: style.visible === false ? "none" : undefined,
    color: withAlpha(style.color, "#ffffff"),
    backgroundColor: style.backgroundColor || undefined,
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
    fontSize: `${clamp(style.fontSize ?? 16, 6, 360)}px`,
    fontWeight: clamp(style.fontWeight ?? 400, 100, 900),
    fontStyle: style.fontStyle || "normal",
    lineHeight: clamp(style.lineHeight ?? 1.2, 0.5, 4),
    letterSpacing: `${clamp(style.letterSpacing ?? 0, -10, 40)}px`,
    textAlign: style.textAlign || "left",
    textTransform: style.textTransform || "none",
    textDecoration: style.textDecoration || "none",
    textUnderlineOffset: style.textDecoration === "underline" ? "4px" : undefined,
    whiteSpace: style.whiteSpace || "pre-wrap",
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
  onEditLayer?: (id: string) => void;
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
  const fills = useMemo(() => scene.fills.filter((fill) => fill.enabled), [scene.fills]);
  const backgroundSelected = Boolean(
    studio && !studio.interactionDisabled && studio.selectedLayerIds.length === 0,
  );

  return (
    <div
      className={`homepage-banner-scene relative isolate w-full overflow-hidden ${backgroundSelected ? "is-background-selected" : ""} ${activeCropFillId ? "is-background-cropping" : ""} ${className}`}
      style={{ height: `${Math.max(160, height)}px` }}
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
      {backgroundSelected ? <span className="studio-background-label">Background</span> : null}
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
            ? { aspectRatio: "390 / 649", pointerEvents: "none", transform: "translateX(-50%)" }
            : { pointerEvents: "none" }
        }
      >
        {scene.layers.map((layer, index) => {
          const style = resolveLayerStyle(layer, resolvedViewport);
          const selected = activeSelectedLayerId === layer.id;
          const editing = activeEditingLayerId === layer.id;
          const cropping = activeCropLayerId === layer.id;
          const startLayerDrag = (event: ReactPointerEvent<HTMLElement>) => {
            if (
              !studio ||
              studio.interactionDisabled ||
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
            const origins = scene.layers
              .filter((item) => movingIds.includes(item.id))
              .map((item) => ({
                id: item.id,
                style: { ...resolveLayerStyle(item, resolvedViewport) },
              }))
              .filter((item) => !item.style.locked);
            const startX = event.clientX;
            const startY = event.clientY;
            const rect = coordinateRoot.getBoundingClientRect();
            const ownerWindow = event.currentTarget.ownerDocument.defaultView ?? window;
            const move = (moveEvent: PointerEvent) => {
              const deltaX = ((moveEvent.clientX - startX) / Math.max(1, rect.width)) * 100;
              const deltaY = ((moveEvent.clientY - startY) / Math.max(1, rect.height)) * 100;
              origins.forEach((item, itemIndex) => {
                const snappedX = snapPosition(item.style.x + deltaX, item.style.width);
                const snappedY = snapPosition(item.style.y + deltaY, item.style.height);
                if (itemIndex === 0) {
                  studio.onSnapGuides(
                    snappedX.guide === undefined && snappedY.guide === undefined
                      ? null
                      : { x: snappedX.guide, y: snappedY.guide },
                  );
                }
                studio.onPatchLayer(item.id, {
                  x: clamp(snappedX.value, -100, 200),
                  y: clamp(snappedY.value, -100, 200),
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
            "data-selected": selected || undefined,
            className: `homepage-banner-layer absolute z-10 box-border m-0 overflow-visible ${selected ? "is-selected" : ""}`,
            style: { ...layerCss(style), zIndex: index + 1, pointerEvents: "auto" as const },
            onMouseDown: (event: MouseEvent<HTMLElement>) => {
              event.stopPropagation();
              if (studio?.interactionDisabled) return;
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
              if (studio?.interactionDisabled) return;
              editLayer?.(layer.id);
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
                      cropX:
                        startCropX + ((moveEvent.clientX - startX) / Math.max(1, rect.width)) * 100,
                      cropY:
                        startCropY +
                        ((moveEvent.clientY - startY) / Math.max(1, rect.height)) * 100,
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
                    cropZoom: clamp((style.cropZoom ?? 100) - event.deltaY * 0.15, 10, 500),
                  });
                }}
              >
                <img
                  src={layer.src}
                  alt=""
                  draggable={false}
                  loading={interactive ? "lazy" : "eager"}
                  className="pointer-events-none absolute inset-0 h-full w-full max-w-none"
                  style={{
                    objectFit: style.objectFit || "contain",
                    objectPosition: style.objectPosition || "center",
                    transform: `translate(${style.cropX ?? 0}%, ${style.cropY ?? 0}%) scale(${clamp(style.cropZoom ?? 100, 10, 500) / 100})`,
                    transformOrigin: "center",
                  }}
                />
                {cropping ? <span className="studio-crop-overlay" aria-hidden="true" /> : null}
              </div>
            ) : (
              <div
                key={layer.id}
                {...commonProps}
                className={`${commonProps.className} homepage-banner-layer--empty`}
              >
                Image
              </div>
            );
          }

          if (layer.type === "shape") return <div key={layer.id} {...commonProps} />;

          const content = (
            <span
              className="block h-full w-full"
              contentEditable={editing}
              suppressContentEditableWarning
              onBlur={(event) => textChange?.(layer.id, event.currentTarget.textContent ?? "")}
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
