import {
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import type { BannerLayer, BannerLayerStyle, HomepageViewport } from "./types";

type Direction = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function resolvedStyle(layer: BannerLayer, viewport: HomepageViewport) {
  return viewport === "mobile" ? { ...layer.style, ...(layer.mobileStyle ?? {}) } : layer.style;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function StudioSelection({
  host,
  layers,
  viewport,
  onPatchLayer,
  constrainToHost = false,
}: {
  host: HTMLElement | null;
  layers: BannerLayer[];
  viewport: HomepageViewport;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
  constrainToHost?: boolean;
}) {
  const selection = useMemo<{ layer: BannerLayer | null; style: BannerLayerStyle } | null>(() => {
    if (!layers.length) return null;
    const resolved = layers.map((layer) => ({ layer, style: resolvedStyle(layer, viewport) }));
    if (resolved.length === 1) return resolved[0]!;
    const left = Math.min(...resolved.map(({ style }) => style.x));
    const top = Math.min(...resolved.map(({ style }) => style.y));
    const right = Math.max(...resolved.map(({ style }) => style.x + style.width));
    const bottom = Math.max(...resolved.map(({ style }) => style.y + style.height));
    return {
      layer: null,
      style: {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        rotation: 0,
        opacity: 100,
        visible: true,
      } satisfies BannerLayerStyle,
    };
  }, [layers, viewport]);

  const [renderedBounds, setRenderedBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const measuredLayer = selection?.layer ?? null;
  const measuredStyle = selection?.style ?? null;
  useLayoutEffect(() => {
    if (
      !host ||
      !measuredLayer ||
      measuredLayer.type !== "text" ||
      (measuredStyle?.textAutoResize ?? "none") === "none"
    ) {
      setRenderedBounds(null);
      return;
    }
    const element = host.querySelector<HTMLElement>(
      `[data-banner-layer="${CSS.escape(measuredLayer.id)}"]`,
    );
    if (!element) return;
    const measure = () => {
      const hostRect = host.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      if (!hostRect.width || !hostRect.height) return;
      const bounds = {
        x: ((elementRect.left - hostRect.left) / hostRect.width) * 100,
        y: ((elementRect.top - hostRect.top) / hostRect.height) * 100,
        width: (elementRect.width / hostRect.width) * 100,
        height: (elementRect.height / hostRect.height) * 100,
      };
      setRenderedBounds(bounds);
      const mode = measuredStyle?.textAutoResize ?? "none";
      const patch: Partial<BannerLayerStyle> = {};
      const storedWidth = measuredStyle?.width ?? bounds.width;
      if (mode === "width-and-height" && Math.abs(bounds.width - storedWidth) > 0.01) {
        patch.width = bounds.width;
        if (measuredStyle?.textAlign === "center") {
          patch.x = (measuredStyle?.x ?? bounds.x) + (storedWidth - bounds.width) / 2;
        } else if (measuredStyle?.textAlign === "right") {
          patch.x = (measuredStyle?.x ?? bounds.x) + storedWidth - bounds.width;
        }
      }
      if (
        (mode === "width-and-height" || mode === "height") &&
        Math.abs(bounds.height - (measuredStyle?.height ?? bounds.height)) > 0.01
      ) {
        patch.height = bounds.height;
      }
      if (Object.keys(patch).length) onPatchLayer(measuredLayer.id, patch);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [host, measuredLayer, measuredStyle, onPatchLayer, viewport]);

  if (!host || !selection) return null;
  const { layer, style: storedStyle } = selection;
  const style =
    layer?.type === "text" && (storedStyle.textAutoResize ?? "none") !== "none" && renderedBounds
      ? { ...storedStyle, ...renderedBounds }
      : storedStyle;
  const single = Boolean(layer);
  const locked = layer ? style.locked : true;

  const startResize = (direction: Direction, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!layer || locked) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { x: style.x, y: style.y, width: style.width, height: style.height };
    const rect = host.getBoundingClientRect();
    const widthPx = (start.width / 100) * rect.width;
    const heightPx = (start.height / 100) * rect.height;
    const ratio = widthPx / Math.max(1, heightPx);
    const ownerWindow = host.ownerDocument.defaultView ?? window;
    const move = (moveEvent: PointerEvent) => {
      const deltaXPx = moveEvent.clientX - startX;
      const deltaYPx = moveEvent.clientY - startY;
      const horizontal = direction.includes("e") ? 1 : direction.includes("w") ? -1 : 0;
      const vertical = direction.includes("s") ? 1 : direction.includes("n") ? -1 : 0;
      const fromCenter = moveEvent.altKey;
      const multiplier = fromCenter ? 2 : 1;
      let nextWidthPx = Math.max(4, widthPx + deltaXPx * horizontal * multiplier);
      let nextHeightPx = Math.max(4, heightPx + deltaYPx * vertical * multiplier);
      const corner = Boolean(horizontal && vertical);
      const keepsRatioByDefault =
        style.lockAspectRatio === true ||
        (corner && layer.type === "image" && style.lockAspectRatio !== false);
      const keepAspectRatio = moveEvent.shiftKey ? !keepsRatioByDefault : keepsRatioByDefault;
      if (keepAspectRatio) {
        if (corner && Math.abs(deltaYPx) > Math.abs(deltaXPx)) {
          nextWidthPx = nextHeightPx * ratio;
        } else if (horizontal) {
          nextHeightPx = nextWidthPx / ratio;
        } else {
          nextWidthPx = nextHeightPx * ratio;
        }
      } else {
        if (!horizontal) nextWidthPx = widthPx;
        if (!vertical) nextHeightPx = heightPx;
      }
      const nextWidth = (nextWidthPx / Math.max(1, rect.width)) * 100;
      const nextHeight = (nextHeightPx / Math.max(1, rect.height)) * 100;
      const rawX = fromCenter
        ? start.x + (start.width - nextWidth) / 2
        : start.x + (horizontal < 0 ? start.width - nextWidth : 0);
      const rawY = fromCenter
        ? start.y + (start.height - nextHeight) / 2
        : start.y + (vertical < 0 ? start.height - nextHeight : 0);
      const nextX = clamp(rawX, constrainToHost ? 0 : -100, constrainToHost ? 99.5 : 200);
      const nextY = clamp(rawY, constrainToHost ? 0 : -100, constrainToHost ? 99.5 : 200);
      onPatchLayer(layer.id, {
        x: nextX,
        y: nextY,
        width: clamp(nextWidth, 0.5, constrainToHost ? 100 - nextX : 250),
        height: clamp(nextHeight, 0.5, constrainToHost ? 100 - nextY : 250),
        horizontalSizing: "fixed",
        textAutoResize:
          layer.type === "text" ? (horizontal && !vertical ? "height" : "none") : undefined,
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
  };

  const startRotate = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!layer || locked) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = host.getBoundingClientRect();
    const centerX = rect.left + ((style.x + style.width / 2) / 100) * rect.width;
    const centerY = rect.top + ((style.y + style.height / 2) / 100) * rect.height;
    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    const startRotation = style.rotation;
    const ownerWindow = host.ownerDocument.defaultView ?? window;
    const move = (moveEvent: PointerEvent) => {
      const nextAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      let rotation = startRotation + ((nextAngle - startAngle) * 180) / Math.PI;
      if (moveEvent.shiftKey) rotation = Math.round(rotation / 15) * 15;
      onPatchLayer(layer.id, { rotation: clamp(rotation, -360, 360) });
    };
    const stop = () => {
      ownerWindow.removeEventListener("pointermove", move);
      ownerWindow.removeEventListener("pointerup", stop);
      ownerWindow.removeEventListener("pointercancel", stop);
    };
    ownerWindow.addEventListener("pointermove", move);
    ownerWindow.addEventListener("pointerup", stop);
    ownerWindow.addEventListener("pointercancel", stop);
  };

  return createPortal(
    <div
      className={`studio-selection-box ${single ? "is-single" : "is-group"} ${locked ? "is-locked" : ""}`}
      data-selection-layer={layer?.id}
      style={
        {
          left: `${style.x}%`,
          top: `${style.y}%`,
          width: `${style.width}%`,
          height: `${style.height}%`,
          transform: `rotate(${style.rotation}deg)`,
        } as CSSProperties
      }
    >
      {layer ? <span className="studio-selection-name">{layer.name}</span> : null}
      {single && !locked
        ? (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as Direction[]).map((direction) => (
            <button
              key={direction}
              type="button"
              className={`studio-selection-handle is-${direction}`}
              aria-label={`Resize ${direction}`}
              onPointerDown={(event) => startResize(direction, event)}
            />
          ))
        : null}
      {single && !locked ? (
        <>
          <span className="studio-rotation-line" />
          <button
            type="button"
            className="studio-rotation-handle"
            aria-label="Rotate selection"
            onPointerDown={startRotate}
          />
        </>
      ) : null}
    </div>,
    host,
  );
}
