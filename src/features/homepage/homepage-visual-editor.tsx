import { Puck, usePuck, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  History,
  Layers3,
  Loader2,
  Monitor,
  MousePointer2,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Store,
  Tablet,
  Type,
  Undo2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { AdminCategory } from "@/services/adminService";
import { refreshPublicCatalog } from "@/services/adminService";
import {
  discardHomepageDraft,
  getHomepageEditorState,
  publishHomepage,
  restoreHomepageVersion,
  saveHomepageDraft,
} from "@/services/homepageService";
import { cloneDefaultHomepageData, normalizeHomepageData } from "./default-data";
import { createHomepagePuckConfig } from "./puck-config";
import type { HomepageData, HomepageVersion } from "./types";

const AUTOSAVE_DELAY_MS = 4_000;

type StudioPanel = "blocks" | "outline";

function HomepageStudioShell({ children }: { children: ReactNode }) {
  const { appState, dispatch, history, selectedItem } = usePuck();
  const [panel, setPanel] = useState<StudioPanel>("outline");
  const viewportWidth = appState.ui.viewports.current.width;

  const openPanel = (next: StudioPanel) => {
    setPanel(next);
    dispatch({
      type: "setUi",
      ui: {
        plugin: { current: next },
        leftSideBarVisible: true,
      },
      recordHistory: false,
    });
  };

  const setViewport = (width: number | "100%") => {
    dispatch({
      type: "setUi",
      ui: (current) => ({
        ...current,
        viewports: {
          ...current.viewports,
          current: { width, height: "auto" },
        },
      }),
      recordHistory: false,
    });
  };

  const setPreviewMode = (previewMode: "edit" | "interactive") => {
    dispatch({ type: "setUi", ui: { previewMode }, recordHistory: false });
  };

  return (
    <div className="homepage-studio-shell">
      <div className="homepage-studio-workspace">{children}</div>
      <div className="homepage-studio-selection" aria-live="polite">
        {selectedItem ? selectedItem.type : "Page"}
      </div>
      <div className="homepage-studio-toolbar" role="toolbar" aria-label="Homepage editor tools">
        <button
          type="button"
          className={appState.ui.previewMode === "edit" ? "is-active" : ""}
          aria-label="Select and edit elements"
          title="Select elements"
          onClick={() => setPreviewMode("edit")}
        >
          <MousePointer2 size={17} />
        </button>
        <span className="homepage-studio-toolbar__divider" />
        <button
          type="button"
          className={panel === "outline" ? "is-active" : ""}
          aria-label="Show page layers"
          title="Layers"
          onClick={() => openPanel("outline")}
        >
          <Layers3 size={17} />
        </button>
        <button
          type="button"
          className={panel === "blocks" ? "is-active" : ""}
          aria-label="Add a section"
          title="Add section"
          onClick={() => openPanel("blocks")}
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          aria-label="Add a text section"
          title="Add text"
          onClick={() => openPanel("blocks")}
        >
          <Type size={17} />
        </button>
        <span className="homepage-studio-toolbar__divider" />
        <button
          type="button"
          disabled={!history.hasPast}
          aria-label="Undo"
          title="Undo"
          onClick={history.back}
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          disabled={!history.hasFuture}
          aria-label="Redo"
          title="Redo"
          onClick={history.forward}
        >
          <Redo2 size={17} />
        </button>
        <span className="homepage-studio-toolbar__divider" />
        <button
          type="button"
          className={viewportWidth === 390 ? "is-active" : ""}
          aria-label="Mobile preview"
          title="Mobile preview"
          onClick={() => setViewport(390)}
        >
          <Smartphone size={16} />
        </button>
        <button
          type="button"
          className={viewportWidth === 768 ? "is-active" : ""}
          aria-label="Tablet preview"
          title="Tablet preview"
          onClick={() => setViewport(768)}
        >
          <Tablet size={17} />
        </button>
        <button
          type="button"
          className={viewportWidth === "100%" || viewportWidth === 1440 ? "is-active" : ""}
          aria-label="Desktop preview"
          title="Desktop preview"
          onClick={() => setViewport("100%")}
        >
          <Monitor size={17} />
        </button>
        <span className="homepage-studio-toolbar__divider" />
        <button
          type="button"
          className={appState.ui.previewMode === "interactive" ? "is-active" : ""}
          aria-label="Test links and interactions"
          title="Preview interactions"
          onClick={() => setPreviewMode("interactive")}
        >
          <Eye size={17} />
        </button>
      </div>
    </div>
  );
}

function cloneData(data: HomepageData) {
  return JSON.parse(JSON.stringify(data)) as HomepageData;
}

function timeLabel(value: string | null | undefined) {
  if (!value) return "Not saved yet";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isRevisionConflict(error: unknown) {
  return errorMessage(error, "").toLowerCase().includes("changed in another session");
}

export function HomepageVisualEditor({
  categories,
  onClose,
}: {
  categories: AdminCategory[];
  onClose?: () => void;
}) {
  const config = useMemo(
    () => createHomepagePuckConfig(categories, { previewStoreChrome: true }),
    [categories],
  );
  const [data, setData] = useState<HomepageData | null>(null);
  const dataRef = useRef<HomepageData | null>(null);
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  const [versions, setVersions] = useState<HomepageVersion[]>([]);
  const [publishedVersion, setPublishedVersion] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [unpublished, setUnpublished] = useState(false);
  const changeCounter = useRef(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conflict, setConflict] = useState<HomepageEditorState | null>(null);
  const [editorError, setEditorError] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const operation = useRef<Promise<unknown>>(Promise.resolve());

  const applyData = useCallback((next: HomepageData, nextRevision: number) => {
    const cloned = normalizeHomepageData(cloneData(next));
    dataRef.current = cloned;
    revisionRef.current = nextRevision;
    setData(cloned);
    setRevision(nextRevision);
    setDirty(false);
    setConflict(null);
    setEditorError("");
    setEditorKey((current) => current + 1);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const state = await getHomepageEditorState();
      const draft = state.draft ?? cloneDefaultHomepageData();
      applyData(draft, state.draft_revision);
      setUnpublished(JSON.stringify(draft) !== JSON.stringify(state.published));
      setVersions(state.versions);
      setPublishedVersion(state.published_version);
      setLastSavedAt(state.updated_at ?? null);
      setPublishedAt(state.published_at ?? null);
    } catch (error) {
      const message = errorMessage(error, "Could not load the homepage editor.");
      setEditorError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    void load();
  }, [load]);

  const queueOperation = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const queued = operation.current.then(task, task);
    operation.current = queued.catch(() => undefined);
    return queued;
  }, []);

  const saveDraft = useCallback(
    async (nextData = dataRef.current, quiet = false) => {
      if (!nextData) return;
      const changeAtStart = changeCounter.current;
      setSaving(true);
      try {
        const result = await queueOperation(() => saveHomepageDraft(nextData, revisionRef.current));
        revisionRef.current = result.revision;
        setRevision(result.revision);
        setLastSavedAt(result.updated_at);
        if (changeCounter.current === changeAtStart) setDirty(false);
        setEditorError("");
        setConflict(null);
        if (!quiet) toast.success("Draft saved");
      } catch (error) {
        if (isRevisionConflict(error)) {
          try {
            const latest = await getHomepageEditorState();
            revisionRef.current = latest.draft_revision;
            setRevision(latest.draft_revision);
            setConflict(latest);
            setEditorError("");
          } catch (refreshError) {
            setEditorError(errorMessage(refreshError, "Could not refresh the homepage revision."));
          }
        } else {
          const message = errorMessage(error, "Could not save the draft.");
          setEditorError(message);
          if (!quiet) toast.error(message);
        }
      } finally {
        setSaving(false);
      }
    },
    [queueOperation],
  );

  useEffect(() => {
    if (!dirty || !data || conflict) return;
    const timer = window.setTimeout(() => void saveDraft(data, true), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [conflict, data, dirty, saveDraft]);

  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        "fawzaan.homepage-editor-backup",
        JSON.stringify({ data, savedAt: new Date().toISOString() }),
      );
    }, 800);
    return () => window.clearTimeout(timer);
  }, [data]);

  const publish = async (nextData: HomepageData) => {
    if (conflict) {
      toast.error("Resolve the newer draft before publishing.");
      return;
    }
    setPublishing(true);
    try {
      await operation.current;
      const result = await queueOperation(() =>
        publishHomepage(nextData, revisionRef.current, "Published from visual editor"),
      );
      dataRef.current = cloneData(nextData);
      revisionRef.current = result.revision;
      setData(cloneData(nextData));
      setRevision(result.revision);
      setPublishedVersion(result.version);
      setPublishedAt(result.published_at);
      setLastSavedAt(result.published_at);
      setDirty(false);
      setUnpublished(false);
      setConflict(null);
      setEditorError("");
      await refreshPublicCatalog();
      const state = await getHomepageEditorState();
      setVersions(state.versions);
      toast.success(`Homepage version ${result.version} is live`);
    } catch (error) {
      if (isRevisionConflict(error)) {
        try {
          const latest = await getHomepageEditorState();
          revisionRef.current = latest.draft_revision;
          setRevision(latest.draft_revision);
          setConflict(latest);
          setEditorError("");
        } catch (refreshError) {
          setEditorError(errorMessage(refreshError, "Could not refresh the homepage revision."));
        }
      } else {
        const message = errorMessage(error, "Could not publish the homepage.");
        setEditorError(message);
        toast.error(message);
      }
    } finally {
      setPublishing(false);
    }
  };

  const restore = async (version: HomepageVersion) => {
    if (!confirm(`Restore version ${version.version}? It will become the live homepage.`)) return;
    setPublishing(true);
    try {
      const result = await queueOperation(() => restoreHomepageVersion(version.id));
      applyData(result.data as HomepageData, result.revision);
      setUnpublished(false);
      setPublishedVersion(result.version);
      setPublishedAt(result.published_at);
      setLastSavedAt(result.published_at);
      setHistoryOpen(false);
      await refreshPublicCatalog();
      const state = await getHomepageEditorState();
      setVersions(state.versions);
      toast.success(`Version ${version.version} restored`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not restore this version.");
    } finally {
      setPublishing(false);
    }
  };

  const resetOriginal = () => {
    if (
      !confirm(
        "Load the original Fawzaan homepage into the editor? It will not go live until you publish.",
      )
    )
      return;
    const original = cloneDefaultHomepageData();
    dataRef.current = original;
    setData(original);
    setConflict(null);
    setEditorError("");
    changeCounter.current += 1;
    setDirty(true);
    setUnpublished(true);
    setEditorKey((current) => current + 1);
    toast.success("Original design loaded as a draft");
  };

  const discard = async () => {
    if (!confirm("Discard unpublished changes and return to the currently published homepage?"))
      return;
    try {
      await operation.current;
      const result = await queueOperation(() => discardHomepageDraft());
      if (!result) {
        resetOriginal();
        return;
      }
      applyData(result.data as HomepageData, result.revision);
      setUnpublished(false);
      setLastSavedAt(result.updated_at);
      toast.success("Unpublished changes discarded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not discard the draft.");
    }
  };

  const keepLocalChanges = async () => {
    setConflict(null);
    setEditorError("");
    await saveDraft(dataRef.current, false);
  };

  const loadLatestDraft = () => {
    if (!conflict) return;
    applyData(conflict.draft ?? cloneDefaultHomepageData(), conflict.draft_revision);
    setUnpublished(JSON.stringify(conflict.draft) !== JSON.stringify(conflict.published));
    setVersions(conflict.versions);
    setPublishedVersion(conflict.published_version);
    setLastSavedAt(conflict.updated_at ?? null);
    setPublishedAt(conflict.published_at ?? null);
    toast.success("Latest homepage draft loaded");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#1e1e1e] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#F6AD32]" />
          <p className="mt-3 text-sm text-white/65">Loading visual editor...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#1e1e1e] p-5 text-white">
        <div className="w-full max-w-md rounded-lg border border-white/15 bg-[#292929] p-6 shadow-2xl">
          <AlertTriangle className="h-6 w-6 text-[#F6AD32]" />
          <h1 className="mt-4 text-lg font-semibold">The homepage could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {editorError || "The editor did not receive homepage data."}
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="brand-mango-bg inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-black"
            >
              <RotateCcw size={16} /> Retry
            </button>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-md border border-white/20 px-4 text-sm font-semibold"
              >
                Back to dashboard
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="homepage-visual-editor homepage-studio fixed inset-0 z-[1000] overflow-hidden bg-[#1e1e1e] text-white">
      <div className="homepage-studio-header flex h-[54px] items-center gap-3 border-b border-white/10 bg-[#1f1f1f] px-3 text-white sm:px-4">
        <button
          type="button"
          aria-label="Close homepage editor"
          title="Back to dashboard"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
        >
          <X size={17} />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Fawzaan homepage</p>
          <p className="truncate text-[11px] text-white/65">
            {saving
              ? "Saving draft..."
              : dirty
                ? "Unsaved draft changes"
                : unpublished
                  ? `Draft saved ${timeLabel(lastSavedAt)} - not live`
                  : `Live and up to date - version ${publishedVersion || "original"}`}
          </p>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
            onClick={resetOriginal}
            title="Load the original Fawzaan homepage as a draft"
          >
            <RotateCcw size={14} />
            <span className="hidden lg:inline">Original</span>
          </button>
          <button
            type="button"
            className="hidden h-8 items-center gap-1.5 rounded-md px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white md:inline-flex"
            onClick={() => void discard()}
            title="Discard unpublished changes"
            disabled={!unpublished}
          >
            <X size={14} />
            <span className="hidden lg:inline">Discard</span>
          </button>
          <button
            type="button"
            className="hidden h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
            onClick={() => void saveDraft()}
            disabled={saving}
          >
            <Save size={14} /> Save draft
          </button>
          <button
            type="button"
            className="brand-mango-bg inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold text-black shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:bg-none disabled:text-white/45 disabled:shadow-none sm:px-4"
            onClick={() => dataRef.current && void publish(dataRef.current)}
            disabled={publishing || Boolean(conflict) || !unpublished}
            title={unpublished ? "Publish this draft to the live storefront" : "Homepage is live"}
          >
            {publishing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : unpublished ? (
              <UploadCloud size={15} />
            ) : (
              <CheckCircle2 size={15} />
            )}
            {publishing ? "Publishing..." : unpublished ? "Publish changes" : "Published"}
          </button>
          <button
            type="button"
            className="hidden h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
            onClick={() => setHistoryOpen(true)}
          >
            <History size={14} /> History
          </button>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="grid h-8 w-8 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            title="Open live store"
          >
            <Store size={15} />
          </a>
        </div>
      </div>
      {conflict ? (
        <div className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">A newer homepage draft was saved elsewhere.</p>
              <p className="mt-0.5 text-[11px] text-amber-900/70">
                Your work is still here. Choose which version to continue with.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="h-8 rounded border border-amber-900/20 bg-white px-3 text-xs font-semibold"
              onClick={loadLatestDraft}
            >
              Load latest
            </button>
            <button
              type="button"
              className="h-8 rounded bg-black px-3 text-xs font-semibold text-white"
              onClick={() => void keepLocalChanges()}
            >
              Keep my changes
            </button>
          </div>
        </div>
      ) : editorError ? (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{editorError}</span>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => void saveDraft()}
          >
            Retry
          </button>
        </div>
      ) : null}
      <Puck
        key={editorKey}
        config={config}
        data={data as Data}
        height="calc(100dvh - 54px)"
        ui={{
          leftSideBarVisible: true,
          rightSideBarVisible: true,
          previewMode: "edit",
          viewports: {
            current: { width: 390, height: "auto" },
            controlsVisible: false,
            options: [],
          },
        }}
        viewports={[
          { width: 390, height: "auto", label: "Mobile", icon: <span>M</span> },
          { width: 768, height: "auto", label: "Tablet", icon: <span>T</span> },
          { width: "100%", height: "auto", label: "Desktop", icon: <span>D</span> },
        ]}
        overrides={{
          puck: HomepageStudioShell,
          header: () => null,
        }}
        onChange={(next) => {
          const homepage = next as HomepageData;
          dataRef.current = homepage;
          setData(homepage);
          changeCounter.current += 1;
          setDirty(true);
          setUnpublished(true);
        }}
        onPublish={(next) => void publish(next as HomepageData)}
      />

      {publishing ? (
        <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/55">
          <div className="flex items-center gap-3 rounded-lg bg-white px-5 py-4 text-sm font-semibold shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin" /> Publishing safely...
          </div>
        </div>
      ) : null}

      {historyOpen ? (
        <div
          className="fixed inset-0 z-[1100] bg-black/55"
          role="dialog"
          aria-modal="true"
          aria-label="Homepage version history"
          onClick={() => setHistoryOpen(false)}
        >
          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold">Version history</h2>
                <p className="mt-1 text-xs text-black/50">
                  The latest 30 published versions are retained.
                </p>
              </div>
              <button
                type="button"
                title="Close"
                aria-label="Close history"
                className="grid h-9 w-9 place-items-center"
                onClick={() => setHistoryOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {versions.length ? (
                versions.map((version) => (
                  <article key={version.id} className="rounded-md border border-black/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Version {version.version}
                          {version.version === publishedVersion ? (
                            <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-[9px] uppercase text-emerald-800">
                              Live
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-black/50">
                          {timeLabel(version.created_at)}
                        </p>
                      </div>
                      {version.version !== publishedVersion ? (
                        <button
                          type="button"
                          className="h-8 rounded bg-black px-3 text-xs font-semibold text-white"
                          onClick={() => void restore(version)}
                        >
                          Restore
                        </button>
                      ) : null}
                    </div>
                    {version.summary ? (
                      <p className="mt-3 text-xs leading-5 text-black/65">{version.summary}</p>
                    ) : null}
                    {version.created_by ? (
                      <p className="mt-2 truncate text-[10px] text-black/40">
                        {version.created_by}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-black/50">
                  No published versions yet. Your first publish will appear here.
                </div>
              )}
            </div>
            <div className="border-t bg-[#F9FAFB] p-4 text-xs leading-5 text-black/55">
              Published {timeLabel(publishedAt)}. Restoring creates a new version, so history is
              never overwritten.
            </div>
          </aside>
        </div>
      ) : null}
      <span className="sr-only">Revision {revision}</span>
    </div>
  );
}
