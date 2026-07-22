import { createContext, useContext } from "react";

import type { BannerFill, BannerLayerStyle } from "./types";

export type StudioBannerSession = {
  activeBannerKey: string;
  selectedLayerIds: string[];
  editingLayerId: string | null;
  cropLayerId: string | null;
  cropFillId: string | null;
  interactionDisabled: boolean;
  onSelectLayer: (id: string, additive: boolean) => void;
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
