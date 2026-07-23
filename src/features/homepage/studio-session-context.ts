import { createContext, useContext } from "react";

import type { BannerFill, BannerLayerStyle, HomepageViewport } from "./types";

export type StudioBannerSession = {
  activeBannerKey: string;
  viewport: HomepageViewport;
  selectedLayerIds: string[];
  editingLayerId: string | null;
  cropLayerId: string | null;
  cropFillId: string | null;
  snapGuides: { x?: number; y?: number } | null;
  interactionDisabled: boolean;
  onSelectLayer: (id: string, additive: boolean) => void;
  onSelectDeep: (clientX: number, clientY: number) => void;
  onSnapGuides: (guides: { x?: number; y?: number } | null) => void;
  onEditLayer: (id: string) => void;
  onSelectBackground: () => void;
  onEditBackground: (id: string | null) => void;
  onTextChange: (id: string, text: string) => void;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
  onCropChange: (id: string, patch: Pick<BannerLayerStyle, "cropX" | "cropY" | "cropZoom">) => void;
  onBackgroundCropChange: (
    id: string,
    patch: Pick<BannerFill, "offsetX" | "offsetY" | "zoom">,
  ) => void;
};

export const StudioSessionContext = createContext<StudioBannerSession | null>(null);

export function useStudioBannerSession(editorKey: string | undefined) {
  const session = useContext(StudioSessionContext);
  return session && editorKey === session.activeBannerKey ? session : null;
}

export function useStudioViewport() {
  return useContext(StudioSessionContext)?.viewport ?? null;
}
