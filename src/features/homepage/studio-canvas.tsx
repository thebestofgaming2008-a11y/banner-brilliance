import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { StoreFooter, StoreHeaderPreview } from "@/components/store/store-chrome";
import { LegacyHomepageContent } from "@/routes/index";
import { StudioSelection } from "./studio-selection";
import type { StudioBannerSession } from "./studio-session-context";
import { StudioSessionProvider } from "./studio-session";
import type { StudioBannerRef } from "./studio-model";
import type {
  BannerFill,
  BannerLayerStyle,
  BannerScene,
  HomepageData,
  HomepageViewport,
} from "./types";

function editorPreviewData(data: HomepageData, selectedRef: StudioBannerRef) {
  const next = structuredClone(data);
  const hero = next.content.find((item) => item.type === "Hero");
  if (hero?.type === "Hero" && selectedRef.kind === "hero") {
    hero.props.editorSlide = (selectedRef.index ?? 0) + 1;
  }
  return next;
}

export function StorefrontFramePreview({
  data,
  editMode = false,
}: {
  data: HomepageData;
  editMode?: boolean;
}) {
  return (
    <div className="studio-storefront-page min-h-screen bg-white font-sans-ui text-black">
      <StoreHeaderPreview />
      <LegacyHomepageContent homepage={data} editMode={editMode} />
      <StoreFooter />
    </div>
  );
}

export function StudioCanvas({
  data,
  selectedRef,
  scene,
  viewport,
  zoom,
  selectedLayerIds,
  editingLayerId,
  cropLayerId,
  cropFillId,
  activeTool,
  onSelectBanner,
  onSelectLayers,
  onEditLayer,
  onCropLayer,
  onCropFill,
  onTextChange,
  onPatchLayer,
  onCropChange,
  onBackgroundCropChange,
}: {
  data: HomepageData;
  selectedRef: StudioBannerRef;
  scene: BannerScene;
  viewport: HomepageViewport;
  zoom: number;
  selectedLayerIds: string[];
  editingLayerId: string | null;
  cropLayerId: string | null;
  cropFillId: string | null;
  activeTool: "select" | "hand";
  onSelectBanner: (key: string) => void;
  onSelectLayers: (ids: string[]) => void;
  onEditLayer: (id: string | null) => void;
  onCropLayer: (id: string | null) => void;
  onCropFill: (id: string | null) => void;
  onTextChange: (id: string, text: string) => void;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
  onCropChange: (id: string, patch: Pick<BannerLayerStyle, "cropX" | "cropY" | "cropZoom">) => void;
  onBackgroundCropChange: (
    id: string,
    patch: Pick<BannerFill, "offsetX" | "offsetY" | "zoom">,
  ) => void;
}) {
  const frameDocumentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [sceneRoot, setSceneRoot] = useState<HTMLElement | null>(null);
  const [coordinateRoot, setCoordinateRoot] = useState<HTMLElement | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number } | null>(null);
  const scale = zoom / 100;
  const canvasWidth = viewport === "mobile" ? 390 : 1440;
  const canvasHeight = viewport === "mobile" ? 844 : 900;
  const previewData = useMemo(() => editorPreviewData(data, selectedRef), [data, selectedRef]);
  const selectedLayers = useMemo(
    () => scene.layers.filter((layer) => selectedLayerIds.includes(layer.id)),
    [scene.layers, selectedLayerIds],
  );

  useEffect(() => {
    frameDocumentRef.current?.style.setProperty("--studio-canvas-ui-scale", String(100 / zoom));
  }, [zoom]);

  useLayoutEffect(() => {
    const frame = frameDocumentRef.current;
    if (!frame) return;
    const nextSceneRoot = frame.querySelector<HTMLElement>(
      `[data-editor-banner-key="${CSS.escape(selectedRef.key)}"]`,
    );
    setSceneRoot(nextSceneRoot);
    setCoordinateRoot(
      nextSceneRoot?.querySelector<HTMLElement>("[data-banner-coordinate-root]") ?? null,
    );
  }, [previewData, selectedRef.key, viewport]);

  useEffect(() => {
    if (!sceneRoot) return;
    sceneRoot.scrollIntoView({ block: "center", behavior: "auto" });
  }, [sceneRoot, selectedRef.key, viewport]);

  const studioSession = useMemo<StudioBannerSession>(
    () => ({
      activeBannerKey: selectedRef.key,
      viewport,
      selectedLayerIds,
      editingLayerId,
      cropLayerId,
      cropFillId,
      snapGuides,
      interactionDisabled: activeTool !== "select",
      onSelectLayer: (id, additive) => {
        onEditLayer(null);
        onCropFill(null);
        if (cropLayerId !== id) onCropLayer(null);
        onSelectLayers(
          additive
            ? selectedLayerIds.includes(id)
              ? selectedLayerIds.filter((selected) => selected !== id)
              : [...selectedLayerIds, id]
            : [id],
        );
      },
      onSelectDeep: (clientX, clientY) => {
        if (!sceneRoot) return;
        const layerIds = sceneRoot.ownerDocument
          .elementsFromPoint(clientX, clientY)
          .map(
            (element) => element.closest<HTMLElement>("[data-banner-layer]")?.dataset.bannerLayer,
          )
          .filter((id): id is string => Boolean(id));
        const ordered = [...new Set(layerIds)].filter((id) =>
          scene.layers.some((layer) => layer.id === id),
        );
        if (!ordered.length) return;
        const current = selectedLayerIds.length === 1 ? selectedLayerIds[0] : null;
        const currentIndex = current ? ordered.indexOf(current) : -1;
        onEditLayer(null);
        onCropLayer(null);
        onCropFill(null);
        onSelectLayers([ordered[(currentIndex + 1) % ordered.length]!]);
      },
      onSnapGuides: setSnapGuides,
      onEditLayer: (id) => {
        const layer = scene.layers.find((item) => item.id === id);
        onSelectLayers([id]);
        onCropFill(null);
        if (layer?.type === "image") {
          onEditLayer(null);
          onCropLayer(cropLayerId === id ? null : id);
        } else {
          onCropLayer(null);
          onEditLayer(layer?.type === "text" || layer?.type === "button" ? id : null);
        }
      },
      onSelectBackground: () => {
        onEditLayer(null);
        onCropLayer(null);
        onSelectLayers([]);
      },
      onEditBackground: (id) => {
        onEditLayer(null);
        onCropLayer(null);
        onSelectLayers([]);
        onCropFill(id);
      },
      onTextChange,
      onPatchLayer,
      onCropChange,
      onBackgroundCropChange,
    }),
    [
      activeTool,
      cropFillId,
      cropLayerId,
      editingLayerId,
      onBackgroundCropChange,
      onCropChange,
      onCropFill,
      onCropLayer,
      onEditLayer,
      onPatchLayer,
      onSelectLayers,
      onTextChange,
      scene.layers,
      sceneRoot,
      snapGuides,
      selectedLayerIds,
      selectedRef.key,
      viewport,
    ],
  );

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
      onPointerCancel={() => {
        panRef.current = null;
      }}
    >
      <div className="studio-ruler studio-ruler--horizontal" aria-hidden="true" />
      <div className="studio-ruler studio-ruler--vertical" aria-hidden="true" />
      <div
        className="studio-canvas-scale"
        style={{ width: `${canvasWidth * scale}px`, height: `${canvasHeight * scale}px` }}
      >
        <div
          className="studio-canvas-frame"
          role="region"
          aria-label={`${viewport} storefront preview`}
          style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, zoom: scale }}
        >
          <StudioSessionProvider value={studioSession}>
            <div
              ref={frameDocumentRef}
              className="studio-frame-document"
              onClickCapture={(event) => {
                const target = event.target as HTMLElement;
                const banner = target.closest<HTMLElement>("[data-editor-banner-key]");
                const bannerKey = banner?.dataset.editorBannerKey;
                if (bannerKey === selectedRef.key) return;
                event.preventDefault();
                event.stopPropagation();
                if (bannerKey) {
                  onSelectBanner(bannerKey);
                  onSelectLayers([]);
                  onEditLayer(null);
                  onCropLayer(null);
                  onCropFill(null);
                }
              }}
            >
              <StorefrontFramePreview data={previewData} editMode />
              <StudioSelection
                host={coordinateRoot}
                layers={cropLayerId || cropFillId ? [] : selectedLayers}
                viewport={viewport}
                onPatchLayer={onPatchLayer}
              />
            </div>
          </StudioSessionProvider>
        </div>
      </div>
    </div>
  );
}
