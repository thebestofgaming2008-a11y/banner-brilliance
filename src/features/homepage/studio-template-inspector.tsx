import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Crop,
  Image as ImageIcon,
  Layers3,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { StoreProduct } from "@/data/store";
import type { AdminCategory } from "@/services/adminService";
import { HomepageImageInput } from "./homepage-image-field";
import type { StudioBannerRef } from "./studio-model";
import type {
  BannerFill,
  BannerLayer,
  BannerLayerStyle,
  CollectionFeatureProps,
  HeroSlide,
  HomepageData,
  HomepageViewport,
  PromoBannerProps,
} from "./types";

export type HomepageTemplatePatch =
  Partial<HeroSlide> | Partial<CollectionFeatureProps> | Partial<PromoBannerProps>;

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="studio-template-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} rows={3} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="studio-template-colour">
      <span>{label}</span>
      <span>
        <input
          type="color"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}

function colourInputValue(value: string | undefined, fallback: string) {
  const normalized = String(value || "").slice(0, 7);
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback;
}

function darkTextForColour(value: string) {
  const color = colourInputValue(value, "#ffffff");
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160;
}

function AlignmentButtons({
  value,
  label,
  onChange,
}: {
  value: "left" | "center" | "right";
  label: string;
  onChange: (value: "left" | "center" | "right") => void;
}) {
  return (
    <div className="studio-template-align" role="group" aria-label={label}>
      <button
        type="button"
        title="Align text left"
        aria-label="Align text left"
        className={value === "left" ? "is-active" : ""}
        onClick={() => onChange("left")}
      >
        <AlignLeft size={15} />
      </button>
      <button
        type="button"
        title="Align text center"
        aria-label="Align text center"
        className={value === "center" ? "is-active" : ""}
        onClick={() => onChange("center")}
      >
        <AlignCenter size={15} />
      </button>
      <button
        type="button"
        title="Align text right"
        aria-label="Align text right"
        className={value === "right" ? "is-active" : ""}
        onClick={() => onChange("right")}
      >
        <AlignRight size={15} />
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="studio-template-field">
      <span>{label}</span>
      <input
        type="number"
        value={Number(value.toFixed(step < 1 ? 1 : 0))}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function InspectorHeader({
  title,
  kind,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: {
  title: string;
  kind: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <header className="studio-template-header">
      <div>
        <strong>{title}</strong>
        <span>{kind}</span>
      </div>
      <div>
        <button
          type="button"
          title="Move up"
          aria-label="Move banner up"
          disabled={!canMoveUp}
          onClick={onMoveUp}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          title="Move down"
          aria-label="Move banner down"
          disabled={!canMoveDown}
          onClick={onMoveDown}
        >
          <ChevronDown size={14} />
        </button>
        <button type="button" title="Duplicate" aria-label="Duplicate banner" onClick={onDuplicate}>
          <Copy size={14} />
        </button>
        <button type="button" title="Delete" aria-label="Delete banner" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </header>
  );
}

function HeroTemplate({
  slide,
  selectedLayer,
  viewport,
  cropLayerId,
  cropFillId,
  onPatch,
  onPatchLayer,
  onPatchFill,
  onCropLayer,
  onCropFill,
}: {
  slide: HeroSlide;
  selectedLayer: BannerLayer | null;
  viewport: HomepageViewport;
  cropLayerId: string | null;
  cropFillId: string | null;
  onPatch: (patch: HomepageTemplatePatch) => void;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
  onPatchFill: (id: string, patch: Partial<BannerFill>) => void;
  onCropLayer: (id: string | null) => void;
  onCropFill: (id: string | null) => void;
}) {
  const gradient = slide.gradient;
  const backgroundMode = gradient.enabled === "off" ? "image" : "gradient";
  const selectedStyle = selectedLayer
    ? viewport === "mobile"
      ? { ...selectedLayer.style, ...(selectedLayer.mobileStyle ?? {}) }
      : selectedLayer.style
    : null;
  const textAlign = selectedStyle?.textAlign ?? slide.textAlign ?? "center";
  const selectedText =
    selectedLayer?.type === "text" || selectedLayer?.type === "button" ? selectedLayer : null;
  const selectedImage = selectedLayer?.type === "image" ? selectedLayer : null;
  const backgroundImageFill = slide.scene?.fills.find((fill) => fill.type === "image");
  const setTextAlign = (next: "left" | "center" | "right") => {
    if (selectedText) onPatchLayer(selectedText.id, { textAlign: next });
    else onPatch({ textAlign: next });
  };

  return (
    <>
      <section className="studio-template-section">
        <h3>Content</h3>
        <TextField label="Title" value={slide.title} onChange={(title) => onPatch({ title })} />
        <TextField
          label="Subtitle"
          value={slide.body}
          multiline
          onChange={(body) => onPatch({ body })}
        />
        <TextField
          label="Shop button text"
          value={slide.buttonLabel}
          onChange={(buttonLabel) => onPatch({ buttonLabel })}
        />
        <TextField
          label="Shop button link"
          value={slide.buttonUrl}
          onChange={(buttonUrl) => onPatch({ buttonUrl })}
        />
      </section>

      <section className="studio-template-section">
        <h3>{selectedLayer ? selectedLayer.name : "Text alignment"}</h3>
        {selectedLayer && selectedStyle ? (
          <div className="studio-template-position">
            <label>
              <span>X</span>
              <input
                type="number"
                step="0.1"
                value={Number(selectedStyle.x.toFixed(1))}
                onChange={(event) =>
                  onPatchLayer(selectedLayer.id, { x: Number(event.target.value) })
                }
              />
            </label>
            <label>
              <span>Y</span>
              <input
                type="number"
                step="0.1"
                value={Number(selectedStyle.y.toFixed(1))}
                onChange={(event) =>
                  onPatchLayer(selectedLayer.id, { y: Number(event.target.value) })
                }
              />
            </label>
            <label>
              <span>W</span>
              <input
                type="number"
                min="0.5"
                step="0.1"
                value={Number(selectedStyle.width.toFixed(1))}
                onChange={(event) =>
                  onPatchLayer(selectedLayer.id, { width: Number(event.target.value) })
                }
              />
            </label>
            <label>
              <span>H</span>
              <input
                type="number"
                min="0.5"
                step="0.1"
                value={Number(selectedStyle.height.toFixed(1))}
                onChange={(event) =>
                  onPatchLayer(selectedLayer.id, { height: Number(event.target.value) })
                }
              />
            </label>
          </div>
        ) : null}
        {selectedImage ? (
          <>
            <div className="studio-template-segment" role="group" aria-label="Product image fit">
              {(["contain", "cover", "fill"] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  className={(selectedStyle?.objectFit ?? "contain") === fit ? "is-active" : ""}
                  onClick={() => onPatchLayer(selectedImage.id, { objectFit: fit })}
                >
                  {fit[0]!.toUpperCase() + fit.slice(1)}
                </button>
              ))}
            </div>
            <div className="studio-template-responsive-values studio-template-responsive-values--three">
              <NumberField
                label="Crop X"
                value={selectedStyle?.cropX ?? 0}
                min={-100}
                max={100}
                onChange={(cropX) => onPatchLayer(selectedImage.id, { cropX })}
              />
              <NumberField
                label="Crop Y"
                value={selectedStyle?.cropY ?? 0}
                min={-100}
                max={100}
                onChange={(cropY) => onPatchLayer(selectedImage.id, { cropY })}
              />
              <NumberField
                label="Zoom %"
                value={selectedStyle?.cropZoom ?? 100}
                min={10}
                max={500}
                onChange={(cropZoom) => onPatchLayer(selectedImage.id, { cropZoom })}
              />
            </div>
            <button
              type="button"
              className={`studio-template-action ${cropLayerId === selectedImage.id ? "is-active" : ""}`}
              onClick={() =>
                onCropLayer(cropLayerId === selectedImage.id ? null : selectedImage.id)
              }
            >
              <Crop size={14} />
              <span>{cropLayerId === selectedImage.id ? "Finish crop" : "Crop product image"}</span>
            </button>
          </>
        ) : (
          <>
            <AlignmentButtons value={textAlign} label="Text alignment" onChange={setTextAlign} />
            {selectedText && selectedStyle ? (
              <>
                <NumberField
                  label="Font size"
                  value={selectedStyle.fontSize ?? 16}
                  min={6}
                  max={240}
                  onChange={(fontSize) => onPatchLayer(selectedText.id, { fontSize })}
                />
                <ColourField
                  label="Text colour"
                  value={colourInputValue(selectedStyle.color, "#ffffff")}
                  onChange={(color) => onPatchLayer(selectedText.id, { color })}
                />
                {selectedText.type === "button" ? (
                  <>
                    <div
                      className="studio-template-segment"
                      role="group"
                      aria-label="Button background"
                    >
                      <button
                        type="button"
                        className={
                          !selectedStyle.backgroundColor ||
                          selectedStyle.backgroundColor.endsWith("00")
                            ? "is-active"
                            : ""
                        }
                        onClick={() =>
                          onPatchLayer(selectedText.id, { backgroundColor: "#00000000" })
                        }
                      >
                        Transparent
                      </button>
                      <button
                        type="button"
                        className={
                          selectedStyle.backgroundColor &&
                          !selectedStyle.backgroundColor.endsWith("00")
                            ? "is-active"
                            : ""
                        }
                        onClick={() =>
                          onPatchLayer(selectedText.id, { backgroundColor: "#ffffff" })
                        }
                      >
                        Filled
                      </button>
                    </div>
                    {selectedStyle.backgroundColor &&
                    !selectedStyle.backgroundColor.endsWith("00") ? (
                      <ColourField
                        label="Button colour"
                        value={colourInputValue(selectedStyle.backgroundColor, "#ffffff")}
                        onChange={(backgroundColor) =>
                          onPatchLayer(selectedText.id, { backgroundColor })
                        }
                      />
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </section>

      <section className="studio-template-section">
        <h3>Product image</h3>
        <div className="studio-template-image">
          <HomepageImageInput
            value={slide.foregroundImage}
            inputLabel="Product image URL"
            allowDestructiveCrop={false}
            onChange={(foregroundImage) => onPatch({ foregroundImage })}
          />
        </div>
      </section>

      <section className="studio-template-section">
        <h3>Background</h3>
        <div className="studio-template-segment" role="group" aria-label="Hero background">
          <button
            type="button"
            className={backgroundMode === "gradient" ? "is-active" : ""}
            onClick={() =>
              onPatch({
                backgroundImage: "",
                gradient: { ...gradient, enabled: "on" },
              })
            }
          >
            Gradient
          </button>
          <button
            type="button"
            className={backgroundMode === "image" ? "is-active" : ""}
            onClick={() => onPatch({ gradient: { ...gradient, enabled: "off" } })}
          >
            Image
          </button>
        </div>
        {backgroundMode === "gradient" ? (
          <div className="studio-template-colours">
            <ColourField
              label="Gradient start"
              value={gradient.startColor}
              onChange={(startColor) => onPatch({ gradient: { ...gradient, startColor } })}
            />
            <ColourField
              label="Gradient end"
              value={gradient.endColor}
              onChange={(endColor) => onPatch({ gradient: { ...gradient, endColor } })}
            />
          </div>
        ) : (
          <>
            <div className="studio-template-image">
              <HomepageImageInput
                value={slide.backgroundImage}
                inputLabel="Background image URL"
                allowDestructiveCrop={false}
                onChange={(backgroundImage) => onPatch({ backgroundImage })}
              />
            </div>
            {backgroundImageFill && slide.backgroundImage ? (
              <>
                <div
                  className="studio-template-segment"
                  role="group"
                  aria-label="Background image fit"
                >
                  {(["cover", "contain", "fill"] as const).map((fit) => (
                    <button
                      key={fit}
                      type="button"
                      className={(backgroundImageFill.fit ?? "cover") === fit ? "is-active" : ""}
                      onClick={() => onPatchFill(backgroundImageFill.id, { fit })}
                    >
                      {fit[0]!.toUpperCase() + fit.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="studio-template-responsive-values studio-template-responsive-values--three">
                  <NumberField
                    label="Image X"
                    value={backgroundImageFill.offsetX ?? 0}
                    min={-100}
                    max={100}
                    onChange={(offsetX) => onPatchFill(backgroundImageFill.id, { offsetX })}
                  />
                  <NumberField
                    label="Image Y"
                    value={backgroundImageFill.offsetY ?? 0}
                    min={-100}
                    max={100}
                    onChange={(offsetY) => onPatchFill(backgroundImageFill.id, { offsetY })}
                  />
                  <NumberField
                    label="Zoom %"
                    value={backgroundImageFill.zoom ?? 100}
                    min={10}
                    max={500}
                    onChange={(zoom) => onPatchFill(backgroundImageFill.id, { zoom })}
                  />
                </div>
                <button
                  type="button"
                  className={`studio-template-action ${cropFillId === backgroundImageFill.id ? "is-active" : ""}`}
                  onClick={() =>
                    onCropFill(
                      cropFillId === backgroundImageFill.id ? null : backgroundImageFill.id,
                    )
                  }
                >
                  <Crop size={14} />
                  <span>
                    {cropFillId === backgroundImageFill.id
                      ? "Finish background crop"
                      : "Crop background image"}
                  </span>
                </button>
              </>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

function ProductPicker({
  props,
  products,
  onPatch,
}: {
  props: CollectionFeatureProps;
  products: StoreProduct[];
  onPatch: (patch: HomepageTemplatePatch) => void;
}) {
  const [query, setQuery] = useState("");
  const mode = props.productSelection ?? "collection";
  const selectedSlugs = props.productSlugs ?? [];
  const selectedProducts = selectedSlugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is StoreProduct => Boolean(product));
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.collection.toLowerCase().includes(normalizedQuery),
    );
  }, [products, query]);

  const switchToManual = () => {
    const collection = props.collection.toLowerCase();
    const initial =
      selectedSlugs.length > 0
        ? selectedSlugs
        : products
            .filter(
              (product) =>
                collection === "all" ||
                product.collectionSlug?.toLowerCase() === collection ||
                product.collection.toLowerCase() === collection,
            )
            .slice(0, Math.min(8, Math.max(1, props.productLimit)))
            .map((product) => product.slug);
    onPatch({ productSelection: "manual", productSlugs: initial });
  };

  const moveProduct = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selectedSlugs.length) return;
    const next = [...selectedSlugs];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onPatch({ productSlugs: next });
  };

  const toggleProduct = (slug: string) => {
    if (selectedSlugs.includes(slug)) {
      onPatch({ productSlugs: selectedSlugs.filter((selected) => selected !== slug) });
      return;
    }
    if (selectedSlugs.length >= 8) return;
    onPatch({ productSlugs: [...selectedSlugs, slug] });
  };

  return (
    <>
      <div className="studio-template-segment" role="group" aria-label="Product selection mode">
        <button
          type="button"
          className={mode === "collection" ? "is-active" : ""}
          onClick={() => onPatch({ productSelection: "collection" })}
        >
          Collection
        </button>
        <button
          type="button"
          className={mode === "manual" ? "is-active" : ""}
          onClick={switchToManual}
        >
          Choose products
        </button>
      </div>

      {mode === "manual" ? (
        <div className="studio-product-picker">
          <div className="studio-product-picker__count">
            <span>Selected products</span>
            <strong>{selectedSlugs.length}/8</strong>
          </div>
          {selectedProducts.length ? (
            <div className="studio-product-picker__selected">
              {selectedProducts.map((product, index) => (
                <div key={product.slug}>
                  <img src={product.images[0]} alt="" />
                  <span>{product.name}</span>
                  <button
                    type="button"
                    title="Move product up"
                    aria-label={`Move ${product.name} up`}
                    disabled={index === 0}
                    onClick={() => moveProduct(index, -1)}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    title="Move product down"
                    aria-label={`Move ${product.name} down`}
                    disabled={index === selectedProducts.length - 1}
                    onClick={() => moveProduct(index, 1)}
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    type="button"
                    title="Remove product"
                    aria-label={`Remove ${product.name}`}
                    onClick={() => toggleProduct(product.slug)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <label className="studio-product-picker__search">
            <Search size={14} />
            <input
              type="search"
              value={query}
              placeholder="Search products"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="studio-product-picker__catalog">
            {visibleProducts.map((product) => {
              const checked = selectedSlugs.includes(product.slug);
              return (
                <label key={product.slug} className={checked ? "is-selected" : ""}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && selectedSlugs.length >= 8}
                    onChange={() => toggleProduct(product.slug)}
                  />
                  <img src={product.images[0]} alt="" />
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.collection}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}

function BannerTemplate({
  item,
  categories,
  products,
  selectedLayer,
  viewport,
  cropLayerId,
  cropFillId,
  onPatch,
  onPatchLayer,
  onPatchFill,
  onCropLayer,
  onCropFill,
}: {
  item:
    | { type: "CollectionFeature"; props: CollectionFeatureProps & { id: string } }
    | { type: "PromoBanner"; props: PromoBannerProps & { id: string } };
  categories: AdminCategory[];
  products: StoreProduct[];
  selectedLayer: BannerLayer | null;
  viewport: HomepageViewport;
  cropLayerId: string | null;
  cropFillId: string | null;
  onPatch: (patch: HomepageTemplatePatch) => void;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
  onPatchFill: (id: string, patch: Partial<BannerFill>) => void;
  onCropLayer: (id: string | null) => void;
  onCropFill: (id: string | null) => void;
}) {
  const withProducts = item.type === "CollectionFeature";
  const imageOnly = item.props.contentMode === "image-only";
  const colour = withProducts ? item.props.bannerColor : item.props.backgroundColor;
  const imageFill = item.props.scene?.fills.find((fill) => fill.type === "image");
  const bannerImageLayer = item.props.scene?.layers.find((layer) => layer.id === "banner-image");
  const activeImageLayer =
    selectedLayer?.type === "image" ? selectedLayer : (bannerImageLayer ?? null);
  const editingForeground = item.type === "PromoBanner" && activeImageLayer?.id === "foreground";
  const image = withProducts
    ? item.props.image
    : editingForeground
      ? item.props.foregroundImage
      : item.props.backgroundImage;
  const activeImageStyle = activeImageLayer
    ? viewport === "mobile"
      ? { ...activeImageLayer.style, ...(activeImageLayer.mobileStyle ?? {}) }
      : activeImageLayer.style
    : null;
  const textColour =
    item.props.textColor || (item.props.textTone === "light" ? "#ffffff" : "#000000");
  const buttonBackground =
    item.props.buttonBackgroundColor || (item.props.textTone === "light" ? "#ffffff" : "#000000");
  const buttonText =
    item.props.buttonTextColor || (item.props.textTone === "light" ? "#000000" : "#ffffff");

  return (
    <>
      <section className="studio-template-section">
        <h3>Banner type</h3>
        <div className="studio-template-segment" role="group" aria-label="Banner content">
          <button
            type="button"
            className={!imageOnly ? "is-active" : ""}
            onClick={() => onPatch({ contentMode: "text-overlay" })}
          >
            Image + text
          </button>
          <button
            type="button"
            className={imageOnly ? "is-active" : ""}
            onClick={() => onPatch({ contentMode: "image-only" })}
          >
            Image only
          </button>
        </div>
      </section>

      <section className="studio-template-section">
        <h3>{activeImageLayer?.name || "Banner image"}</h3>
        <div className="studio-template-image">
          <HomepageImageInput
            value={image}
            inputLabel={editingForeground ? "Product image URL" : "Banner image URL"}
            allowDestructiveCrop={false}
            onChange={(nextImage) =>
              onPatch(
                withProducts
                  ? { image: nextImage }
                  : editingForeground
                    ? { foregroundImage: nextImage }
                    : { backgroundImage: nextImage },
              )
            }
          />
        </div>
        {activeImageLayer && activeImageStyle ? (
          <>
            <div className="studio-template-position">
              <label>
                <span>X</span>
                <input
                  type="number"
                  step="0.1"
                  value={Number(activeImageStyle.x.toFixed(1))}
                  onChange={(event) =>
                    onPatchLayer(activeImageLayer.id, { x: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Y</span>
                <input
                  type="number"
                  step="0.1"
                  value={Number(activeImageStyle.y.toFixed(1))}
                  onChange={(event) =>
                    onPatchLayer(activeImageLayer.id, { y: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>W</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.1"
                  value={Number(activeImageStyle.width.toFixed(1))}
                  onChange={(event) =>
                    onPatchLayer(activeImageLayer.id, { width: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>H</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.1"
                  value={Number(activeImageStyle.height.toFixed(1))}
                  onChange={(event) =>
                    onPatchLayer(activeImageLayer.id, { height: Number(event.target.value) })
                  }
                />
              </label>
            </div>
            <div className="studio-template-segment" role="group" aria-label="Banner image fit">
              {(["cover", "contain", "fill"] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  className={(activeImageStyle.objectFit ?? "cover") === fit ? "is-active" : ""}
                  onClick={() => onPatchLayer(activeImageLayer.id, { objectFit: fit })}
                >
                  {fit[0]!.toUpperCase() + fit.slice(1)}
                </button>
              ))}
            </div>
            <div className="studio-template-responsive-values studio-template-responsive-values--three">
              <NumberField
                label="Crop X"
                value={activeImageStyle.cropX ?? 0}
                min={-100}
                max={100}
                onChange={(cropX) => onPatchLayer(activeImageLayer.id, { cropX })}
              />
              <NumberField
                label="Crop Y"
                value={activeImageStyle.cropY ?? 0}
                min={-100}
                max={100}
                onChange={(cropY) => onPatchLayer(activeImageLayer.id, { cropY })}
              />
              <NumberField
                label="Zoom %"
                value={activeImageStyle.cropZoom ?? 100}
                min={10}
                max={500}
                onChange={(cropZoom) => onPatchLayer(activeImageLayer.id, { cropZoom })}
              />
            </div>
            <button
              type="button"
              className={`studio-template-action ${cropLayerId === activeImageLayer.id ? "is-active" : ""}`}
              onClick={() =>
                onCropLayer(cropLayerId === activeImageLayer.id ? null : activeImageLayer.id)
              }
            >
              <Crop size={14} />
              <span>
                {cropLayerId === activeImageLayer.id ? "Finish image crop" : "Crop banner image"}
              </span>
            </button>
          </>
        ) : imageFill && image ? (
          <>
            <div className="studio-template-segment" role="group" aria-label="Banner image fit">
              {(["cover", "contain", "fill"] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  className={(imageFill.fit ?? "cover") === fit ? "is-active" : ""}
                  onClick={() => onPatchFill(imageFill.id, { fit })}
                >
                  {fit[0]!.toUpperCase() + fit.slice(1)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`studio-template-action ${cropFillId === imageFill.id ? "is-active" : ""}`}
              onClick={() => onCropFill(cropFillId === imageFill.id ? null : imageFill.id)}
            >
              <Crop size={14} />
              <span>{cropFillId === imageFill.id ? "Finish image crop" : "Crop banner image"}</span>
            </button>
          </>
        ) : null}
        <ColourField
          label="Background colour"
          value={colour}
          onChange={(nextColour) =>
            onPatch(withProducts ? { bannerColor: nextColour } : { backgroundColor: nextColour })
          }
        />
      </section>

      {!imageOnly ? (
        <>
          <section className="studio-template-section">
            <h3>Content</h3>
            <TextField
              label="Small label"
              value={item.props.eyebrow}
              onChange={(eyebrow) => onPatch({ eyebrow })}
            />
            <TextField
              label="Title"
              value={item.props.title}
              onChange={(title) => onPatch({ title })}
            />
            <TextField
              label="Subtitle"
              value={item.props.body}
              multiline
              onChange={(body) => onPatch({ body })}
            />
            <TextField
              label="Shop button text"
              value={item.props.buttonLabel}
              onChange={(buttonLabel) => onPatch({ buttonLabel })}
            />
            <TextField
              label="Shop button link"
              value={item.props.buttonUrl}
              onChange={(buttonUrl) => onPatch({ buttonUrl })}
            />
          </section>

          <section className="studio-template-section">
            <h3>Typography</h3>
            <AlignmentButtons
              value={item.props.textAlign}
              label="Banner text alignment"
              onChange={(textAlign) => onPatch({ textAlign })}
            />
            <div className="studio-template-responsive-values">
              <NumberField
                label="Desktop title"
                value={item.props.titleSize}
                min={24}
                max={140}
                onChange={(titleSize) => onPatch({ titleSize })}
              />
              <NumberField
                label="Mobile title"
                value={item.props.mobileTitleSize}
                min={20}
                max={84}
                onChange={(mobileTitleSize) => onPatch({ mobileTitleSize })}
              />
            </div>
            <ColourField
              label="Text colour"
              value={colourInputValue(textColour, "#ffffff")}
              onChange={(textColor) =>
                onPatch({
                  textColor,
                  textTone: darkTextForColour(textColor) ? "dark" : "light",
                })
              }
            />
            <ColourField
              label="Button colour"
              value={colourInputValue(buttonBackground, "#ffffff")}
              onChange={(buttonBackgroundColor) => onPatch({ buttonBackgroundColor })}
            />
            <ColourField
              label="Button text"
              value={colourInputValue(buttonText, "#000000")}
              onChange={(buttonTextColor) => onPatch({ buttonTextColor })}
            />
          </section>
        </>
      ) : null}

      {withProducts ? (
        <section className="studio-template-section">
          <h3>Product row</h3>
          <ProductPicker props={item.props} products={products} onPatch={onPatch} />
          {(item.props.productSelection ?? "collection") === "collection" ? (
            <>
              <label className="studio-template-field">
                <span>Collection</span>
                <select
                  value={item.props.collection}
                  onChange={(event) => onPatch({ collection: event.target.value })}
                >
                  <option value="all">All products</option>
                  {categories
                    .filter(
                      (category) => category.type === "collection" && category.is_active !== false,
                    )
                    .map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="studio-template-field">
                <span>Number of products</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={item.props.productLimit}
                  onChange={(event) =>
                    onPatch({
                      productLimit: Math.min(8, Math.max(1, Number(event.target.value))),
                    })
                  }
                />
              </label>
            </>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

export function StudioTemplateInspector({
  data,
  selectedRef,
  categories,
  products,
  viewport,
  selectedLayer,
  cropLayerId,
  cropFillId,
  heroPosition,
  onSelectHero,
  onAddHero,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onPatch,
  onPatchLayer,
  onPatchFill,
  onCropLayer,
  onCropFill,
  onDuplicate,
  onDelete,
}: {
  data: HomepageData;
  selectedRef: StudioBannerRef;
  categories: AdminCategory[];
  products: StoreProduct[];
  viewport: HomepageViewport;
  selectedLayer: BannerLayer | null;
  cropLayerId: string | null;
  cropFillId: string | null;
  heroPosition: { index: number; total: number } | null;
  onSelectHero: (index: number) => void;
  onAddHero: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPatch: (patch: HomepageTemplatePatch) => void;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
  onPatchFill: (id: string, patch: Partial<BannerFill>) => void;
  onCropLayer: (id: string | null) => void;
  onCropFill: (id: string | null) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const item = data.content.find((entry) => entry.props.id === selectedRef.itemId);
  if (!item) return null;

  if (selectedRef.kind === "hero" && item.type === "Hero") {
    const slide = item.props.slides[selectedRef.index ?? 0];
    if (!slide) return null;
    return (
      <aside className="studio-inspector studio-template-inspector" aria-label="Banner settings">
        <InspectorHeader
          title={slide.title || "Hero banner"}
          kind="Hero banner"
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
        <div className="studio-template-scroll">
          {heroPosition ? (
            <nav className="studio-template-navigation" aria-label="Hero slides">
              <span>
                Slide {heroPosition.index + 1} of {heroPosition.total}
              </span>
              <div>
                <button
                  type="button"
                  title="Previous hero"
                  aria-label="Previous hero"
                  disabled={heroPosition.index === 0}
                  onClick={() => onSelectHero(heroPosition.index - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  title="Next hero"
                  aria-label="Next hero"
                  disabled={heroPosition.index === heroPosition.total - 1}
                  onClick={() => onSelectHero(heroPosition.index + 1)}
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  title="Add hero"
                  aria-label="Add hero banner"
                  onClick={onAddHero}
                >
                  <Plus size={14} />
                </button>
              </div>
            </nav>
          ) : null}
          <HeroTemplate
            slide={slide}
            selectedLayer={selectedLayer}
            viewport={viewport}
            cropLayerId={cropLayerId}
            cropFillId={cropFillId}
            onPatch={onPatch}
            onPatchLayer={onPatchLayer}
            onPatchFill={onPatchFill}
            onCropLayer={onCropLayer}
            onCropFill={onCropFill}
          />
        </div>
      </aside>
    );
  }

  if (
    (selectedRef.kind === "collection-feature" && item.type === "CollectionFeature") ||
    (selectedRef.kind === "standalone" && item.type === "PromoBanner")
  ) {
    const withProducts = item.type === "CollectionFeature";
    return (
      <aside className="studio-inspector studio-template-inspector" aria-label="Banner settings">
        <InspectorHeader
          title={item.props.title || "Banner"}
          kind={withProducts ? "Banner + products" : "Banner only"}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
        <div className="studio-template-scroll">
          <div className="studio-template-kind">
            {withProducts ? <Layers3 size={15} /> : <ImageIcon size={15} />}
            <span>{withProducts ? "Products appear underneath" : "Standalone banner"}</span>
          </div>
          <BannerTemplate
            item={item}
            categories={categories}
            products={products}
            selectedLayer={selectedLayer}
            viewport={viewport}
            cropLayerId={cropLayerId}
            cropFillId={cropFillId}
            onPatch={onPatch}
            onPatchLayer={onPatchLayer}
            onPatchFill={onPatchFill}
            onCropLayer={onCropLayer}
            onCropFill={onCropFill}
          />
        </div>
      </aside>
    );
  }

  return null;
}
