import { ConvexHttpClient } from "convex/browser";
import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

export const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
export const convexHttp = convexUrl ? new ConvexHttpClient(convexUrl) : null;
