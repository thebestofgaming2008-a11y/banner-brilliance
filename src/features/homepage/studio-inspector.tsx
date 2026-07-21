import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { useState, type ReactNode } from "react";

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
  return (
    <label className="studio-field studio-number-field">
      <span>{label}</span>
      <span className="studio-number-field__control">
        <input
          type="number"
          value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        />
        {suffix ? <small>{suffix}</small> : null}
      </span>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value);
  return (
    <label className="studio-field studio-color-field">
      <span>{label}</span>
      <span className="studio-color-field__control">
        <input
          type="color"
          aria-label={label}
          value={valid ? value.slice(0, 7) : "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
        />
        <input value={value} maxLength={9} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function InspectorSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="studio-inspector-section">
      <header>
        <h3>{title}</h3>
        {action}
      </header>
      <div className="studio-inspector-section__body">{children}</div>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FillEditor({
  fill,
  onChange,
  onRemove,
  onMove,
}: {
  fill: BannerFill;
  onChange: (fill: BannerFill) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const stops = fill.stops?.length
    ? fill.stops
    : [
        { color: "#FBCB3D", position: 0 },
        { color: "#F18532", position: 100 },
      ];
  return (
    <div className="studio-fill">
      <div className="studio-fill__header">
        <input
          type="checkbox"
          checked={fill.enabled}
          aria-label={`Enable ${fill.type} fill`}
          onChange={(event) => onChange({ ...fill, enabled: event.target.checked })}
        />
        <select
          value={fill.type}
          aria-label="Fill type"
          onChange={(event) =>
            onChange({ ...fill, type: event.target.value as BannerFill["type"] })
          }
        >
          <option value="solid">Solid</option>
          <option value="image">Image</option>
          <option value="linear">Linear gradient</option>
          <option value="radial">Radial gradient</option>
          <option value="conic">Angular gradient</option>
        </select>
        <button
          type="button"
          title="Move fill up"
          aria-label="Move fill up"
          onClick={() => onMove(-1)}
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          title="Move fill down"
          aria-label="Move fill down"
          onClick={() => onMove(1)}
        >
          <ChevronDown size={13} />
        </button>
        <button type="button" title="Remove fill" aria-label="Remove fill" onClick={onRemove}>
          <Trash2 size={13} />
        </button>
      </div>
      {fill.type === "solid" ? (
        <ColorField
          label="Colour"
          value={fill.color || "#ffffff"}
          onChange={(color) => onChange({ ...fill, color })}
        />
      ) : null}
      {fill.type === "image" ? (
        <div className="studio-image-field">
          <HomepageImageInput
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
          <label className="studio-field">
            <span>Position</span>
            <input
              value={fill.position || "center"}
              onChange={(event) => onChange({ ...fill, position: event.target.value })}
            />
          </label>
          <div className="studio-grid-2">
            <NumberField
              label="X"
              value={fill.offsetX ?? 0}
              min={-100}
              max={100}
              suffix="%"
              onChange={(offsetX) => onChange({ ...fill, offsetX })}
            />
            <NumberField
              label="Y"
              value={fill.offsetY ?? 0}
              min={-100}
              max={100}
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
        </div>
      ) : null}
      {fill.type === "linear" || fill.type === "radial" || fill.type === "conic" ? (
        <div className="studio-gradient-controls">
          {stops.map((stop, index) => (
            <div key={index} className="studio-gradient-stop">
              <input
                type="color"
                aria-label={`Gradient colour ${index + 1}`}
                value={/^#[0-9a-f]{6}$/i.test(stop.color) ? stop.color : "#000000"}
                onChange={(event) =>
                  onChange({
                    ...fill,
                    stops: stops.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, color: event.target.value } : item,
                    ),
                  })
                }
              />
              <input
                type="number"
                min={0}
                max={100}
                value={stop.position}
                onChange={(event) =>
                  onChange({
                    ...fill,
                    stops: stops.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, position: clamp(Number(event.target.value), 0, 100) }
                        : item,
                    ),
                  })
                }
              />
              <span>%</span>
            </div>
          ))}
          {stops.length < 5 ? (
            <button
              type="button"
              className="studio-text-button"
              onClick={() =>
                onChange({
                  ...fill,
                  stops: [...stops, { color: "#ffffff", position: 50 }].sort(
                    (a, b) => a.position - b.position,
                  ),
                })
              }
            >
              <Plus size={13} /> Add stop
            </button>
          ) : null}
          {fill.type === "linear" || fill.type === "conic" ? (
            <NumberField
              label="Angle"
              value={fill.angle ?? 90}
              min={0}
              max={360}
              suffix="deg"
              onChange={(angle) => onChange({ ...fill, angle })}
            />
          ) : (
            <div className="studio-grid-2">
              <NumberField
                label="Center X"
                value={fill.centerX ?? 50}
                min={0}
                max={100}
                suffix="%"
                onChange={(centerX) => onChange({ ...fill, centerX })}
              />
              <NumberField
                label="Center Y"
                value={fill.centerY ?? 50}
                min={0}
                max={100}
                suffix="%"
                onChange={(centerY) => onChange({ ...fill, centerY })}
              />
            </div>
          )}
        </div>
      ) : null}
      <NumberField
        label="Opacity"
        value={fill.opacity}
        min={0}
        max={100}
        suffix="%"
        onChange={(opacity) => onChange({ ...fill, opacity })}
      />
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
  );
}

function LayerInspector({
  layer,
  viewport,
  onPatch,
  onPatchContent,
  onDelete,
  onDuplicate,
  onMove,
}: {
  layer: BannerLayer;
  viewport: HomepageViewport;
  onPatch: (patch: Partial<BannerLayerStyle>) => void;
  onPatchContent: (patch: Partial<BannerLayer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const style =
    viewport === "mobile" ? { ...layer.style, ...(layer.mobileStyle ?? {}) } : layer.style;
  const patch = (next: Partial<BannerLayerStyle>) => onPatch(next);
  return (
    <>
      <InspectorSection
        title={layer.name}
        action={
          <div className="studio-inspector-actions">
            <button
              type="button"
              title="Move layer forward"
              aria-label="Move layer forward"
              onClick={() => onMove(1)}
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              title="Move layer backward"
              aria-label="Move layer backward"
              onClick={() => onMove(-1)}
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              title="Duplicate"
              aria-label="Duplicate layer"
              onClick={onDuplicate}
            >
              <Copy size={14} />
            </button>
            <button type="button" title="Delete" aria-label="Delete layer" onClick={onDelete}>
              <Trash2 size={14} />
            </button>
          </div>
        }
      >
        <label className="studio-field">
          <span>Name</span>
          <input
            value={layer.name}
            onChange={(event) => onPatchContent({ name: event.target.value })}
          />
        </label>
        <div className="studio-toggle-row">
          <button
            type="button"
            className={style.visible ? "is-active" : ""}
            onClick={() => patch({ visible: !style.visible })}
          >
            {style.visible ? <Eye size={14} /> : <EyeOff size={14} />} Visible
          </button>
          <button
            type="button"
            className={style.locked ? "is-active" : ""}
            onClick={() => patch({ locked: !style.locked })}
          >
            {style.locked ? <Lock size={14} /> : <Unlock size={14} />} Locked
          </button>
        </div>
      </InspectorSection>

      <InspectorSection title={`Layout - ${viewport}`}>
        <div className="studio-grid-2">
          <NumberField
            label="X"
            value={style.x}
            min={-100}
            max={200}
            suffix="%"
            onChange={(x) => patch({ x })}
          />
          <NumberField
            label="Y"
            value={style.y}
            min={-100}
            max={200}
            suffix="%"
            onChange={(y) => patch({ y })}
          />
          <NumberField
            label="W"
            value={style.width}
            min={0.5}
            max={250}
            suffix="%"
            onChange={(width) => patch({ width })}
          />
          <NumberField
            label="H"
            value={style.height}
            min={0.5}
            max={250}
            suffix="%"
            onChange={(height) => patch({ height })}
          />
        </div>
        <div className="studio-grid-2">
          <NumberField
            label="Rotation"
            value={style.rotation}
            min={-360}
            max={360}
            suffix="deg"
            onChange={(rotation) => patch({ rotation })}
          />
          <NumberField
            label="Opacity"
            value={style.opacity}
            min={0}
            max={100}
            suffix="%"
            onChange={(opacity) => patch({ opacity })}
          />
        </div>
        {layer.type === "text" || layer.type === "button" ? (
          <div className="studio-anchor-control">
            <span>Responsive position</span>
            <div className="studio-anchor-grid" aria-label="Premade text positions">
              {[
                ["Top left", 5, 5],
                ["Top center", 50 - style.width / 2, 5],
                ["Top right", 95 - style.width, 5],
                ["Middle left", 5, 50 - style.height / 2],
                ["Center", 50 - style.width / 2, 50 - style.height / 2],
                ["Middle right", 95 - style.width, 50 - style.height / 2],
                ["Bottom left", 5, 95 - style.height],
                ["Bottom center", 50 - style.width / 2, 95 - style.height],
                ["Bottom right", 95 - style.width, 95 - style.height],
              ].map(([label, x, y]) => (
                <button
                  key={String(label)}
                  type="button"
                  title={String(label)}
                  aria-label={String(label)}
                  onClick={() => patch({ x: Number(x), y: Number(y) })}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </InspectorSection>

      {layer.type === "text" || layer.type === "button" ? (
        <>
          <InspectorSection title="Content">
            <label className="studio-field studio-field--stacked">
              <span>Text</span>
              <textarea
                value={layer.text || ""}
                rows={3}
                onChange={(event) => onPatchContent({ text: event.target.value })}
              />
            </label>
            {layer.type === "text" ? (
              <SelectField
                label="Element"
                value={layer.semantic || "p"}
                options={[
                  { label: "Page heading (H1)", value: "h1" },
                  { label: "Section heading (H2)", value: "h2" },
                  { label: "Card heading (H3)", value: "h3" },
                  { label: "Paragraph", value: "p" },
                  { label: "Inline label", value: "span" },
                ]}
                onChange={(semantic) =>
                  onPatchContent({ semantic: semantic as BannerLayer["semantic"] })
                }
              />
            ) : null}
            {layer.type === "button" ? (
              <label className="studio-field studio-field--stacked">
                <span>Link</span>
                <input
                  value={layer.href || ""}
                  onChange={(event) => onPatchContent({ href: event.target.value })}
                />
              </label>
            ) : null}
          </InspectorSection>
          <InspectorSection title="Typography">
            <SelectField
              label="Font"
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
            <div className="studio-grid-2">
              <NumberField
                label="Size"
                value={style.fontSize ?? 16}
                min={6}
                max={360}
                suffix="px"
                onChange={(fontSize) => patch({ fontSize })}
              />
              <NumberField
                label="Weight"
                value={style.fontWeight ?? 400}
                min={100}
                max={900}
                step={100}
                onChange={(fontWeight) => patch({ fontWeight })}
              />
              <NumberField
                label="Line"
                value={style.lineHeight ?? 1.2}
                min={0.5}
                max={4}
                step={0.05}
                onChange={(lineHeight) => patch({ lineHeight })}
              />
              <NumberField
                label="Spacing"
                value={style.letterSpacing ?? 0}
                min={-10}
                max={40}
                step={0.1}
                suffix="px"
                onChange={(letterSpacing) => patch({ letterSpacing })}
              />
            </div>
            <div className="studio-segmented" aria-label="Text alignment">
              {(
                [
                  ["left", AlignLeft],
                  ["center", AlignCenter],
                  ["right", AlignRight],
                ] as const
              ).map(([value, Icon]) => (
                <button
                  key={value}
                  type="button"
                  title={`Align ${value}`}
                  aria-label={`Align ${value}`}
                  className={style.textAlign === value ? "is-active" : ""}
                  onClick={() => patch({ textAlign: value })}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
            <SelectField
              label="Case"
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
            <ColorField
              label="Text"
              value={style.color || "#ffffff"}
              onChange={(color) => patch({ color })}
            />
          </InspectorSection>
        </>
      ) : null}

      {layer.type === "image" ? (
        <InspectorSection title="Image">
          <div className="studio-image-field">
            <HomepageImageInput
              value={layer.src || ""}
              onChange={(src) => onPatchContent({ src })}
            />
          </div>
          <SelectField
            label="Fit"
            value={style.objectFit || "contain"}
            options={[
              { label: "Fit", value: "contain" },
              { label: "Fill", value: "cover" },
              { label: "Stretch", value: "fill" },
            ]}
            onChange={(objectFit) =>
              patch({ objectFit: objectFit as BannerLayerStyle["objectFit"] })
            }
          />
          <div className="studio-grid-2">
            <NumberField
              label="Crop X"
              value={style.cropX ?? 0}
              min={-100}
              max={100}
              suffix="%"
              onChange={(cropX) => patch({ cropX })}
            />
            <NumberField
              label="Crop Y"
              value={style.cropY ?? 0}
              min={-100}
              max={100}
              suffix="%"
              onChange={(cropY) => patch({ cropY })}
            />
          </div>
          <NumberField
            label="Zoom"
            value={style.cropZoom ?? 100}
            min={10}
            max={500}
            suffix="%"
            onChange={(cropZoom) => patch({ cropZoom })}
          />
          <button
            type="button"
            className={`studio-wide-toggle ${style.lockAspectRatio ? "is-active" : ""}`}
            onClick={() => patch({ lockAspectRatio: !style.lockAspectRatio })}
          >
            {style.lockAspectRatio ? <Lock size={14} /> : <Unlock size={14} />}
            Lock aspect ratio
          </button>
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

      {layer.type === "shape" || layer.type === "button" ? (
        <InspectorSection title="Fill and border">
          <ColorField
            label="Fill"
            value={style.backgroundColor || "#00000000"}
            onChange={(backgroundColor) => patch({ backgroundColor })}
          />
          <ColorField
            label="Border"
            value={style.borderColor || "#000000"}
            onChange={(borderColor) => patch({ borderColor })}
          />
          <div className="studio-grid-2">
            <NumberField
              label="Stroke"
              value={style.borderWidth ?? 0}
              min={0}
              max={40}
              suffix="px"
              onChange={(borderWidth) => patch({ borderWidth })}
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
      ) : null}

      <InspectorSection title="Effects">
        <div className="studio-grid-2">
          <NumberField
            label="Shadow X"
            value={style.shadowX ?? 0}
            min={-100}
            max={100}
            suffix="px"
            onChange={(shadowX) => patch({ shadowX })}
          />
          <NumberField
            label="Shadow Y"
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
          <NumberField
            label="Layer blur"
            value={style.blur ?? 0}
            min={0}
            max={40}
            suffix="px"
            onChange={(blur) => patch({ blur })}
          />
        </div>
        <ColorField
          label="Shadow"
          value={style.shadowColor || "#00000055"}
          onChange={(shadowColor) => patch({ shadowColor })}
        />
      </InspectorSection>
    </>
  );
}

export function StudioInspector({
  scene,
  selectedLayers,
  viewport,
  onUpdateScene,
  onPatchLayer,
  onPatchLayerContent,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayer,
  sectionSettings,
  prototypeSettings,
}: {
  scene: BannerScene;
  selectedLayers: BannerLayer[];
  viewport: HomepageViewport;
  onUpdateScene: (scene: BannerScene) => void;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
  onPatchLayerContent: (id: string, patch: Partial<BannerLayer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: -1 | 1) => void;
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
  const moveFill = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= scene.fills.length) return;
    const fills = [...scene.fills];
    [fills[index], fills[target]] = [fills[target]!, fills[index]!];
    onUpdateScene({ ...scene, fills });
  };

  return (
    <aside className="studio-inspector" aria-label="Properties inspector">
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
          prototypeSettings || (
            <InspectorSection title="Interaction">
              <p className="studio-muted">
                Select a button to edit its destination in Design. Carousel motion is available on
                hero slides.
              </p>
            </InspectorSection>
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
            viewport={viewport}
            onPatch={(patch) => onPatchLayer(selected.id, patch)}
            onPatchContent={(patch) => onPatchLayerContent(selected.id, patch)}
            onDelete={() => onDeleteLayer(selected.id)}
            onDuplicate={() => onDuplicateLayer(selected.id)}
            onMove={(direction) => onMoveLayer(selected.id, direction)}
          />
        ) : (
          <>
            <InspectorSection title="Banner">
              <label className="studio-field">
                <span>Name</span>
                <input
                  value={scene.name}
                  onChange={(event) => onUpdateScene({ ...scene, name: event.target.value })}
                />
              </label>
              <div className="studio-grid-2">
                <NumberField
                  label="Desktop"
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
              </div>
            </InspectorSection>
            {sectionSettings}
            <InspectorSection
              title="Background fills"
              action={
                <button
                  type="button"
                  title="Add fill"
                  aria-label="Add background fill"
                  onClick={() =>
                    onUpdateScene({
                      ...scene,
                      fills: [
                        ...scene.fills,
                        {
                          id: `fill-${Date.now()}`,
                          type: "solid",
                          enabled: true,
                          opacity: 100,
                          color: "#F6AD32",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={15} />
                </button>
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
                  onMove={(direction) => moveFill(index, direction)}
                />
              ))}
              {!scene.fills.length ? (
                <div className="studio-empty-small">
                  <ImageIcon size={17} /> Add a fill to set the banner background.
                </div>
              ) : null}
            </InspectorSection>
          </>
        )}
      </div>
    </aside>
  );
}
