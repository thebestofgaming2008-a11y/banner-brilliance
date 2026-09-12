import type { ReactNode } from "react";

import { StudioSessionContext, type StudioBannerSession } from "./studio-session-context";

export function StudioSessionProvider({
  value,
  children,
}: {
  value: StudioBannerSession;
  children: ReactNode;
}) {
  return <StudioSessionContext.Provider value={value}>{children}</StudioSessionContext.Provider>;
}
