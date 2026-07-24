import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
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
  onPatch,
  onPatchLayer,
}: {
  slide: HeroSlide;
  selectedLayer: BannerLayer | null;
  viewport: HomepageViewport;
  onPatch: (patch: HomepageTemplatePatch) => void;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
}) {
  const gradient = slide.gradient;
  const backgroundMode = gradient.enabled === "off" ? "image" : "gradient";
  const selectedStyle = selectedLayer
    ? viewport === "mobile"
      ? { ...selectedLayer.style, ...(selectedLayer.mobileStyle ?? {}) }
      : selectedLayer.style
    : null;
  const textAlign = selectedStyle?.textAlign ?? slide.textAlign ?? "center";
  const setTextAlign = (next: "left" | "center" | "right") => {
    if (selectedLayer) onPatchLayer(selectedLayer.id, { textAlign: next });
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
          </div>
        ) : null}
        <div className="studio-template-align" role="group" aria-label="Text alignment">
          <button
            type="button"
            title="Align text left"
            aria-label="Align text left"
            className={textAlign === "left" ? "is-active" : ""}
            onClick={() => setTextAlign("left")}
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            title="Align text center"
            aria-label="Align text center"
            className={textAlign === "center" ? "is-active" : ""}
            onClick={() => setTextAlign("center")}
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            title="Align text right"
            aria-label="Align text right"
            className={textAlign === "right" ? "is-active" : ""}
            onClick={() => setTextAlign("right")}
          >
            <AlignRight size={15} />
          </button>
        </div>
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
          <div className="studio-template-image">
            <HomepageImageInput
              value={slide.backgroundImage}
              inputLabel="Background image URL"
              onChange={(backgroundImage) => onPatch({ backgroundImage })}
            />
          </div>
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
  onPatch,
}: {
  item:
    | { type: "CollectionFeature"; props: CollectionFeatureProps & { id: string } }
    | { type: "PromoBanner"; props: PromoBannerProps & { id: string } };
  categories: AdminCategory[];
  products: StoreProduct[];
  onPatch: (patch: HomepageTemplatePatch) => void;
}) {
  const withProducts = item.type === "CollectionFeature";
  const image = withProducts ? item.props.image : item.props.backgroundImage;
  const colour = withProducts ? item.props.bannerColor : item.props.backgroundColor;

  return (
    <>
      <section className="studio-template-section">
        <h3>Content</h3>
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
          label="Shop button link"
          value={item.props.buttonUrl}
          onChange={(buttonUrl) => onPatch({ buttonUrl })}
        />
      </section>

      <section className="studio-template-section">
        <h3>Banner image</h3>
        <div className="studio-template-image">
          <HomepageImageInput
            value={image}
            inputLabel="Banner image URL"
            onChange={(nextImage) =>
              onPatch(withProducts ? { image: nextImage } : { backgroundImage: nextImage })
            }
          />
        </div>
        <ColourField
          label="Background colour"
          value={colour}
          onChange={(nextColour) =>
            onPatch(withProducts ? { bannerColor: nextColour } : { backgroundColor: nextColour })
          }
        />
      </section>

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
  heroPosition,
  onSelectHero,
  onAddHero,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onPatch,
  onPatchLayer,
  onDuplicate,
  onDelete,
}: {
  data: HomepageData;
  selectedRef: StudioBannerRef;
  categories: AdminCategory[];
  products: StoreProduct[];
  viewport: HomepageViewport;
  selectedLayer: BannerLayer | null;
  heroPosition: { index: number; total: number } | null;
  onSelectHero: (index: number) => void;
  onAddHero: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPatch: (patch: HomepageTemplatePatch) => void;
  onPatchLayer: (id: string, patch: Partial<BannerLayerStyle>) => void;
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
            onPatch={onPatch}
            onPatchLayer={onPatchLayer}
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
            onPatch={onPatch}
          />
        </div>
      </aside>
    );
  }

  return null;
}
