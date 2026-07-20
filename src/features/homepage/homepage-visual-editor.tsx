import { Puck, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  History,
  Loader2,
  RotateCcw,
  Save,
  Store,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export function HomepageVisualEditor({ categories }: { categories: AdminCategory[] }) {
  const config = useMemo(() => createHomepagePuckConfig(categories), [categories]);
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

  if (loading || !data) {
    return (
      <div className="grid min-h-[68vh] place-items-center rounded-lg border bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          <p className="mt-3 text-sm text-black/55">Loading visual editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="homepage-visual-editor overflow-hidden rounded-lg border border-[#D1D5DB] bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b bg-[#111827] px-4 py-2.5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Homepage visual editor</p>
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded border border-white/20 px-3 text-xs hover:bg-white/10"
            onClick={() => void saveDraft()}
            disabled={saving}
          >
            <Save size={14} /> Save draft
          </button>
          <button
            type="button"
            className="brand-mango-bg inline-flex h-9 items-center gap-2 px-4 text-xs font-bold text-black shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:bg-none disabled:text-white/45 disabled:shadow-none"
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
            className="inline-flex h-8 items-center gap-1.5 rounded border border-white/20 px-3 text-xs hover:bg-white/10"
            onClick={() => setHistoryOpen(true)}
          >
            <History size={14} /> History
          </button>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded border border-white/20 px-3 text-xs hover:bg-white/10"
          >
            <Eye size={14} /> View store
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
        height="calc(100dvh - 190px)"
        viewports={[
          { width: 390, height: "auto", label: "Mobile", icon: <span>M</span> },
          { width: 768, height: "auto", label: "Tablet", icon: <span>T</span> },
          { width: 1440, height: "auto", label: "Desktop", icon: <span>D</span> },
        ]}
        onChange={(next) => {
          const homepage = next as HomepageData;
          dataRef.current = homepage;
          setData(homepage);
          changeCounter.current += 1;
          setDirty(true);
          setUnpublished(true);
        }}
        onPublish={(next) => void publish(next as HomepageData)}
        headerTitle="Fawzaan"
        headerPath="Homepage"
        renderHeaderActions={() => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="Discard unpublished changes"
              className="inline-flex h-8 items-center gap-1 rounded border border-black/10 px-2.5 text-xs"
              onClick={() => void discard()}
            >
              <X size={13} /> Discard
            </button>
            <button
              type="button"
              title="Load original design"
              className="inline-flex h-8 items-center gap-1 rounded border border-black/10 px-2.5 text-xs"
              onClick={resetOriginal}
            >
              <RotateCcw size={13} /> Original
            </button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              title="Open storefront"
              className="grid h-8 w-8 place-items-center rounded border border-black/10"
            >
              <Store size={14} />
            </a>
          </div>
        )}
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
