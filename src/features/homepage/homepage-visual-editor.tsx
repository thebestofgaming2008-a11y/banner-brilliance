import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Copy,
  Crop,
  Eye,
  Frame,
  GripVertical,
  Hand,
  History,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Lock,
  Minus,
  Monitor,
  MousePointer2,
  PanelLeft,
  Plus,
  RectangleHorizontal,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Type,
  Undo2,
  Unlock,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import "./homepage-studio.css";

import type { AdminCategory } from "@/services/adminService";
import { refreshPublicCatalog } from "@/services/adminService";
import {
  discardHomepageDraft,
  getHomepageEditorState,
  publishHomepage,
  restoreHomepageVersion,
  saveHomepageDraft,
} from "@/services/homepageService";
import { BannerSceneView } from "./banner-scene";
import {
  cloneDefaultHomepageData,
  isHomepageEditorData,
  normalizeHomepageData,
} from "./default-data";
import { StorefrontFramePreview, StudioCanvas } from "./studio-canvas";
import { StudioInspector } from "./studio-inspector";
import {
  createCollectionWithProducts,
  createHeroSlide,
  createLayer,
  createStandaloneBanner,
  createStudioId,
  ensureHomepageScenes,
  getScene,
  listStudioBanners,
  updateScene,
  type StudioBannerRef,
} from "./studio-model";
import type {
  BannerLayer,
  BannerLayerStyle,
  BannerScene,
  HomepageData,
  HomepageEditorState,
  HomepageVersion,
  HomepageViewport,
} from "./types";

const LOCAL_BACKUP_KEY = "fawzaan.homepage-studio.local-v4";
const LEGACY_BACKUP_KEYS = ["fawzaan.homepage-studio.local-v3"];
const HISTORY_LIMIT = 80;

type LocalBackup = { revision?: number; savedAt?: string; data?: HomepageData };

type CropSnapshot =
  | {
      kind: "layer";
      id: string;
      data: HomepageData;
      dirty: boolean;
      unpublished: boolean;
      past: HomepageData[];
      future: HomepageData[];
    }
  | {
      kind: "fill";
      id: string;
      data: HomepageData;
      dirty: boolean;
      unpublished: boolean;
      past: HomepageData[];
      future: HomepageData[];
    };

function openBackupStore() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("fawzaan-homepage-editor", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readLocalBackup(): Promise<LocalBackup | null> {
  if (!("indexedDB" in window)) return null;
  const db = await openBackupStore();
  return new Promise<LocalBackup | null>((resolve, reject) => {
    const request = db
      .transaction("drafts", "readonly")
      .objectStore("drafts")
      .get(LOCAL_BACKUP_KEY);
    request.onsuccess = () => resolve((request.result as LocalBackup | undefined) ?? null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

async function writeLocalBackup(backup: LocalBackup | null) {
  if (!("indexedDB" in window)) return;
  const db = await openBackupStore();
  await new Promise<void>((resolve, reject) => {
    const store = db.transaction("drafts", "readwrite").objectStore("drafts");
    const request = backup ? store.put(backup, LOCAL_BACKUP_KEY) : store.delete(LOCAL_BACKUP_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

async function clearLocalBackups() {
  if (!("indexedDB" in window)) return;
  const db = await openBackupStore();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("drafts", "readwrite");
    const store = transaction.objectStore("drafts");
    [LOCAL_BACKUP_KEY, ...LEGACY_BACKUP_KEYS].forEach((key) => store.delete(key));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => db.close());
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function timeLabel(value: string | null | undefined) {
  if (!value) return "Not saved";
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

function isConflict(error: unknown) {
  return errorMessage(error, "").toLowerCase().includes("changed in another session");
}

function activeItem(data: HomepageData, ref: StudioBannerRef | null) {
  return ref ? (data.content.find((item) => item.props.id === ref.itemId) ?? null) : null;
}

function uniqueScene(scene: BannerScene): BannerScene {
  const idMap = new Map<string, string>();
  return {
    ...clone(scene),
    name: `${scene.name} copy`,
    fills: scene.fills.map((fill) => ({ ...fill, id: createStudioId("fill") })),
    layers: scene.layers.map((layer) => {
      const id = createStudioId(layer.type);
      idMap.set(layer.id, id);
      return { ...layer, id, name: `${layer.name} copy` };
    }),
  };
}

function IconButton({
  label,
  active,
  disabled,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={active ? "is-active" : ""}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function HomepageVisualEditor({
  categories,
  onClose,
  initialData,
}: {
  categories: AdminCategory[];
  onClose?: () => void;
  initialData?: HomepageData;
}) {
  const [data, setData] = useState<HomepageData | null>(null);
  const dataRef = useRef<HomepageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [unpublished, setUnpublished] = useState(false);
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  const [publishedVersion, setPublishedVersion] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [versions, setVersions] = useState<HomepageVersion[]>([]);
  const [conflict, setConflict] = useState<HomepageEditorState | null>(null);
  const [editorError, setEditorError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<"file" | "assets">("file");
  const [addOpen, setAddOpen] = useState(false);
  const [viewport, setViewport] = useState<HomepageViewport>("desktop");
  const [zoom, setZoom] = useState(50);
  const [selectedBannerKey, setSelectedBannerKey] = useState("");
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [cropLayerId, setCropLayerId] = useState<string | null>(null);
  const [cropFillId, setCropFillId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "hand">("select");
  const [draggedBannerKey, setDraggedBannerKey] = useState<string | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const addWrapRef = useRef<HTMLDivElement>(null);
  const cropSnapshotRef = useRef<CropSnapshot | null>(null);
  const pastRef = useRef<HomepageData[]>([]);
  const futureRef = useRef<HomepageData[]>([]);
  const [historyState, setHistoryState] = useState({ past: 0, future: 0 });
  const lastHistoryAt = useRef(0);
  const operation = useRef<Promise<unknown>>(Promise.resolve());

  const banners = useMemo(() => (data ? listStudioBanners(data) : []), [data]);
  const selectedRef =
    banners.find((banner) => banner.key === selectedBannerKey) ?? banners[0] ?? null;
  const scene = data ? getScene(data, selectedRef) : null;
  const selectedLayers = scene
    ? scene.layers.filter((layer) => selectedLayerIds.includes(layer.id))
    : [];

  const applyLoadedData = useCallback((incoming: HomepageData, nextRevision: number) => {
    const source = isHomepageEditorData(incoming) ? incoming : cloneDefaultHomepageData();
    const next = ensureHomepageScenes(normalizeHomepageData(clone(source)));
    dataRef.current = next;
    setData(next);
    revisionRef.current = nextRevision;
    setRevision(nextRevision);
    setDirty(false);
    setConflict(null);
    setEditorError("");
    pastRef.current = [];
    futureRef.current = [];
    setHistoryState({ past: 0, future: 0 });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    if (initialData) {
      applyLoadedData(initialData, 0);
      setUnpublished(false);
      setLoading(false);
      return;
    }
    try {
      const state = await getHomepageEditorState();
      const source = isHomepageEditorData(state.draft) ? state.draft : cloneDefaultHomepageData();
      let recovered: HomepageData | null = null;
      try {
        const backup = await readLocalBackup();
        if (
          isHomepageEditorData(state.draft) &&
          backup?.data &&
          backup.revision === state.draft_revision &&
          isHomepageEditorData(backup.data)
        )
          recovered = backup.data;
        else if (backup || !state.draft) await clearLocalBackups();
      } catch {
        await clearLocalBackups().catch(() => undefined);
      }
      applyLoadedData(recovered ?? source, state.draft_revision);
      if (recovered) {
        setDirty(true);
        toast.info("Recovered local homepage changes");
      }
      setVersions(state.versions);
      setPublishedVersion(state.published_version);
      setLastSavedAt(state.updated_at ?? null);
      setUnpublished(!(state.is_draft_published ?? !state.has_published));
    } catch (error) {
      setEditorError(errorMessage(error, "Could not load the homepage editor."));
    } finally {
      setLoading(false);
    }
  }, [applyLoadedData, initialData]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedBannerKey && banners[0]) setSelectedBannerKey(banners[0].key);
    if (
      selectedBannerKey &&
      banners.length &&
      !banners.some((item) => item.key === selectedBannerKey)
    ) {
      setSelectedBannerKey(banners[0]!.key);
      setSelectedLayerIds([]);
    }
  }, [banners, selectedBannerKey]);

  useEffect(() => {
    if (!data || !dirty) return;
    const timer = window.setTimeout(() => {
      void writeLocalBackup({
        revision: revisionRef.current,
        savedAt: new Date().toISOString(),
        data,
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [data, dirty]);

  useEffect(() => {
    if (!addOpen) return;
    const close = (event: PointerEvent) => {
      if (!addWrapRef.current?.contains(event.target as Node)) setAddOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [addOpen]);

  const setHistoryCounts = () =>
    setHistoryState({ past: pastRef.current.length, future: futureRef.current.length });

  const commit = useCallback((next: HomepageData, coalesce = false) => {
    const current = dataRef.current;
    if (!current || JSON.stringify(current) === JSON.stringify(next)) return;
    const now = Date.now();
    if (!coalesce || now - lastHistoryAt.current > 500) {
      pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), clone(current)];
    }
    lastHistoryAt.current = now;
    futureRef.current = [];
    dataRef.current = next;
    setData(next);
    setDirty(true);
    setUnpublished(true);
    setHistoryCounts();
  }, []);

  const undo = useCallback(() => {
    const current = dataRef.current;
    const previous = pastRef.current.pop();
    if (!current || !previous) return;
    futureRef.current.push(clone(current));
    dataRef.current = previous;
    setData(previous);
    setDirty(true);
    setUnpublished(true);
    setEditingLayerId(null);
    setHistoryCounts();
  }, []);

  const redo = useCallback(() => {
    const current = dataRef.current;
    const next = futureRef.current.pop();
    if (!current || !next) return;
    pastRef.current.push(clone(current));
    dataRef.current = next;
    setData(next);
    setDirty(true);
    setUnpublished(true);
    setEditingLayerId(null);
    setHistoryCounts();
  }, []);

  const queueOperation = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const queued = operation.current.then(task, task);
    operation.current = queued.catch(() => undefined);
    return queued;
  }, []);

  const saveDraft = useCallback(
    async (quiet = false) => {
      const current = dataRef.current;
      if (!current) return;
      setSaving(true);
      try {
        const result = await queueOperation(() => saveHomepageDraft(current, revisionRef.current));
        revisionRef.current = result.revision;
        setRevision(result.revision);
        setLastSavedAt(result.updated_at);
        setDirty(false);
        setConflict(null);
        setEditorError("");
        await writeLocalBackup(null);
        if (!quiet) toast.success("Draft saved to Convex");
      } catch (error) {
        if (isConflict(error)) {
          const latest = await getHomepageEditorState();
          setConflict(latest);
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

  const publish = async () => {
    const current = dataRef.current;
    if (!current || conflict) return;
    setPublishing(true);
    try {
      await operation.current;
      const result = await queueOperation(() =>
        publishHomepage(current, revisionRef.current, "Published from homepage editor"),
      );
      revisionRef.current = result.revision;
      setRevision(result.revision);
      setPublishedVersion(result.version);
      setLastSavedAt(result.published_at);
      setDirty(false);
      setUnpublished(false);
      setConflict(null);
      await writeLocalBackup(null);
      await refreshPublicCatalog();
      const state = await getHomepageEditorState();
      setVersions(state.versions);
      toast.success(`Homepage version ${result.version} is live`);
    } catch (error) {
      if (isConflict(error)) {
        setConflict(await getHomepageEditorState());
      } else {
        const message = errorMessage(error, "Could not publish the homepage.");
        setEditorError(message);
        toast.error(message);
      }
    } finally {
      setPublishing(false);
    }
  };

  const mutateScene = useCallback(
    (updater: (current: BannerScene) => BannerScene, coalesce = false) => {
      const current = dataRef.current;
      if (!current || !selectedRef) return;
      commit(updateScene(current, selectedRef, updater), coalesce);
    },
    [commit, selectedRef],
  );

  const patchLayer = useCallback(
    (id: string, patch: Partial<BannerLayerStyle>) => {
      mutateScene(
        (current) => ({
          ...current,
          layers: current.layers.map((layer) =>
            layer.id === id
              ? viewport === "mobile"
                ? { ...layer, mobileStyle: { ...(layer.mobileStyle ?? {}), ...patch } }
                : { ...layer, style: { ...layer.style, ...patch } }
              : layer,
          ),
        }),
        true,
      );
    },
    [mutateScene, viewport],
  );

  const finishCrop = useCallback(() => {
    cropSnapshotRef.current = null;
    setCropLayerId(null);
    setCropFillId(null);
  }, []);

  const beginLayerCrop = useCallback(
    (id: string) => {
      const layer = scene?.layers.find((item) => item.id === id);
      if (!layer) return;
      const current = dataRef.current;
      if (!current) return;
      cropSnapshotRef.current = {
        kind: "layer",
        id,
        data: clone(current),
        dirty,
        unpublished,
        past: clone(pastRef.current),
        future: clone(futureRef.current),
      };
      setEditingLayerId(null);
      setCropFillId(null);
      setCropLayerId(id);
      setSelectedLayerIds([id]);
      setAddOpen(false);
    },
    [dirty, scene?.layers, unpublished],
  );

  const beginFillCrop = useCallback(
    (id: string) => {
      const fill = scene?.fills.find((item) => item.id === id && item.type === "image");
      if (!fill) return;
      const current = dataRef.current;
      if (!current) return;
      cropSnapshotRef.current = {
        kind: "fill",
        id,
        data: clone(current),
        dirty,
        unpublished,
        past: clone(pastRef.current),
        future: clone(futureRef.current),
      };
      setEditingLayerId(null);
      setCropLayerId(null);
      setCropFillId(id);
      setSelectedLayerIds([]);
      setAddOpen(false);
    },
    [dirty, scene?.fills, unpublished],
  );

  const cancelCrop = useCallback(() => {
    const snapshot = cropSnapshotRef.current;
    if (snapshot) {
      const restored = clone(snapshot.data);
      dataRef.current = restored;
      setData(restored);
      pastRef.current = clone(snapshot.past);
      futureRef.current = clone(snapshot.future);
      setDirty(snapshot.dirty);
      setUnpublished(snapshot.unpublished);
      lastHistoryAt.current = 0;
      setHistoryCounts();
    }
    finishCrop();
  }, [finishCrop]);

  const patchLayerContent = (id: string, patch: Partial<BannerLayer>) => {
    mutateScene(
      (current) => ({
        ...current,
        layers: current.layers.map((layer) =>
          layer.id === id ? { ...layer, ...patch, id } : layer,
        ),
      }),
      true,
    );
  };

  const deleteLayers = useCallback(
    (ids = selectedLayerIds) => {
      if (!ids.length) return;
      mutateScene((current) => ({
        ...current,
        layers: current.layers.filter((layer) => !ids.includes(layer.id)),
      }));
      setSelectedLayerIds([]);
      setEditingLayerId(null);
    },
    [mutateScene, selectedLayerIds],
  );

  const duplicateLayer = useCallback(
    (id: string) => {
      let nextId = "";
      mutateScene((current) => {
        const source = current.layers.find((layer) => layer.id === id);
        if (!source) return current;
        nextId = createStudioId(source.type);
        const duplicate: BannerLayer = {
          ...clone(source),
          id: nextId,
          name: `${source.name} copy`,
          style: { ...source.style, x: source.style.x + 2, y: source.style.y + 2 },
        };
        const index = current.layers.findIndex((layer) => layer.id === id);
        const layers = [...current.layers];
        layers.splice(index + 1, 0, duplicate);
        return { ...current, layers };
      });
      if (nextId) setSelectedLayerIds([nextId]);
    },
    [mutateScene],
  );

  const addLayer = useCallback(
    (type: BannerLayer["type"]) => {
      let nextId = "";
      mutateScene((current) => {
        const layer = createLayer(type, current.layers.length + 1);
        nextId = layer.id;
        return { ...current, layers: [...current.layers, layer] };
      });
      setSelectedLayerIds([nextId]);
      setLeftTab("file");
      setAddOpen(false);
    },
    [mutateScene],
  );

  const moveLayer = useCallback(
    (id: string, direction: -1 | 1) => {
      mutateScene((current) => {
        const index = current.layers.findIndex((layer) => layer.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.layers.length) return current;
        const layers = [...current.layers];
        [layers[index], layers[target]] = [layers[target]!, layers[index]!];
        return { ...current, layers };
      });
    },
    [mutateScene],
  );

  const reorderLayer = (sourceId: string, targetId: string) => {
    mutateScene((current) => {
      const source = current.layers.findIndex((layer) => layer.id === sourceId);
      const target = current.layers.findIndex((layer) => layer.id === targetId);
      if (source < 0 || target < 0 || source === target) return current;
      const layers = [...current.layers];
      const [layer] = layers.splice(source, 1);
      if (!layer) return current;
      layers.splice(target, 0, layer);
      return { ...current, layers };
    });
  };

  const alignSelected = (axis: "horizontal" | "vertical") => {
    selectedLayerIds.forEach((id) => {
      const layer = scene?.layers.find((item) => item.id === id);
      if (!layer) return;
      const style =
        viewport === "mobile" ? { ...layer.style, ...(layer.mobileStyle ?? {}) } : layer.style;
      patchLayer(
        id,
        axis === "horizontal" ? { x: 50 - style.width / 2 } : { y: 50 - style.height / 2 },
      );
    });
  };

  const addHero = () => {
    const current = dataRef.current;
    if (!current) return;
    const next = clone(current);
    const hero = next.content.find((item) => item.type === "Hero");
    if (!hero || hero.type !== "Hero") return;
    if (hero.props.slides.length >= 12)
      return toast.error("A hero carousel can contain up to 12 slides.");
    hero.props.slides.push(createHeroSlide(hero.props.slides.length));
    hero.props.autoplay = "on";
    commit(next);
    setAddOpen(false);
    window.setTimeout(() => {
      const latest = listStudioBanners(next)
        .filter((item) => item.kind === "hero")
        .at(-1);
      if (latest) setSelectedBannerKey(latest.key);
    }, 0);
  };

  const addSection = (
    kind: "standalone" | "collection",
    layout: "banner-top" | "banner-left" | "banner-right" = "banner-top",
  ) => {
    const current = dataRef.current;
    if (!current) return;
    const next = clone(current);
    const item =
      kind === "standalone"
        ? createStandaloneBanner()
        : createCollectionWithProducts(
            categories.find((category) => category.type === "collection")?.slug || "all",
            layout,
          );
    next.content.push(item);
    commit(next);
    window.setTimeout(() => {
      const latest = listStudioBanners(next).find((banner) => banner.itemId === item.props.id);
      if (latest) setSelectedBannerKey(latest.key);
    }, 0);
    setAddOpen(false);
  };

  const reorderBanner = (sourceKey: string, targetKey: string) => {
    const current = dataRef.current;
    const sourceRef = banners.find((banner) => banner.key === sourceKey);
    const targetRef = banners.find((banner) => banner.key === targetKey);
    if (!current || !sourceRef || !targetRef) return;
    if ((sourceRef.kind === "hero") !== (targetRef.kind === "hero")) return;
    const next = clone(current);
    if (sourceRef.kind === "hero" && targetRef.kind === "hero") {
      const hero = next.content.find((entry) => entry.type === "Hero");
      if (!hero || hero.type !== "Hero") return;
      const source = sourceRef.index ?? 0;
      const target = targetRef.index ?? 0;
      const [slide] = hero.props.slides.splice(source, 1);
      if (!slide) return;
      hero.props.slides.splice(target, 0, slide);
    } else if (sourceRef.kind !== "hero" && targetRef.kind !== "hero") {
      const source = next.content.findIndex((entry) => entry.props.id === sourceRef.itemId);
      const target = next.content.findIndex((entry) => entry.props.id === targetRef.itemId);
      if (source < 1 || target < 1) return;
      const [section] = next.content.splice(source, 1);
      if (!section) return;
      next.content.splice(target, 0, section);
    }
    commit(next);
    setSelectedBannerKey(sourceKey);
  };

  const duplicateBanner = () => {
    const current = dataRef.current;
    if (!current || !selectedRef) return;
    const next = clone(current);
    const item = next.content.find((entry) => entry.props.id === selectedRef.itemId);
    if (!item) return;
    if (selectedRef.kind === "hero" && item.type === "Hero") {
      const source = item.props.slides[selectedRef.index ?? 0];
      if (!source || item.props.slides.length >= 12) return;
      const copy = clone(source);
      if (copy.scene) copy.scene = uniqueScene(copy.scene);
      item.props.slides.splice((selectedRef.index ?? 0) + 1, 0, copy);
    } else {
      const index = next.content.indexOf(item);
      const copy = clone(item);
      copy.props.id = createStudioId("section");
      if (copy.type === "CollectionFeature" || copy.type === "PromoBanner") {
        if (copy.props.scene) copy.props.scene = uniqueScene(copy.props.scene);
      }
      next.content.splice(index + 1, 0, copy);
    }
    commit(next);
  };

  const deleteBanner = () => {
    const current = dataRef.current;
    if (!current || !selectedRef) return;
    if (!confirm(`Remove “${selectedRef.label}”?`)) return;
    const next = clone(current);
    const item = next.content.find((entry) => entry.props.id === selectedRef.itemId);
    if (!item) return;
    if (selectedRef.kind === "hero" && item.type === "Hero") {
      if (item.props.slides.length <= 1) return toast.error("Keep at least one hero slide.");
      item.props.slides.splice(selectedRef.index ?? 0, 1);
    } else {
      next.content = next.content.filter((entry) => entry.props.id !== selectedRef.itemId);
    }
    commit(next);
    setSelectedLayerIds([]);
  };

  const moveBanner = (direction: -1 | 1) => {
    const current = dataRef.current;
    if (!current || !selectedRef) return;
    const next = clone(current);
    const item = next.content.find((entry) => entry.props.id === selectedRef.itemId);
    if (!item) return;
    if (selectedRef.kind === "hero" && item.type === "Hero") {
      const index = selectedRef.index ?? 0;
      const target = index + direction;
      if (target < 0 || target >= item.props.slides.length) return;
      [item.props.slides[index], item.props.slides[target]] = [
        item.props.slides[target]!,
        item.props.slides[index]!,
      ];
    } else {
      const index = next.content.indexOf(item);
      const target = index + direction;
      if (index < 1 || target < 1 || target >= next.content.length) return;
      [next.content[index], next.content[target]] = [next.content[target]!, next.content[index]!];
    }
    commit(next);
  };

  const patchSection = (patch: Record<string, unknown>) => {
    const current = dataRef.current;
    if (!current || !selectedRef) return;
    const next = clone(current);
    const item = next.content.find((entry) => entry.props.id === selectedRef.itemId);
    if (!item) return;
    Object.assign(item.props, patch);
    commit(next, true);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "");
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (command && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (typing) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteLayers();
      } else if (event.key === "Escape") {
        if (cropLayerId || cropFillId) {
          cancelCrop();
          return;
        }
        setAddOpen(false);
        setEditingLayerId(null);
        setSelectedLayerIds([]);
      } else if (command && event.key.toLowerCase() === "d" && selectedLayerIds.length === 1) {
        event.preventDefault();
        duplicateLayer(selectedLayerIds[0]!);
      } else if (command && event.key === "[" && selectedLayerIds.length === 1) {
        event.preventDefault();
        moveLayer(selectedLayerIds[0]!, -1);
      } else if (command && event.key === "]" && selectedLayerIds.length === 1) {
        event.preventDefault();
        moveLayer(selectedLayerIds[0]!, 1);
      } else if (event.key === "Enter" && selectedLayerIds.length === 1) {
        const layer = scene?.layers.find((entry) => entry.id === selectedLayerIds[0]);
        if (layer?.type === "image") beginLayerCrop(layer.id);
        if (layer?.type === "text" || layer?.type === "button") setEditingLayerId(layer.id);
      } else if (event.key.toLowerCase() === "v") {
        setActiveTool("select");
      } else if (event.key.toLowerCase() === "h") {
        setActiveTool("hand");
      } else if (event.key.toLowerCase() === "t") {
        addLayer("text");
      } else if (event.key.toLowerCase() === "r") {
        addLayer("shape");
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        const amount = event.shiftKey ? 1 : 0.1;
        selectedLayerIds.forEach((id) => {
          const layer = scene?.layers.find((entry) => entry.id === id);
          if (!layer) return;
          const style =
            viewport === "mobile" ? { ...layer.style, ...(layer.mobileStyle ?? {}) } : layer.style;
          if (event.key === "ArrowLeft") patchLayer(id, { x: style.x - amount });
          if (event.key === "ArrowRight") patchLayer(id, { x: style.x + amount });
          if (event.key === "ArrowUp") patchLayer(id, { y: style.y - amount });
          if (event.key === "ArrowDown") patchLayer(id, { y: style.y + amount });
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    addLayer,
    beginLayerCrop,
    cancelCrop,
    cropFillId,
    cropLayerId,
    deleteLayers,
    duplicateLayer,
    moveLayer,
    patchLayer,
    redo,
    scene?.layers,
    selectedLayerIds,
    undo,
    viewport,
  ]);

  if (loading) {
    return (
      <div className="studio-loading">
        <Loader2 className="animate-spin" size={24} />
        <p>Opening homepage editor...</p>
      </div>
    );
  }

  if (!data || !scene || !selectedRef) {
    return (
      <div className="studio-loading">
        <Sparkles size={24} />
        <h1>The banner editor could not open</h1>
        <p>{editorError || "No editable hero or collection banners were found."}</p>
        <div className="studio-loading__actions">
          <button type="button" onClick={() => void load()}>
            Retry
          </button>
          {onClose ? (
            <button type="button" onClick={onClose}>
              Back
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const item = activeItem(data, selectedRef);
  const sectionSettings =
    item?.type === "CollectionFeature" ? (
      <section className="studio-inspector-section">
        <header>
          <h3>Products</h3>
        </header>
        <div className="studio-inspector-section__body">
          <label className="studio-field">
            <span>Collection</span>
            <select
              value={item.props.collection}
              onChange={(event) => patchSection({ collection: event.target.value })}
            >
              <option value="all">All products</option>
              {categories
                .filter((category) => category.is_active !== false)
                .map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="studio-field">
            <span>Products</span>
            <input
              type="number"
              min={1}
              max={8}
              value={item.props.productLimit}
              onChange={(event) =>
                patchSection({ productLimit: Math.min(8, Math.max(1, Number(event.target.value))) })
              }
            />
          </label>
          <label className="studio-field">
            <span>Layout</span>
            <select
              value={item.props.layout}
              onChange={(event) => patchSection({ layout: event.target.value })}
            >
              <option value="banner-top">Banner above products</option>
              <option value="banner-left">Banner left, products right</option>
              <option value="banner-right">Products left, banner right</option>
            </select>
          </label>
          <label className="studio-field">
            <span>Section fill</span>
            <input
              type="color"
              value={item.props.backgroundColor}
              onChange={(event) => patchSection({ backgroundColor: event.target.value })}
            />
          </label>
        </div>
      </section>
    ) : null;

  const heroItem = item?.type === "Hero" ? item : null;
  const prototypeSettings = heroItem ? (
    <section className="studio-inspector-section">
      <header>
        <h3>Carousel</h3>
      </header>
      <div className="studio-inspector-section__body">
        <label className="studio-field">
          <span>Autoplay</span>
          <select
            value={heroItem.props.autoplay}
            onChange={(event) => patchSection({ autoplay: event.target.value })}
          >
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
        </label>
        <label className="studio-field">
          <span>Transition</span>
          <select
            value={heroItem.props.transition || "slide"}
            onChange={(event) => patchSection({ transition: event.target.value })}
          >
            <option value="slide">Slide</option>
            <option value="fade">Fade</option>
          </select>
        </label>
        <label className="studio-field">
          <span>Interval</span>
          <input
            type="number"
            min={1500}
            max={30000}
            step={500}
            value={heroItem.props.autoplayInterval || 5200}
            onChange={(event) => patchSection({ autoplayInterval: Number(event.target.value) })}
          />
        </label>
        <label className="studio-field">
          <span>Duration</span>
          <input
            type="number"
            min={100}
            max={2000}
            step={50}
            value={heroItem.props.transitionDuration || 760}
            onChange={(event) => patchSection({ transitionDuration: Number(event.target.value) })}
          />
        </label>
        <label className="studio-field">
          <span>Pause on hover</span>
          <select
            value={heroItem.props.pauseOnHover || "yes"}
            onChange={(event) => patchSection({ pauseOnHover: event.target.value })}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="studio-field">
          <span>Loop</span>
          <select
            value={heroItem.props.loop || "yes"}
            onChange={(event) => patchSection({ loop: event.target.value })}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>
    </section>
  ) : null;

  return (
    <div className="homepage-studio-v2">
      <header className="studio-topbar">
        <div className="studio-topbar__left">
          <IconButton label="Back to dashboard" onClick={() => onClose?.()}>
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton
            label="Toggle left panel"
            active={leftOpen}
            onClick={() => setLeftOpen((value) => !value)}
          >
            <PanelLeft size={18} />
          </IconButton>
          <div className="studio-file-name">
            <strong>Homepage banners</strong>
            <span>
              {saving
                ? "Saving to Convex..."
                : dirty
                  ? "Local changes"
                  : unpublished
                    ? `Draft saved ${timeLabel(lastSavedAt)}`
                    : `Live version ${publishedVersion || "original"}`}
            </span>
          </div>
        </div>
        <div className="studio-topbar__center">
          <IconButton label="Select" active onClick={() => setEditingLayerId(null)}>
            <MousePointer2 size={17} />
          </IconButton>
          <span className="studio-divider" />
          <IconButton label="Undo" disabled={!historyState.past} onClick={undo}>
            <Undo2 size={17} />
          </IconButton>
          <IconButton label="Redo" disabled={!historyState.future} onClick={redo}>
            <Redo2 size={17} />
          </IconButton>
          <span className="studio-divider" />
          <IconButton
            label="Align horizontal centers"
            disabled={!selectedLayerIds.length}
            onClick={() => alignSelected("horizontal")}
          >
            <AlignCenterHorizontal size={17} />
          </IconButton>
          <IconButton
            label="Align vertical centers"
            disabled={!selectedLayerIds.length}
            onClick={() => alignSelected("vertical")}
          >
            <AlignCenterVertical size={17} />
          </IconButton>
        </div>
        <div className="studio-topbar__right">
          <button
            type="button"
            className="studio-secondary-button"
            onClick={() => setHistoryOpen(true)}
          >
            <History size={15} />
            <span>History</span>
          </button>
          <button
            type="button"
            className="studio-secondary-button"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye size={15} />
            <span>Preview</span>
          </button>
          <button
            type="button"
            className="studio-secondary-button"
            disabled={saving || !dirty}
            onClick={() => void saveDraft()}
          >
            <Save size={15} />
            <span>Save</span>
          </button>
          <button
            type="button"
            className="studio-publish-button"
            disabled={publishing || Boolean(conflict) || (!dirty && !unpublished)}
            onClick={() => setPublishConfirmOpen(true)}
          >
            {publishing ? <Loader2 className="animate-spin" size={15} /> : null} Publish
          </button>
        </div>
      </header>

      {conflict ? (
        <div className="studio-conflict">
          <span>A newer draft exists in Convex. Choose which work to keep.</span>
          <button
            type="button"
            onClick={() => {
              applyLoadedData(
                conflict.draft ?? cloneDefaultHomepageData(),
                conflict.draft_revision,
              );
              setVersions(conflict.versions);
              setConflict(null);
              toast.success("Latest Convex draft loaded");
            }}
          >
            Load latest
          </button>
          <button
            type="button"
            onClick={() => {
              revisionRef.current = conflict.draft_revision;
              setRevision(conflict.draft_revision);
              setConflict(null);
              void saveDraft();
            }}
          >
            Keep local
          </button>
        </div>
      ) : editorError ? (
        <div className="studio-error">{editorError}</div>
      ) : null}

      <div className={`studio-main ${leftOpen ? "" : "is-left-collapsed"}`}>
        <nav className="studio-bottom-toolbar" aria-label="Editor tools">
          <IconButton
            label="Select"
            active={activeTool === "select"}
            onClick={() => setActiveTool("select")}
          >
            <MousePointer2 size={18} />
          </IconButton>
          <IconButton
            label="Hand tool"
            active={activeTool === "hand"}
            onClick={() => setActiveTool("hand")}
          >
            <Hand size={18} />
          </IconButton>
          <span className="studio-divider" />
          <IconButton label="Text" onClick={() => addLayer("text")}>
            <Type size={18} />
          </IconButton>
          <IconButton label="Image" onClick={() => addLayer("image")}>
            <ImageIcon size={18} />
          </IconButton>
          <IconButton label="Button" onClick={() => addLayer("button")}>
            <RectangleHorizontal size={18} />
          </IconButton>
          <IconButton label="Rectangle" onClick={() => addLayer("shape")}>
            <RectangleHorizontal size={18} />
          </IconButton>
        </nav>

        {leftOpen ? (
          <aside className="studio-left-panel">
            <div className="studio-left-tabs">
              <button
                type="button"
                className={leftTab === "file" ? "is-active" : ""}
                onClick={() => setLeftTab("file")}
              >
                File
              </button>
              <button
                type="button"
                className={leftTab === "assets" ? "is-active" : ""}
                onClick={() => setLeftTab("assets")}
              >
                Assets
              </button>
            </div>
            {leftTab !== "assets" ? (
              <div className="studio-left-scroll">
                <>
                  <div className="studio-pages-header">
                    <span>Hero slides</span>
                    <div>
                      <IconButton label="Move banner up" onClick={() => moveBanner(-1)}>
                        <ChevronUp size={14} />
                      </IconButton>
                      <IconButton label="Move banner down" onClick={() => moveBanner(1)}>
                        <ChevronDown size={14} />
                      </IconButton>
                      <IconButton label="Duplicate banner" onClick={duplicateBanner}>
                        <Copy size={14} />
                      </IconButton>
                      <IconButton label="Delete banner" onClick={deleteBanner}>
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="studio-banner-list">
                    {banners
                      .filter((banner) => banner.kind === "hero")
                      .map((banner) => (
                        <button
                          type="button"
                          key={banner.key}
                          draggable
                          className={banner.key === selectedRef.key ? "is-active" : ""}
                          onDragStart={() => setDraggedBannerKey(banner.key)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (draggedBannerKey) reorderBanner(draggedBannerKey, banner.key);
                            setDraggedBannerKey(null);
                          }}
                          onClick={() => {
                            setSelectedBannerKey(banner.key);
                            setSelectedLayerIds([]);
                            setEditingLayerId(null);
                            setCropLayerId(null);
                            setCropFillId(null);
                          }}
                        >
                          <GripVertical size={13} />
                          <span>
                            <strong>{banner.label}</strong>
                            <small>{banner.group}</small>
                          </span>
                        </button>
                      ))}
                  </div>
                  <div className="studio-locked-range">
                    <Lock size={13} />
                    <span>
                      <strong>Original storefront</strong>
                      <small>Collections through Honey are locked</small>
                    </span>
                  </div>
                  <div className="studio-pages-header">
                    <span>After Honey</span>
                    <IconButton label="Add section after Honey" onClick={() => setAddOpen(true)}>
                      <Plus size={14} />
                    </IconButton>
                  </div>
                  <div className="studio-banner-list">
                    {banners
                      .filter((banner) => banner.kind !== "hero")
                      .map((banner) => (
                        <button
                          type="button"
                          key={banner.key}
                          draggable
                          className={banner.key === selectedRef.key ? "is-active" : ""}
                          onDragStart={() => setDraggedBannerKey(banner.key)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (draggedBannerKey) reorderBanner(draggedBannerKey, banner.key);
                            setDraggedBannerKey(null);
                          }}
                          onClick={() => {
                            setSelectedBannerKey(banner.key);
                            setSelectedLayerIds([]);
                            setEditingLayerId(null);
                            setCropLayerId(null);
                            setCropFillId(null);
                          }}
                        >
                          <GripVertical size={13} />
                          <span>
                            <strong>{banner.label}</strong>
                            <small>{banner.group}</small>
                          </span>
                        </button>
                      ))}
                    {!banners.some((banner) => banner.kind !== "hero") ? (
                      <button
                        type="button"
                        className="studio-empty-section"
                        onClick={() => setAddOpen(true)}
                      >
                        <Plus size={15} /> Add the first section
                      </button>
                    ) : null}
                  </div>
                </>
                <>
                  <div className="studio-layer-header">
                    <span>{selectedRef.label} layers</span>
                    <small>{scene.layers.length}</small>
                  </div>
                  <div className="studio-layer-list">
                    {[...scene.layers].reverse().map((layer) => {
                      const style =
                        viewport === "mobile"
                          ? { ...layer.style, ...(layer.mobileStyle ?? {}) }
                          : layer.style;
                      return (
                        <div
                          key={layer.id}
                          draggable
                          className={`studio-layer-row ${selectedLayerIds.includes(layer.id) ? "is-active" : ""}`}
                          onDragStart={() => setDraggedLayerId(layer.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (draggedLayerId) reorderLayer(draggedLayerId, layer.id);
                            setDraggedLayerId(null);
                          }}
                        >
                          <button
                            type="button"
                            className="studio-layer-select"
                            onClick={(event) => {
                              setCropLayerId(null);
                              setCropFillId(null);
                              setEditingLayerId(null);
                              setSelectedLayerIds(
                                event.shiftKey
                                  ? [...new Set([...selectedLayerIds, layer.id])]
                                  : [layer.id],
                              );
                            }}
                          >
                            {layer.type === "text" ? (
                              <Type size={14} />
                            ) : layer.type === "image" ? (
                              <ImageIcon size={14} />
                            ) : layer.type === "button" ? (
                              <RectangleHorizontal size={14} />
                            ) : (
                              <Circle size={14} />
                            )}
                            <span>{layer.name}</span>
                          </button>
                          <span className="studio-layer-actions">
                            <button
                              type="button"
                              aria-label={`${style.visible ? "Hide" : "Show"} ${layer.name}`}
                              onClick={() => patchLayer(layer.id, { visible: !style.visible })}
                            >
                              {style.visible ? <Eye size={12} /> : <Minus size={12} />}
                            </button>
                            <button
                              type="button"
                              aria-label={`${style.locked ? "Unlock" : "Lock"} ${layer.name}`}
                              onClick={() => patchLayer(layer.id, { locked: !style.locked })}
                            >
                              {style.locked ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              </div>
            ) : (
              <div className="studio-assets-panel">
                <button type="button" onClick={() => addLayer("text")}>
                  <Type size={20} />
                  <span>
                    <strong>Text</strong>
                    <small>Heading or paragraph</small>
                  </span>
                </button>
                <button type="button" onClick={() => addLayer("button")}>
                  <RectangleHorizontal size={20} />
                  <span>
                    <strong>Button</strong>
                    <small>Linked call to action</small>
                  </span>
                </button>
                <button type="button" onClick={() => addLayer("image")}>
                  <ImageIcon size={20} />
                  <span>
                    <strong>Image</strong>
                    <small>Upload, crop and resize</small>
                  </span>
                </button>
                <button type="button" onClick={() => addLayer("shape")}>
                  <Circle size={20} />
                  <span>
                    <strong>Shape</strong>
                    <small>Colour block or overlay</small>
                  </span>
                </button>
              </div>
            )}
          </aside>
        ) : null}

        <main className={`studio-workspace ${activeTool === "hand" ? "is-hand-tool" : ""}`}>
          <div className="studio-contextbar">
            <div className="studio-breadcrumb">
              <span>Homepage</span>
              <ChevronRight size={13} />
              <strong>{selectedRef.label}</strong>
              {selectedLayerIds.length ? (
                <>
                  <ChevronRight size={13} />
                  <span>{selectedLayers.map((layer) => layer.name).join(", ")}</span>
                </>
              ) : (
                <>
                  <ChevronRight size={13} />
                  <span>Background</span>
                </>
              )}
            </div>
            {cropLayerId || cropFillId ? (
              <div className="studio-modebar" aria-label="Crop controls">
                <button type="button" onClick={cancelCrop}>
                  <X size={14} /> Cancel
                </button>
                <span>
                  <Crop size={14} /> Crop
                </span>
                <button type="button" className="is-primary" onClick={finishCrop}>
                  <Check size={14} /> Done
                </button>
              </div>
            ) : null}
            <div className="studio-viewport-control">
              <IconButton
                label="Mobile viewport"
                active={viewport === "mobile"}
                onClick={() => {
                  finishCrop();
                  setAddOpen(false);
                  setViewport("mobile");
                  setZoom(82);
                }}
              >
                <Smartphone size={15} />
              </IconButton>
              <IconButton
                label="Tablet viewport"
                onClick={() => {
                  finishCrop();
                  setAddOpen(false);
                  setViewport("desktop");
                  setZoom(54);
                }}
              >
                <Tablet size={16} />
              </IconButton>
              <IconButton
                label="Desktop viewport"
                active={viewport === "desktop"}
                onClick={() => {
                  finishCrop();
                  setAddOpen(false);
                  setViewport("desktop");
                  setZoom(50);
                }}
              >
                <Monitor size={16} />
              </IconButton>
            </div>
            <div className="studio-add-wrap" ref={addWrapRef}>
              <button
                type="button"
                className="studio-add-button"
                onClick={() => setAddOpen((value) => !value)}
              >
                <Plus size={15} /> Add
              </button>
              {addOpen ? (
                <div className="studio-add-menu" role="menu" aria-label="Add homepage content">
                  <header>
                    <strong>Add to homepage</strong>
                    <button
                      type="button"
                      aria-label="Close add menu"
                      onClick={() => setAddOpen(false)}
                    >
                      <X size={14} />
                    </button>
                  </header>
                  <small className="studio-add-menu__group">Hero carousel</small>
                  <button type="button" onClick={addHero}>
                    <Frame size={17} />
                    <span>
                      <strong>Hero slide</strong>
                      <small>Joins the animated carousel</small>
                    </span>
                  </button>
                  <small className="studio-add-menu__group">After Honey</small>
                  <button type="button" onClick={() => addSection("standalone")}>
                    <ImageIcon size={17} />
                    <span>
                      <strong>Banner only</strong>
                      <small>Full-width collection banner</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => addSection("collection")}>
                    <Layers3 size={17} />
                    <span>
                      <strong>Banner above products</strong>
                      <small>Horizontal banner, product grid below</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => addSection("collection", "banner-left")}>
                    <Layers3 size={17} />
                    <span>
                      <strong>Banner left</strong>
                      <small>Banner left, products right</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => addSection("collection", "banner-right")}>
                    <Layers3 size={17} />
                    <span>
                      <strong>Banner right</strong>
                      <small>Products left, banner right</small>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <StudioCanvas
            data={data}
            selectedRef={selectedRef}
            scene={scene}
            viewport={viewport}
            zoom={zoom}
            selectedLayerIds={selectedLayerIds}
            editingLayerId={editingLayerId}
            cropLayerId={cropLayerId}
            cropFillId={cropFillId}
            activeTool={activeTool}
            onSelectBanner={(key) => {
              setSelectedBannerKey(key);
              setSelectedLayerIds([]);
            }}
            onSelectLayers={setSelectedLayerIds}
            onEditLayer={setEditingLayerId}
            onCropLayer={(id) => (id ? beginLayerCrop(id) : finishCrop())}
            onCropFill={(id) => (id ? beginFillCrop(id) : finishCrop())}
            onTextChange={(id, text) => patchLayerContent(id, { text })}
            onPatchLayer={patchLayer}
            onCropChange={(id, patch) => patchLayer(id, patch)}
            onBackgroundCropChange={(id, patch) =>
              mutateScene(
                (current) => ({
                  ...current,
                  fills: current.fills.map((fill) =>
                    fill.id === id ? { ...fill, ...patch } : fill,
                  ),
                }),
                true,
              )
            }
          />
          <div className="studio-zoom-control">
            <IconButton
              label="Zoom out"
              onClick={() => setZoom((value) => Math.max(20, value - 10))}
            >
              <ZoomOut size={15} />
            </IconButton>
            <button type="button" onClick={() => setZoom(viewport === "mobile" ? 82 : 50)}>
              {zoom}%
            </button>
            <IconButton
              label="Zoom in"
              onClick={() => setZoom((value) => Math.min(160, value + 10))}
            >
              <ZoomIn size={15} />
            </IconButton>
          </div>
        </main>

        <StudioInspector
          scene={scene}
          selectedLayers={selectedLayers}
          viewport={viewport}
          cropLayerId={cropLayerId}
          cropFillId={cropFillId}
          onUpdateScene={(next) => mutateScene(() => next, true)}
          onPatchLayer={patchLayer}
          onPatchLayerContent={patchLayerContent}
          onDeleteLayer={(id) => deleteLayers([id])}
          onDuplicateLayer={duplicateLayer}
          onMoveLayer={moveLayer}
          onCropLayer={(id) => (id ? beginLayerCrop(id) : finishCrop())}
          onCropFill={(id) => (id ? beginFillCrop(id) : finishCrop())}
          sectionSettings={sectionSettings}
          prototypeSettings={prototypeSettings}
        />
      </div>

      {previewOpen ? (
        <div
          className="studio-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Draft homepage preview"
        >
          <div className="studio-preview__bar">
            <strong>Draft preview</strong>
            <span>Nothing here is live until Publish.</span>
            <button type="button" onClick={() => setPreviewOpen(false)}>
              <X size={17} /> Close
            </button>
          </div>
          <div className="studio-preview__page">
            <StorefrontFramePreview data={data} />
          </div>
        </div>
      ) : null}

      {publishConfirmOpen ? (
        <div
          className="studio-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm homepage publish"
          onMouseDown={() => setPublishConfirmOpen(false)}
        >
          <div className="studio-publish-confirm" onMouseDown={(event) => event.stopPropagation()}>
            <h2>Publish homepage?</h2>
            <p>This replaces the public hero and adds your custom sections after Honey.</p>
            <div>
              <button type="button" onClick={() => setPublishConfirmOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="is-primary"
                onClick={() => {
                  setPublishConfirmOpen(false);
                  void publish();
                }}
              >
                Publish live
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {historyOpen ? (
        <div
          className="studio-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Version history"
          onMouseDown={() => setHistoryOpen(false)}
        >
          <aside className="studio-history" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>Version history</h2>
                <p>Published versions stored in Convex.</p>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)}>
                <X size={17} />
              </button>
            </header>
            <div className="studio-history__list">
              {versions.length ? (
                versions.map((version) => (
                  <div
                    key={version.id}
                    className={version.version === publishedVersion ? "is-live" : ""}
                  >
                    <span>
                      <strong>Version {version.version}</strong>
                      <small>{version.summary || "Homepage publish"}</small>
                      <small>{timeLabel(version.created_at)}</small>
                    </span>
                    <button
                      type="button"
                      disabled={publishing}
                      onClick={async () => {
                        if (!confirm(`Restore version ${version.version} as the live homepage?`))
                          return;
                        setPublishing(true);
                        try {
                          const result = await restoreHomepageVersion(version.id);
                          applyLoadedData(result.data as HomepageData, result.revision);
                          setPublishedVersion(result.version);
                          setLastSavedAt(result.published_at);
                          setUnpublished(false);
                          setHistoryOpen(false);
                          await refreshPublicCatalog();
                          setVersions((await getHomepageEditorState()).versions);
                          toast.success(`Version ${version.version} restored`);
                        } catch (error) {
                          toast.error(errorMessage(error, "Could not restore this version."));
                        } finally {
                          setPublishing(false);
                        }
                      }}
                    >
                      Restore
                    </button>
                  </div>
                ))
              ) : (
                <p className="studio-muted">No published editor versions exist yet.</p>
              )}
            </div>
            <footer>
              <button
                type="button"
                onClick={() => {
                  const original = ensureHomepageScenes(cloneDefaultHomepageData());
                  commit(original);
                  setHistoryOpen(false);
                  toast.success("Original design loaded locally");
                }}
              >
                <RotateCcw size={15} /> Load original locally
              </button>
              <button
                type="button"
                disabled={!unpublished}
                onClick={async () => {
                  if (!confirm("Discard all unpublished changes?")) return;
                  const result = await discardHomepageDraft();
                  if (result) applyLoadedData(result.data as HomepageData, result.revision);
                  else applyLoadedData(cloneDefaultHomepageData(), revisionRef.current);
                  setUnpublished(false);
                  setHistoryOpen(false);
                  await writeLocalBackup(null);
                }}
              >
                <Trash2 size={15} /> Discard draft
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      {publishing ? (
        <div className="studio-busy">
          <Loader2 className="animate-spin" size={25} />
          <span>Publishing homepage...</span>
        </div>
      ) : null}
    </div>
  );
}
