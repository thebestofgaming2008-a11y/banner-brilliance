import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import type { AdminCategory } from "@/services/adminService";

const HomepageVisualEditor = lazy(() =>
  import("@/features/homepage/homepage-visual-editor").then((module) => ({
    default: module.HomepageVisualEditor,
  })),
);

class HomepageEditorErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Homepage editor failed to render", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#1e1e1e] p-5 text-white">
        <div className="w-full max-w-md rounded-lg border border-white/15 bg-[#292929] p-6 shadow-2xl">
          <AlertTriangle className="h-6 w-6 text-[#F6AD32]" />
          <h1 className="mt-4 text-lg font-semibold">The homepage editor could not open</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {this.state.error.message || "The editor encountered an unexpected browser error."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="brand-mango-bg mt-5 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-black"
          >
            <RefreshCw size={16} /> Reload editor
          </button>
        </div>
      </div>
    );
  }
}

export function HomepageEditorPortal({
  categories,
  onClose,
}: {
  categories: AdminCategory[];
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <HomepageEditorErrorBoundary>
      <Suspense
        fallback={
          <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#1e1e1e] text-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#F6AD32]" />
              <p className="mt-3 text-sm text-white/65">Opening homepage editor...</p>
            </div>
          </div>
        }
      >
        <HomepageVisualEditor categories={categories} onClose={onClose} />
      </Suspense>
    </HomepageEditorErrorBoundary>,
    document.body,
  );
}
