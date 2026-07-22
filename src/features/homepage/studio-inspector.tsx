import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Blend,
  BoxSelect,
  ChevronDown,
  Component,
  Copy,
  Crop,
  Droplets,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Grid2X2,
  Image as ImageIcon,
  Library,
  Link2,
  Maximize2,
  Minus,
  MoreHorizontal,
  MoveHorizontal,
  Palette,
  Pipette,
  Plus,
  Ratio,
  Rows3,
  Scaling,
  Trash2,
  Unlink2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { HomepageImageInput } from "./homepage-image-field";
import type {
  BannerFill,
  BannerLayer,
  BannerLayerStyle,
  BannerScene,
  HomepageViewport,
} from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function rounded(value: number, step: number) {
  const decimals = String(step).includes(".") ? String(step).split(".")[1]!.length : 0;
  return Number(value.toFixed(Math.min(4, decimals + 1)));
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const scrub = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startValue = value;
    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    const move = (moveEvent: PointerEvent) => {
      const multiplier = moveEvent.shiftKey ? 10 : moveEvent.altKey ? 0.1 : 1;
      onChange(
        clamp(
          rounded(startValue + (moveEvent.clientX - startX) * step * multiplier, step),
          min,
          max,
        ),
      );
    };
    const stop = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelection;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <label className="figma-number-field">
      <span title={`Drag to change ${label}`} onPointerDown={scrub}>
        {label}
      </span>
      <input
        type="number"
        aria-label={label}
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
      />
      {suffix ? <small>{suffix}</small> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  hideLabel = false,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  hideLabel?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`figma-select-field ${hideLabel ? "is-label-hidden" : ""}`}>
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InspectorSection({
  title,
  action,
  children,
  defaultOpen = true,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`figma-inspector-section ${open ? "is-open" : "is-collapsed"}`}>
      <header>
        <button type="button" className="figma-section-title" onClick={() => setOpen(!open)}>
          <span>{title}</span>
        </button>
        {action ? <div className="figma-section-action">{action}</div> : null}
      </header>
      {open ? <div className="figma-inspector-section__body">{children}</div> : null}
    </section>
  );
}

function ToolButton({
  label,
  active,
  children,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "is-active" : ""}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type Hsva = { h: number; s: number; v: number; a: number };

function normalizeHex(value: string) {
  const cleaned = String(value || "")
    .replace("#", "")
    .trim();
  if (/^[0-9a-f]{3}$/i.test(cleaned))
    return `#${cleaned
      .split("")
      .map((part) => part + part)
      .join("")}`.toUpperCase();
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(cleaned)) return `#${cleaned}`.toUpperCase();
  return "#FFFFFF";
}

function HexInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const normalized = normalizeHex(value).slice(1, 7);
  const [draft, setDraft] = useState(normalized);

  useEffect(() => setDraft(normalized), [normalized]);

  const commit = (next: string) => {
    const cleaned = next
      .replace(/[^0-9a-f]/gi, "")
      .slice(0, 6)
      .toUpperCase();
    setDraft(cleaned);
    if (/^[0-9A-F]{6}$/.test(cleaned)) onChange(`#${cleaned}`);
  };

  return (
    <input
      aria-label={label}
      value={draft}
      maxLength={6}
      onChange={(event) => commit(event.target.value)}
      onBlur={() => setDraft(normalized)}
    />
  );
}

function hexToHsva(value: string): Hsva {
  const hex = normalizeHex(value).slice(1);
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  return {
    h,
    s: max ? (delta / max) * 100 : 0,
    v: max * 100,
    a: hex.length === 8 ? (parseInt(hex.slice(6, 8), 16) / 255) * 100 : 100,
  };
}

function hsvaToHex({ h, s, v, a }: Hsva) {
  const saturation = s / 100;
  const value = v / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = value - chroma;
  const [r, g, b] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const channel = (number: number) =>
    Math.round((number + match) * 255)
      .toString(16)
      .padStart(2, "0");
  const alpha = Math.round((a / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}${a < 99.8 ? alpha : ""}`.toUpperCase();
}

const COLOUR_SWATCHES = [
  "#FFFFFF",
  "#000000",
  "#1E1E1E",
  "#FBCB3D",
  "#F18532",
  "#E5E7EB",
  "#38261C",
  "#C7A67A",
  "#A3A3A3",
  "#F6AD32",
  "#6B7280",
  "#D97757",
  "#262626",
  "#D6D3D1",
  "#E7B257",
  "#F9FAFB",
  "#EF4444",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
];

function ColourPicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"custom" | "libraries">("custom");
  const [localSwatches, setLocalSwatches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = JSON.parse(window.localStorage.getItem("homepage-editor-colours") || "[]");
      return Array.isArray(saved) ? saved.filter((colour) => typeof colour === "string") : [];
    } catch {
      return [];
    }
  });
  const hsva = useMemo(() => hexToHsva(value), [value]);
  const saturationRef = useRef<HTMLDivElement>(null);
  const solid = hsvaToHex({ ...hsva, a: 100 }).slice(0, 7);
  const update = (patch: Partial<Hsva>) => onChange(hsvaToHex({ ...hsva, ...patch }));
  const pickSaturation = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = saturationRef.current;
    if (!element) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pick = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      update({
        s: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
        v: clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100),
      });
    };
    pick(event.clientX, event.clientY);
    const move = (moveEvent: PointerEvent) => pick(moveEvent.clientX, moveEvent.clientY);
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const picker = (
    <>
      <button
        className="figma-colour-backdrop"
        type="button"
        aria-label="Close colour picker"
        onClick={onClose}
      />
      <div className="figma-colour-popover" role="dialog" aria-label="Colour picker">
        <header>
          <div className="figma-colour-tabs">
            <button
              className={tab === "custom" ? "is-active" : ""}
              onClick={() => setTab("custom")}
            >
              Custom
            </button>
            <button
              className={tab === "libraries" ? "is-active" : ""}
              onClick={() => setTab("libraries")}
            >
              Libraries
            </button>
          </div>
          <ToolButton
            label="Add colour style"
            onClick={() => {
              const next = localSwatches.includes(solid)
                ? localSwatches
                : [solid, ...localSwatches].slice(0, 8);
              setLocalSwatches(next);
              window.localStorage.setItem("homepage-editor-colours", JSON.stringify(next));
            }}
          >
            <Plus size={15} />
          </ToolButton>
          <ToolButton label="Close" onClick={onClose}>
            <X size={15} />
          </ToolButton>
        </header>
        <div className="figma-colour-modes" aria-label="Colour modes">
          <ToolButton label="Solid" active={tab === "custom"} onClick={() => setTab("custom")}>
            <Palette size={14} />
          </ToolButton>
          <ToolButton
            label="Styles"
            active={tab === "libraries"}
            onClick={() => setTab("libraries")}
          >
            <Grid2X2 size={14} />
          </ToolButton>
          <Library size={14} />
          <Droplets size={14} />
          <Blend size={14} />
        </div>
        {tab === "custom" ? (
          <>
            <div
              ref={saturationRef}
              className="figma-saturation"
              style={{ backgroundColor: `hsl(${hsva.h} 100% 50%)` }}
              onPointerDown={pickSaturation}
            >
              <span style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%` }} />
            </div>
            <div className="figma-colour-sliders">
              <button
                type="button"
                title="Pick colour from screen"
                aria-label="Pick colour from screen"
                onClick={async () => {
                  const EyeDropperApi = (
                    window as typeof window & {
                      EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
                    }
                  ).EyeDropper;
                  if (!EyeDropperApi) return;
                  const result = await new EyeDropperApi().open();
                  onChange(normalizeHex(result.sRGBHex));
                }}
              >
                <Pipette size={15} />
              </button>
              <div>
                <input
                  className="figma-hue-slider"
                  type="range"
                  aria-label="Hue"
                  min={0}
                  max={360}
                  value={hsva.h}
                  onChange={(event) => update({ h: Number(event.target.value) })}
                />
                <input
                  className="figma-alpha-slider"
                  style={{ "--picker-colour": solid } as CSSProperties}
                  type="range"
                  aria-label="Opacity"
                  min={0}
                  max={100}
                  value={hsva.a}
                  onChange={(event) => update({ a: Number(event.target.value) })}
                />
              </div>
            </div>
            <div className="figma-colour-values">
              <select aria-label="Colour format" defaultValue="hex">
                <option value="hex">Hex</option>
              </select>
              <HexInput
                label="Hex colour"
                value={solid}
                onChange={(next) => {
                  const base = hexToHsva(next);
                  update({ h: base.h, s: base.s, v: base.v });
                }}
              />
              <NumberField
                label="A"
                value={hsva.a}
                min={0}
                max={100}
                suffix="%"
                onChange={(a) => update({ a })}
              />
            </div>
          </>
        ) : null}
        <div className="figma-swatch-header">
          <span>{tab === "custom" ? "On this page" : "Local styles"}</span>
          <ChevronDown size={13} />
        </div>
        <div className="figma-swatches">
          {[
            ...localSwatches,
            ...COLOUR_SWATCHES.filter((colour) => !localSwatches.includes(colour)),
          ].map((colour) => (
            <button
              key={colour}
              type="button"
              title={colour}
              aria-label={`Set colour ${colour}`}
              style={{ backgroundColor: colour }}
              onClick={() => onChange(colour)}
            />
          ))}
        </div>
      </div>
    </>
  );
  return createPortal(picker, document.body);
}

function PaintRow({
  value,
  opacity = 100,
  enabled = true,
  label = "Colour",
  onChange,
  onOpacityChange,
  onToggle,
  onRemove,
}: {
  value: string;
  opacity?: number;
  enabled?: boolean;
  label?: string;
  onChange: (value: string) => void;
  onOpacityChange?: (opacity: number) => void;
  onToggle?: () => void;
  onRemove?: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const normalized = normalizeHex(value);
  return (
    <div className={`figma-paint-row ${enabled ? "" : "is-disabled"}`}>
      <button
        type="button"
        className="figma-paint-swatch"
        title={`Edit ${label}`}
        aria-label={`Edit ${label}`}
        style={{ backgroundColor: normalized }}
        onClick={() => setPickerOpen(true)}
      />
      <HexInput label={`${label} hex`} value={normalized} onChange={onChange} />
      {onOpacityChange ? (
        <NumberField
          label=""
          value={opacity}
          min={0}
          max={100}
          suffix="%"
          onChange={onOpacityChange}
        />
      ) : null}
      {onToggle ? (
        <ToolButton label={enabled ? `Hide ${label}` : `Show ${label}`} onClick={onToggle}>
          {enabled ? <Eye size={14} /> : <EyeOff size={14} />}
        </ToolButton>
      ) : null}
      {onRemove ? (
        <ToolButton label={`Remove ${label}`} onClick={onRemove}>
          <Minus size={14} />
        </ToolButton>
      ) : null}
      {pickerOpen ? (
        <ColourPicker value={normalized} onChange={onChange} onClose={() => setPickerOpen(false)} />
      ) : null}
    </div>
  );
}

function GradientStops({
  fill,
  onChange,
}: {
  fill: BannerFill;
  onChange: (fill: BannerFill) => void;
}) {
  const stops = fill.stops?.length
    ? fill.stops
    : [
        { color: "#FBCB3D", position: 0 },
        { color: "#F18532", position: 100 },
      ];
  return (
    <div className="figma-gradient-editor">
      <div
        className="figma-gradient-preview"
        style={{
          backgroundImage: `linear-gradient(90deg, ${stops.map((stop) => `${stop.color} ${stop.position}%`).join(", ")})`,
        }}
      />
      {stops.map((stop, index) => (
        <div className="figma-gradient-stop" key={`${index}-${stop.position}`}>
          <PaintRow
            value={stop.color}
            label={`Gradient stop ${index + 1}`}
            onChange={(color) =>
              onChange({
                ...fill,
                stops: stops.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, color } : item,
                ),
              })
            }
            onRemove={
              stops.length > 2
                ? () =>
                    onChange({
                      ...fill,
                      stops: stops.filter((_, itemIndex) => itemIndex !== index),
                    })
                : undefined
            }
          />
          <NumberField
            label="Stop"
            value={stop.position}
            min={0}
            max={100}
            suffix="%"
            onChange={(position) =>
              onChange({
                ...fill,
                stops: stops
                  .map((item, itemIndex) => (itemIndex === index ? { ...item, position } : item))
                  .sort((a, b) => a.position - b.position),
              })
            }
          />
        </div>
      ))}
      {stops.length < 5 ? (
        <button
          type="button"
          className="figma-inline-action"
          onClick={() =>
            onChange({
              ...fill,
              stops: [...stops, { color: "#FFFFFF", position: 50 }].sort(
                (a, b) => a.position - b.position,
              ),
            })
          }
        >
          <Plus size={13} /> Add stop
        </button>
      ) : null}
    </div>
  );
}

function FillEditor({
  fill,
  onChange,
  onRemove,
}: {
  fill: BannerFill;
  onChange: (fill: BannerFill) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const gradient = fill.type === "linear" || fill.type === "radial" || fill.type === "conic";
  const preview = gradient
    ? `linear-gradient(90deg, ${(fill.stops ?? []).map((stop) => `${stop.color} ${stop.position}%`).join(", ")})`
    : undefined;
  return (
    <div className="figma-fill-editor">
      <div className="figma-fill-summary">
        <button
          type="button"
          className="figma-fill-preview"
          aria-label={`Edit ${fill.type} fill`}
          style={{ backgroundColor: fill.color, backgroundImage: preview }}
          onClick={() => setExpanded(!expanded)}
        >
          {fill.type === "image" && fill.src ? <img src={fill.src} alt="" /> : null}
        </button>
        <select
          aria-label="Fill type"
          value={fill.type}
          onChange={(event) =>
            onChange({ ...fill, type: event.target.value as BannerFill["type"] })
          }
        >
          <option value="solid">Solid</option>
          <option value="image">Image</option>
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
          <option value="conic">Angular</option>
        </select>
        <NumberField
          label=""
          value={fill.opacity}
          min={0}
          max={100}
          suffix="%"
          onChange={(opacity) => onChange({ ...fill, opacity })}
        />
        <ToolButton
          label={fill.enabled ? "Hide fill" : "Show fill"}
          onClick={() => onChange({ ...fill, enabled: !fill.enabled })}
        >
          {fill.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
        </ToolButton>
        <ToolButton label="Remove fill" onClick={onRemove}>
          <Minus size={14} />
        </ToolButton>
      </div>
      {expanded ? (
        <div className="figma-fill-details">
          {fill.type === "solid" ? (
            <PaintRow
              value={fill.color || "#FFFFFF"}
              onChange={(color) => onChange({ ...fill, color })}
            />
          ) : null}
          {fill.type === "image" ? (
            <>
              <HomepageImageInput
                compact
                value={fill.src || ""}
                onChange={(src) => onChange({ ...fill, src })}
              />
              <SelectField
                label="Fit"
                value={fill.fit || "cover"}
                options={[
                  { label: "Fill", value: "cover" },
                  { label: "Fit", value: "contain" },
                  { label: "Stretch", value: "fill" },
                  { label: "Tile", value: "tile" },
                ]}
                onChange={(fit) => onChange({ ...fill, fit: fit as BannerFill["fit"] })}
              />
              <div className="figma-field-grid">
                <NumberField
                  label="X"
                  value={fill.offsetX ?? 0}
                  min={-200}
                  max={200}
                  suffix="%"
                  onChange={(offsetX) => onChange({ ...fill, offsetX })}
                />
                <NumberField
                  label="Y"
                  value={fill.offsetY ?? 0}
                  min={-200}
                  max={200}
                  suffix="%"
                  onChange={(offsetY) => onChange({ ...fill, offsetY })}
                />
                <NumberField
                  label="Zoom"
                  value={fill.zoom ?? 100}
                  min={10}
                  max={500}
                  suffix="%"
                  onChange={(zoom) => onChange({ ...fill, zoom })}
                />
                <NumberField
                  label="Blur"
                  value={fill.blur ?? 0}
                  min={0}
                  max={40}
                  suffix="px"
                  onChange={(blur) => onChange({ ...fill, blur })}
                />
              </div>
            </>
          ) : null}
          {gradient ? (
            <>
              <GradientStops fill={fill} onChange={onChange} />
              <div className="figma-field-grid">
                <NumberField
                  label="Angle"
                  value={fill.angle ?? 90}
                  min={0}
                  max={360}
                  suffix="deg"
                  onChange={(angle) => onChange({ ...fill, angle })}
                />
                {fill.type !== "linear" ? (
                  <NumberField
                    label="Center X"
                    value={fill.centerX ?? 50}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(centerX) => onChange({ ...fill, centerX })}
                  />
                ) : null}
              </div>
            </>
          ) : null}
          <SelectField
            label="Blend"
            value={fill.blendMode || "normal"}
            options={[
              { label: "Normal", value: "normal" },
              { label: "Multiply", value: "multiply" },
              { label: "Screen", value: "screen" },
              { label: "Overlay", value: "overlay" },
              { label: "Soft light", value: "soft-light" },
            ]}
            onChange={(blendMode) =>
              onChange({ ...fill, blendMode: blendMode as BannerFill["blendMode"] })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function LayerHeader({
  layer,
  style,
  onPatch,
  onPatchContent,
  onDuplicate,
  onMove,
  onDelete,
}: {
  layer: BannerLayer;
  style: BannerLayerStyle;
  onPatch: (patch: Partial<BannerLayerStyle>) => void;
  onPatchContent: (patch: Partial<BannerLayer>) => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <div className="figma-layer-header">
      <input
        aria-label="Layer name"
        value={layer.name}
        onChange={(event) => onPatchContent({ name: event.target.value })}
      />
      <ToolButton label="Create reusable copy" onClick={onDuplicate}>
        <Component size={14} />
      </ToolButton>
      <ToolButton
        label={style.visible ? "Hide layer" : "Show layer"}
        onClick={() => onPatch({ visible: !style.visible })}
      >
        {style.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </ToolButton>
      <ToolButton label="Duplicate layer" onClick={onDuplicate}>
        <Copy size={14} />
      </ToolButton>
      <div className="figma-more-menu">
        <ToolButton
          label="More layer actions"
          active={moreOpen}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <MoreHorizontal size={15} />
        </ToolButton>
        {moreOpen ? (
          <div className="figma-layer-menu">
            <button
              type="button"
              onClick={() => {
                onMove(1);
                setMoreOpen(false);
              }}
            >
              Bring forward
            </button>
            <button
              type="button"
              onClick={() => {
                onMove(-1);
                setMoreOpen(false);
              }}
            >
              Send backward
            </button>
            <button type="button" onClick={onDelete}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LayerInspector({
  layer,
  scene,
  viewport,
  cropLayerId,
  onPatch,
  onPatchContent,
  onCropLayer,
  onDelete,
  onDuplicate,
  onMove,
}: {
  layer: BannerLayer;
  scene: BannerScene;
  viewport: HomepageViewport;
  cropLayerId: string | null;
  onPatch: (patch: Partial<BannerLayerStyle>) => void;
  onPatchContent: (patch: Partial<BannerLayer>) => void;
  onCropLayer: (id: string | null) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const style =
    viewport === "mobile" ? { ...layer.style, ...(layer.mobileStyle ?? {}) } : layer.style;
  const patch = (next: Partial<BannerLayerStyle>) => onPatch(next);
  const isText = layer.type === "text" || layer.type === "button";
  const fillColour =
    layer.type === "text" ? style.color || "#FFFFFF" : style.backgroundColor || "#00000000";
  const setFillColour = (value: string) =>
    layer.type === "text" ? patch({ color: value }) : patch({ backgroundColor: value });
  const frameHeight = viewport === "mobile" ? scene.mobileHeight : scene.height;
  const coordinateWidth =
    scene.coordinateMode === "original-hero" ? 390 : viewport === "mobile" ? 390 : 1440;
  const coordinateHeight =
    scene.coordinateMode === "original-hero"
      ? 649
      : viewport === "mobile"
        ? scene.mobileHeight
        : scene.height;
  const toPixelsX = (percent: number) => (percent / 100) * coordinateWidth;
  const toPixelsY = (percent: number) => (percent / 100) * coordinateHeight;
  const toPercentX = (pixels: number) => (pixels / coordinateWidth) * 100;
  const toPercentY = (pixels: number) => (pixels / coordinateHeight) * 100;
  const fitTextWidth = () =>
    clamp((((layer.text || "Text").length * (style.fontSize ?? 16) * 0.56) / 390) * 100, 2, 100);

  return (
    <>
      <LayerHeader
        layer={layer}
        style={style}
        onPatch={patch}
        onPatchContent={onPatchContent}
        onDuplicate={onDuplicate}
        onMove={onMove}
        onDelete={onDelete}
      />

      <InspectorSection title="Position">
        <span className="figma-control-label">Alignment</span>
        <div className="figma-alignment-row">
          <div className="figma-icon-segment">
            <ToolButton label="Align left" onClick={() => patch({ x: 0 })}>
              <AlignHorizontalJustifyStart size={15} />
            </ToolButton>
            <ToolButton
              label="Align horizontal center"
              onClick={() => patch({ x: (100 - style.width) / 2 })}
            >
              <AlignHorizontalJustifyCenter size={15} />
            </ToolButton>
            <ToolButton label="Align right" onClick={() => patch({ x: 100 - style.width })}>
              <AlignHorizontalJustifyEnd size={15} />
            </ToolButton>
          </div>
          <div className="figma-icon-segment">
            <ToolButton label="Align top" onClick={() => patch({ y: 0 })}>
              <AlignVerticalJustifyStart size={15} />
            </ToolButton>
            <ToolButton
              label="Align vertical center"
              onClick={() => patch({ y: (100 - style.height) / 2 })}
            >
              <AlignVerticalJustifyCenter size={15} />
            </ToolButton>
            <ToolButton label="Align bottom" onClick={() => patch({ y: 100 - style.height })}>
              <AlignVerticalJustifyEnd size={15} />
            </ToolButton>
          </div>
        </div>
        <span className="figma-control-label">Position</span>
        <div className="figma-control-line has-action">
          <NumberField
            label="X"
            value={toPixelsX(style.x)}
            min={-coordinateWidth * 2}
            max={coordinateWidth * 3}
            onChange={(x) => patch({ x: toPercentX(x) })}
          />
          <NumberField
            label="Y"
            value={toPixelsY(style.y)}
            min={-coordinateHeight * 2}
            max={coordinateHeight * 3}
            onChange={(y) => patch({ y: toPercentY(y) })}
          />
          <span
            className="figma-tool-status"
            title="Absolute position"
            aria-label="Absolute position"
          >
            <BoxSelect size={14} />
          </span>
        </div>
        <span className="figma-control-label">Rotation</span>
        <div className="figma-control-line has-actions">
          <NumberField
            label="R"
            value={style.rotation}
            min={-360}
            max={360}
            step={0.1}
            suffix="deg"
            onChange={(rotation) => patch({ rotation })}
          />
          <ToolButton
            label="Flip horizontal"
            active={style.flipX}
            onClick={() => patch({ flipX: !style.flipX })}
          >
            <FlipHorizontal2 size={15} />
          </ToolButton>
          <ToolButton
            label="Flip vertical"
            active={style.flipY}
            onClick={() => patch({ flipY: !style.flipY })}
          >
            <FlipVertical2 size={15} />
          </ToolButton>
        </div>
      </InspectorSection>

      <InspectorSection title="Layout">
        <span className="figma-control-label">Resizing</span>
        <div className="figma-resize-modes">
          <ToolButton
            label="Fixed size"
            active={(style.horizontalSizing || "fixed") === "fixed"}
            onClick={() => patch({ horizontalSizing: "fixed" })}
          >
            <MoveHorizontal size={15} />
          </ToolButton>
          <ToolButton
            label="Fit content"
            active={style.horizontalSizing === "hug"}
            onClick={() => {
              if (!isText) return;
              patch({
                horizontalSizing: "hug",
                width: fitTextWidth(),
                height: clamp(
                  (((style.fontSize ?? 16) * (style.lineHeight ?? 1.2)) / frameHeight) * 100,
                  1,
                  100,
                ),
              });
            }}
          >
            <Scaling size={15} />
          </ToolButton>
          <ToolButton
            label="Fill container"
            active={style.horizontalSizing === "fill"}
            onClick={() => patch({ horizontalSizing: "fill", x: 0, width: 100 })}
          >
            <Rows3 size={15} />
          </ToolButton>
        </div>
        <span className="figma-control-label">Dimensions</span>
        <div className="figma-control-line has-action">
          <NumberField
            label="W"
            value={toPixelsX(style.width)}
            min={1}
            max={coordinateWidth * 2.5}
            onChange={(width) => {
              const nextWidth = toPercentX(width);
              patch(
                style.lockAspectRatio
                  ? {
                      horizontalSizing: "fixed",
                      width: nextWidth,
                      height: style.height * (nextWidth / style.width),
                    }
                  : { horizontalSizing: "fixed", width: nextWidth },
              );
            }}
          />
          <NumberField
            label="H"
            value={toPixelsY(style.height)}
            min={1}
            max={coordinateHeight * 2.5}
            onChange={(height) => {
              const nextHeight = toPercentY(height);
              patch(
                style.lockAspectRatio
                  ? {
                      height: nextHeight,
                      width: style.width * (nextHeight / style.height),
                    }
                  : { height: nextHeight },
              );
            }}
          />
          <ToolButton
            label={style.lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
            active={style.lockAspectRatio}
            onClick={() => patch({ lockAspectRatio: !style.lockAspectRatio })}
          >
            {style.lockAspectRatio ? <Link2 size={14} /> : <Unlink2 size={14} />}
          </ToolButton>
        </div>
      </InspectorSection>

      <InspectorSection
        title="Appearance"
        action={
          <>
            <ToolButton
              label={style.visible ? "Hide layer" : "Show layer"}
              onClick={() => patch({ visible: !style.visible })}
            >
              {style.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </ToolButton>
            <Droplets size={14} />
          </>
        }
      >
        <div className="figma-control-line">
          <NumberField
            label="Opacity"
            value={style.opacity}
            min={0}
            max={100}
            suffix="%"
            onChange={(opacity) => patch({ opacity })}
          />
          <NumberField
            label="Radius"
            value={style.borderRadius ?? 0}
            min={0}
            max={999}
            suffix="px"
            onChange={(borderRadius) => patch({ borderRadius })}
          />
        </div>
      </InspectorSection>

      {isText ? (
        <>
          <InspectorSection title="Typography" action={<Grid2X2 size={14} />}>
            <SelectField
              hideLabel
              label="Font family"
              value={style.fontFamily || "schibsted"}
              options={[
                { label: "Instrument Serif", value: "instrument" },
                { label: "Schibsted Grotesk", value: "schibsted" },
                { label: "Georgia", value: "serif" },
                { label: "Arial", value: "sans" },
              ]}
              onChange={(fontFamily) =>
                patch({ fontFamily: fontFamily as BannerLayerStyle["fontFamily"] })
              }
            />
            <div className="figma-control-line">
              <SelectField
                hideLabel
                label="Font weight"
                value={String(style.fontWeight ?? 400)}
                options={[
                  { label: "Regular", value: "400" },
                  { label: "Medium", value: "500" },
                  { label: "Semi Bold", value: "600" },
                  { label: "Bold", value: "700" },
                ]}
                onChange={(fontWeight) => patch({ fontWeight: Number(fontWeight) })}
              />
              <NumberField
                label="Size"
                value={style.fontSize ?? 16}
                min={6}
                max={360}
                suffix="px"
                onChange={(fontSize) => patch({ fontSize })}
              />
            </div>
            <div className="figma-control-line">
              <NumberField
                label="Line height"
                value={(style.lineHeight ?? 1.2) * 100}
                min={50}
                max={400}
                suffix="%"
                onChange={(lineHeight) => patch({ lineHeight: lineHeight / 100 })}
              />
              <NumberField
                label="Letter spacing"
                value={style.letterSpacing ?? 0}
                min={-100}
                max={100}
                step={0.1}
                suffix="px"
                onChange={(letterSpacing) => patch({ letterSpacing })}
              />
            </div>
            <span className="figma-control-label">Alignment</span>
            <div className="figma-typography-align">
              <div className="figma-icon-segment">
                <ToolButton
                  label="Align text left"
                  active={style.textAlign === "left"}
                  onClick={() => patch({ textAlign: "left" })}
                >
                  <AlignLeft size={15} />
                </ToolButton>
                <ToolButton
                  label="Align text center"
                  active={style.textAlign === "center"}
                  onClick={() => patch({ textAlign: "center" })}
                >
                  <AlignCenter size={15} />
                </ToolButton>
                <ToolButton
                  label="Align text right"
                  active={style.textAlign === "right"}
                  onClick={() => patch({ textAlign: "right" })}
                >
                  <AlignRight size={15} />
                </ToolButton>
              </div>
              <SelectField
                hideLabel
                label="Text case"
                value={style.textTransform || "none"}
                options={[
                  { label: "Original", value: "none" },
                  { label: "UPPERCASE", value: "uppercase" },
                  { label: "lowercase", value: "lowercase" },
                  { label: "Capitalize", value: "capitalize" },
                ]}
                onChange={(textTransform) =>
                  patch({ textTransform: textTransform as BannerLayerStyle["textTransform"] })
                }
              />
            </div>
          </InspectorSection>
        </>
      ) : null}

      {layer.type === "image" ? (
        <InspectorSection title="Image" action={<Crop size={14} />}>
          <HomepageImageInput
            compact
            allowDestructiveCrop={false}
            value={layer.src || ""}
            onChange={(src) => onPatchContent({ src })}
          />
          <span className="figma-control-label">Fit</span>
          <div className="figma-image-fit">
            <ToolButton
              label="Fit image"
              active={(style.objectFit || "contain") === "contain"}
              onClick={() => {
                onCropLayer(null);
                patch({ objectFit: "contain" });
              }}
            >
              <MinimizeIcon />
            </ToolButton>
            <ToolButton
              label="Fill frame"
              active={style.objectFit === "cover" && cropLayerId !== layer.id}
              onClick={() => {
                onCropLayer(null);
                patch({ objectFit: "cover" });
              }}
            >
              <Maximize2 size={14} />
            </ToolButton>
            <ToolButton
              label="Crop image"
              active={cropLayerId === layer.id}
              onClick={() => {
                patch({ objectFit: "cover" });
                onCropLayer(cropLayerId === layer.id ? null : layer.id);
              }}
            >
              <Crop size={14} />
            </ToolButton>
            <ToolButton
              label="Stretch image"
              active={style.objectFit === "fill"}
              onClick={() => {
                onCropLayer(null);
                patch({ objectFit: "fill" });
              }}
            >
              <Ratio size={14} />
            </ToolButton>
          </div>
          {cropLayerId === layer.id ? (
            <div className="figma-crop-properties">
              <div className="figma-control-line">
                <NumberField
                  label="X"
                  value={style.cropX ?? 0}
                  min={-200}
                  max={200}
                  step={0.1}
                  suffix="%"
                  onChange={(cropX) => patch({ cropX })}
                />
                <NumberField
                  label="Y"
                  value={style.cropY ?? 0}
                  min={-200}
                  max={200}
                  step={0.1}
                  suffix="%"
                  onChange={(cropY) => patch({ cropY })}
                />
              </div>
              <NumberField
                label="Scale"
                value={style.cropZoom ?? 100}
                min={10}
                max={500}
                suffix="%"
                onChange={(cropZoom) => patch({ cropZoom })}
              />
            </div>
          ) : null}
          <SelectField
            label="Blend"
            value={style.blendMode || "normal"}
            options={[
              { label: "Normal", value: "normal" },
              { label: "Multiply", value: "multiply" },
              { label: "Screen", value: "screen" },
              { label: "Overlay", value: "overlay" },
              { label: "Soft light", value: "soft-light" },
            ]}
            onChange={(blendMode) =>
              patch({ blendMode: blendMode as BannerLayerStyle["blendMode"] })
            }
          />
        </InspectorSection>
      ) : null}

      {layer.type !== "image" ? (
        <InspectorSection title="Fill" action={<Grid2X2 size={14} />}>
          <PaintRow value={fillColour} label="Fill" onChange={setFillColour} />
        </InspectorSection>
      ) : null}

      <InspectorSection
        title="Stroke"
        defaultOpen={(style.borderWidth ?? 0) > 0}
        action={
          <ToolButton
            label="Add stroke"
            onClick={() =>
              patch({
                borderWidth: Math.max(1, style.borderWidth ?? 0),
                borderColor: style.borderColor || "#000000",
              })
            }
          >
            <Plus size={14} />
          </ToolButton>
        }
      >
        <PaintRow
          value={style.borderColor || "#000000"}
          label="Stroke"
          onChange={(borderColor) => patch({ borderColor })}
        />
        <div className="figma-control-line">
          <NumberField
            label="Weight"
            value={style.borderWidth ?? 0}
            min={0}
            max={40}
            suffix="px"
            onChange={(borderWidth) => patch({ borderWidth })}
          />
          <SelectField
            hideLabel
            label="Stroke align"
            value={style.borderAlign || "inside"}
            options={[
              { label: "Inside", value: "inside" },
              { label: "Center", value: "center" },
              { label: "Outside", value: "outside" },
            ]}
            onChange={(borderAlign) =>
              patch({ borderAlign: borderAlign as BannerLayerStyle["borderAlign"] })
            }
          />
        </div>
      </InspectorSection>

      <InspectorSection
        title="Effects"
        defaultOpen={(style.shadowBlur ?? 0) > 0 || (style.blur ?? 0) > 0}
        action={
          <ToolButton
            label="Add effect"
            onClick={() =>
              patch({
                effectType: "drop-shadow",
                shadowBlur: Math.max(16, style.shadowBlur ?? 0),
                shadowY: style.shadowY ?? 8,
                shadowColor: style.shadowColor || "#00000055",
              })
            }
          >
            <Plus size={14} />
          </ToolButton>
        }
      >
        <SelectField
          hideLabel
          label="Effect type"
          value={style.effectType || "drop-shadow"}
          options={[
            { label: "Drop shadow", value: "drop-shadow" },
            { label: "Layer blur", value: "layer-blur" },
          ]}
          onChange={(effectType) =>
            patch({
              effectType: effectType as BannerLayerStyle["effectType"],
              ...(effectType === "drop-shadow"
                ? { shadowBlur: Math.max(16, style.shadowBlur ?? 0) }
                : { blur: Math.max(4, style.blur ?? 0) }),
            })
          }
        />
        {(style.effectType || "drop-shadow") === "drop-shadow" ? (
          <>
            <div className="figma-field-grid">
              <NumberField
                label="X"
                value={style.shadowX ?? 0}
                min={-100}
                max={100}
                suffix="px"
                onChange={(shadowX) => patch({ shadowX })}
              />
              <NumberField
                label="Y"
                value={style.shadowY ?? 8}
                min={-100}
                max={100}
                suffix="px"
                onChange={(shadowY) => patch({ shadowY })}
              />
              <NumberField
                label="Blur"
                value={style.shadowBlur ?? 0}
                min={0}
                max={150}
                suffix="px"
                onChange={(shadowBlur) => patch({ shadowBlur })}
              />
            </div>
            <PaintRow
              value={style.shadowColor || "#00000055"}
              label="Shadow colour"
              onChange={(shadowColor) => patch({ shadowColor })}
            />
          </>
        ) : (
          <NumberField
            label="Layer blur"
            value={style.blur ?? 0}
            min={0}
            max={40}
            suffix="px"
            onChange={(blur) => patch({ blur })}
          />
        )}
      </InspectorSection>
    </>
  );
}

function MinimizeIcon() {
  return <Scaling size={14} />;
}

export function StudioInspector({
  scene,
  selectedLayers,
  viewport,
  cropLayerId,
  onUpdateScene,
  onPatchLayer,
  onPatchLayerContent,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayer,
  onCropLayer,
  sectionSettings,
  prototypeSettings,
}: {
  scene: BannerScene;
  selectedLayers: BannerLayer[];
  viewport: HomepageViewport;
  cropLayerId: string | null;
  onUpdateScene: (scene: BannerScene) => void;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
  onPatchLayerContent: (id: string, patch: Partial<BannerLayer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: -1 | 1) => void;
  onCropLayer: (id: string | null) => void;
  sectionSettings?: ReactNode;
  prototypeSettings?: ReactNode;
}) {
  const [tab, setTab] = useState<"design" | "prototype">("design");
  const selected = selectedLayers.length === 1 ? selectedLayers[0] : null;
  const updateFill = (index: number, fill: BannerFill) =>
    onUpdateScene({
      ...scene,
      fills: scene.fills.map((item, itemIndex) => (itemIndex === index ? fill : item)),
    });
  const addFill = () =>
    onUpdateScene({
      ...scene,
      fills: [
        ...scene.fills,
        { id: `fill-${Date.now()}`, type: "solid", enabled: true, opacity: 100, color: "#F6AD32" },
      ],
    });

  return (
    <aside className="studio-inspector figma-properties" aria-label="Properties inspector">
      <div className="studio-inspector-tabs">
        <button
          type="button"
          className={tab === "design" ? "is-active" : ""}
          onClick={() => setTab("design")}
        >
          Design
        </button>
        <button
          type="button"
          className={tab === "prototype" ? "is-active" : ""}
          onClick={() => setTab("prototype")}
        >
          Prototype
        </button>
      </div>
      <div className="studio-inspector-scroll">
        {tab === "prototype" ? (
          selected?.type === "button" ? (
            <InspectorSection title="Interaction">
              <SelectField
                label="Trigger"
                value="click"
                options={[{ label: "On click", value: "click" }]}
                onChange={() => undefined}
              />
              <label className="figma-link-field">
                <span>Navigate to</span>
                <input
                  aria-label="Button link"
                  value={selected.href || ""}
                  onChange={(event) =>
                    onPatchLayerContent(selected.id, { href: event.target.value })
                  }
                />
              </label>
            </InspectorSection>
          ) : (
            prototypeSettings || (
              <InspectorSection title="Interaction">
                <p className="studio-muted">
                  Select a button to edit its destination. Carousel motion is available on hero
                  slides.
                </p>
              </InspectorSection>
            )
          )
        ) : selectedLayers.length > 1 ? (
          <InspectorSection title={`${selectedLayers.length} layers selected`}>
            <p className="studio-muted">
              Drag the group together, or select one layer to edit its properties.
            </p>
          </InspectorSection>
        ) : selected ? (
          <LayerInspector
            layer={selected}
            scene={scene}
            viewport={viewport}
            cropLayerId={cropLayerId}
            onPatch={(patch) => onPatchLayer(selected.id, patch)}
            onPatchContent={(patch) => onPatchLayerContent(selected.id, patch)}
            onDelete={() => onDeleteLayer(selected.id)}
            onDuplicate={() => onDuplicateLayer(selected.id)}
            onMove={(direction) => onMoveLayer(selected.id, direction)}
            onCropLayer={onCropLayer}
          />
        ) : (
          <>
            <div className="figma-layer-header">
              <input
                aria-label="Banner name"
                value={scene.name}
                onChange={(event) => onUpdateScene({ ...scene, name: event.target.value })}
              />
              <span className="figma-tool-status" title="Banner frame" aria-label="Banner frame">
                <BoxSelect size={14} />
              </span>
            </div>
            <InspectorSection title="Layout">
              <span className="figma-control-label">Dimensions</span>
              <div className="figma-control-line has-action">
                <NumberField
                  label="H"
                  value={scene.height}
                  min={240}
                  max={1400}
                  suffix="px"
                  onChange={(height) => onUpdateScene({ ...scene, height })}
                />
                <NumberField
                  label="Mobile"
                  value={scene.mobileHeight}
                  min={240}
                  max={1200}
                  suffix="px"
                  onChange={(mobileHeight) => onUpdateScene({ ...scene, mobileHeight })}
                />
                <span
                  className="figma-tool-status"
                  title="Responsive frame"
                  aria-label="Responsive frame"
                >
                  <Ratio size={14} />
                </span>
              </div>
            </InspectorSection>
            {sectionSettings}
            <InspectorSection
              title="Fill"
              action={
                <>
                  <Grid2X2 size={14} />
                  <ToolButton label="Add background fill" onClick={addFill}>
                    <Plus size={14} />
                  </ToolButton>
                </>
              }
            >
              {scene.fills.map((fill, index) => (
                <FillEditor
                  key={fill.id}
                  fill={fill}
                  onChange={(next) => updateFill(index, next)}
                  onRemove={() =>
                    onUpdateScene({
                      ...scene,
                      fills: scene.fills.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                />
              ))}
              {!scene.fills.length ? (
                <button type="button" className="figma-empty-fill" onClick={addFill}>
                  <ImageIcon size={16} /> Add a background fill
                </button>
              ) : null}
            </InspectorSection>
          </>
        )}
      </div>
    </aside>
  );
}
