import Moveable from "react-moveable";
import { useEffect, useMemo, useRef, useState } from "react";

import { BannerSceneView } from "./banner-scene";
import type { BannerFill, BannerLayerStyle, BannerScene, HomepageViewport } from "./types";

type Geometry = Pick<BannerLayerStyle, "x" | "y" | "width" | "height" | "rotation">;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function StudioCanvas({
  scene,
  viewport,
  zoom,
  selectedLayerIds,
  editingLayerId,
  cropLayerId,
  activeTool,
  onSelectLayers,
  onEditLayer,
  onCropLayer,
  onTextChange,
  onCropChange,
  onBackgroundCropChange,
  onCommitGeometry,
}: {
  scene: BannerScene;
  viewport: HomepageViewport;
  zoom: number;
  selectedLayerIds: string[];
  editingLayerId: string | null;
  cropLayerId: string | null;
  activeTool: "select" | "hand";
  onSelectLayers: (ids: string[]) => void;
  onEditLayer: (id: string | null) => void;
  onCropLayer: (id: string | null) => void;
  onTextChange: (id: string, text: string) => void;
  onCropChange: (id: string, patch: Pick<BannerLayerStyle, "cropX" | "cropY" | "cropZoom">) => void;
  onBackgroundCropChange: (
    id: string,
    patch: Pick<BannerFill, "offsetX" | "offsetY" | "zoom">,
  ) => void;
  onCommitGeometry: (changes: Array<{ id: string; geometry: Geometry }>) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  const scale = zoom / 100;
  const canvasWidth = viewport === "mobile" ? 390 : 1200;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    setTargets(
      selectedLayerIds
        .map((id) => frame.querySelector<HTMLElement>(`[data-banner-layer="${CSS.escape(id)}"]`))
        .filter((target): target is HTMLElement => Boolean(target)),
    );
  }, [scene, selectedLayerIds, viewport]);

  const selectedLayers = useMemo(
    () => scene.layers.filter((layer) => selectedLayerIds.includes(layer.id)),
    [scene.layers, selectedLayerIds],
  );
  const locked = selectedLayers.some((layer) => {
    const style =
      viewport === "mobile" ? { ...layer.style, ...(layer.mobileStyle ?? {}) } : layer.style;
    return style.locked;
  });

  const commitTargets = (changedTargets: Array<HTMLElement | SVGElement>) => {
    const frame = frameRef.current;
    if (!frame) return;
    const width = frame.clientWidth || canvasWidth;
    const height =
      frame.clientHeight || (viewport === "mobile" ? scene.mobileHeight : scene.height);
    const changes = changedTargets
      .map((target) => {
        if (!(target instanceof HTMLElement)) return null;
        const id = target.dataset.bannerLayer;
        if (!id) return null;
        const layer = scene.layers.find((item) => item.id === id);
        const resolved = layer
          ? viewport === "mobile"
            ? { ...layer.style, ...(layer.mobileStyle ?? {}) }
            : layer.style
          : null;
        const rotation = Number(target.dataset.rotation ?? resolved?.rotation ?? 0);
        target.style.left = `${target.offsetLeft}px`;
        target.style.top = `${target.offsetTop}px`;
        return {
          id,
          geometry: {
            x: clamp((target.offsetLeft / width) * 100, -100, 200),
            y: clamp((target.offsetTop / height) * 100, -100, 200),
            width: clamp((target.offsetWidth / width) * 100, 0.5, 250),
            height: clamp((target.offsetHeight / height) * 100, 0.5, 250),
            rotation: clamp(rotation, -360, 360),
          },
        };
      })
      .filter((change): change is { id: string; geometry: Geometry } => Boolean(change));
    if (changes.length) onCommitGeometry(changes);
  };

  return (
    <div
      ref={stageRef}
      className={`studio-canvas-stage ${activeTool === "hand" ? "is-panning" : ""}`}
      data-viewport={viewport}
      onPointerDown={(event) => {
        if (activeTool !== "hand" || !stageRef.current) return;
        event.preventDefault();
        panRef.current = {
          x: event.clientX,
          y: event.clientY,
          left: stageRef.current.scrollLeft,
          top: stageRef.current.scrollTop,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!panRef.current || !stageRef.current) return;
        stageRef.current.scrollLeft = panRef.current.left - (event.clientX - panRef.current.x);
        stageRef.current.scrollTop = panRef.current.top - (event.clientY - panRef.current.y);
      }}
      onPointerUp={() => {
        panRef.current = null;
      }}
    >
      <div className="studio-ruler studio-ruler--horizontal" aria-hidden="true" />
      <div className="studio-ruler studio-ruler--vertical" aria-hidden="true" />
      <div
        className="studio-canvas-scale"
        style={{
          width: `${canvasWidth * scale}px`,
          height: `${(viewport === "mobile" ? scene.mobileHeight : scene.height) * scale}px`,
        }}
      >
        <div
          ref={frameRef}
          className="studio-canvas-frame"
          style={{
            width: `${canvasWidth}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <BannerSceneView
            scene={scene}
            viewport={viewport}
            selectedLayerId={selectedLayerIds.length === 1 ? selectedLayerIds[0] : null}
            editingLayerId={editingLayerId}
            cropLayerId={cropLayerId}
            interactive={false}
            onSelectBackground={() => {
              onEditLayer(null);
              onCropLayer(null);
              onSelectLayers([]);
            }}
            onSelectLayer={(id, event) => {
              onEditLayer(null);
              if (cropLayerId !== id) onCropLayer(null);
              onSelectLayers(
                event.shiftKey
                  ? selectedLayerIds.includes(id)
                    ? selectedLayerIds.filter((selected) => selected !== id)
                    : [...selectedLayerIds, id]
                  : [id],
              );
            }}
            onEditLayer={(id) => {
              const layer = scene.layers.find((item) => item.id === id);
              onSelectLayers([id]);
              if (layer?.type === "image") {
                onEditLayer(null);
                onCropLayer(cropLayerId === id ? null : id);
              } else {
                onCropLayer(null);
                onEditLayer(layer?.type === "text" || layer?.type === "button" ? id : null);
              }
            }}
            onTextChange={onTextChange}
            onCropChange={onCropChange}
            onBackgroundCropChange={onBackgroundCropChange}
          />
          <Moveable
            target={targets.length > 1 ? targets : (targets[0] ?? null)}
            draggable={!locked && !editingLayerId && !cropLayerId}
            resizable={!locked && !editingLayerId}
            rotatable={!locked && !editingLayerId && !cropLayerId}
            keepRatio={
              selectedLayers.length === 1 && Boolean(selectedLayers[0]?.style.lockAspectRatio)
            }
            snappable
            snapDirections={{
              top: true,
              left: true,
              bottom: true,
              right: true,
              center: true,
              middle: true,
            }}
            elementSnapDirections={{
              top: true,
              left: true,
              bottom: true,
              right: true,
              center: true,
              middle: true,
            }}
            verticalGuidelines={[
              canvasWidth * 0.05,
              canvasWidth * 0.25,
              canvasWidth * 0.5,
              canvasWidth * 0.75,
              canvasWidth * 0.95,
            ]}
            horizontalGuidelines={[
              (viewport === "mobile" ? scene.mobileHeight : scene.height) * 0.05,
              (viewport === "mobile" ? scene.mobileHeight : scene.height) * 0.25,
              (viewport === "mobile" ? scene.mobileHeight : scene.height) * 0.5,
              (viewport === "mobile" ? scene.mobileHeight : scene.height) * 0.75,
              (viewport === "mobile" ? scene.mobileHeight : scene.height) * 0.95,
            ]}
            bounds={{
              left: 0,
              top: 0,
              right: canvasWidth,
              bottom: viewport === "mobile" ? scene.mobileHeight : scene.height,
            }}
            throttleDrag={0}
            throttleResize={0}
            throttleRotate={0}
            rotationPosition="top"
            onDrag={(event) => {
              event.target.style.left = `${event.left}px`;
              event.target.style.top = `${event.top}px`;
            }}
            onDragEnd={(event) => event.target && commitTargets([event.target])}
            onDragGroup={(event) =>
              event.events.forEach((item) => {
                item.target.style.left = `${item.left}px`;
                item.target.style.top = `${item.top}px`;
              })
            }
            onDragGroupEnd={(event) => commitTargets(event.targets)}
            onResize={(event) => {
              event.target.style.width = `${event.width}px`;
              event.target.style.height = `${event.height}px`;
              event.target.style.left = `${event.drag.left}px`;
              event.target.style.top = `${event.drag.top}px`;
            }}
            onResizeEnd={(event) => event.target && commitTargets([event.target])}
            onResizeGroup={(event) =>
              event.events.forEach((item) => {
                item.target.style.width = `${item.width}px`;
                item.target.style.height = `${item.height}px`;
                item.target.style.left = `${item.drag.left}px`;
                item.target.style.top = `${item.drag.top}px`;
              })
            }
            onResizeGroupEnd={(event) => commitTargets(event.targets)}
            onRotate={(event) => {
              event.target.dataset.rotation = String(event.rotation);
              event.target.style.transform = event.transform;
            }}
            onRotateEnd={(event) => event.target && commitTargets([event.target])}
            onRotateGroup={(event) =>
              event.events.forEach((item) => {
                item.target.dataset.rotation = String(item.rotation);
                item.target.style.transform = item.transform;
              })
            }
            onRotateGroupEnd={(event) => commitTargets(event.targets)}
          />
        </div>
      </div>
    </div>
  );
}
