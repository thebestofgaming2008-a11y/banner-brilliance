import { useMemo, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
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
}: {
  host: HTMLElement | null;
  layers: BannerLayer[];
  viewport: HomepageViewport;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
}) {
  const selection = useMemo(() => {
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

  if (!host || !selection) return null;
  const { layer, style } = selection;
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
      let nextWidthPx = Math.max(4, widthPx + deltaXPx * horizontal);
      let nextHeightPx = Math.max(4, heightPx + deltaYPx * vertical);
      if (style.lockAspectRatio) {
        if (horizontal) nextHeightPx = nextWidthPx / ratio;
        else nextWidthPx = nextHeightPx * ratio;
      } else {
        if (!horizontal) nextWidthPx = widthPx;
        if (!vertical) nextHeightPx = heightPx;
      }
      const nextWidth = (nextWidthPx / Math.max(1, rect.width)) * 100;
      const nextHeight = (nextHeightPx / Math.max(1, rect.height)) * 100;
      onPatchLayer(layer.id, {
        x: clamp(start.x + (horizontal < 0 ? start.width - nextWidth : 0), -100, 200),
        y: clamp(start.y + (vertical < 0 ? start.height - nextHeight : 0), -100, 200),
        width: clamp(nextWidth, 0.5, 250),
        height: clamp(nextHeight, 0.5, 250),
        horizontalSizing: "fixed",
      });
    };
    const stop = () => {
      ownerWindow.removeEventListener("pointermove", move);
      ownerWindow.removeEventListener("pointerup", stop);
    };
    ownerWindow.addEventListener("pointermove", move);
    ownerWindow.addEventListener("pointerup", stop);
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
    };
    ownerWindow.addEventListener("pointermove", move);
    ownerWindow.addEventListener("pointerup", stop);
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
