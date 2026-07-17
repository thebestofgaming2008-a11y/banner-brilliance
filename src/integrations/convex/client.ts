import { convex as sharedConvex } from "@/lib/backend";

if (!sharedConvex) {
  throw new Error("Missing VITE_CONVEX_URL. Add it to .env.local to enable Convex.");
}

export const convex = sharedConvex;
