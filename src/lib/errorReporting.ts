type ErrorReportingOptions = {
  mechanism?: { handled?: boolean; type?: string };
};

type ClientEvents = {
  captureException?: (
    error: unknown,
    context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
    options?: ErrorReportingOptions,
  ) => void;
};

declare global {
  interface Window {
    __clientEvents?: ClientEvents;
  }
}

export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__clientEvents?.captureException?.(
    error,
    { tags: { source: "runtime" }, extra: context },
    { mechanism: { handled: true, type: "react-boundary" } },
  );
}
