import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Image as ImageIcon,
  Layers3,
  Plus,
  Trash2,
} from "lucide-react";

import type { AdminCategory } from "@/services/adminService";
import { HomepageImageInput } from "./homepage-image-field";
import type { StudioBannerRef } from "./studio-model";
import type { CollectionFeatureProps, HeroSlide, HomepageData, PromoBannerProps } from "./types";

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
  onPatch,
}: {
  slide: HeroSlide;
  onPatch: (patch: HomepageTemplatePatch) => void;
}) {
  const gradient = slide.gradient;
  const backgroundMode = gradient.enabled === "off" ? "image" : "gradient";

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

function BannerTemplate({
  item,
  categories,
  onPatch,
}: {
  item:
    | { type: "CollectionFeature"; props: CollectionFeatureProps & { id: string } }
    | { type: "PromoBanner"; props: PromoBannerProps & { id: string } };
  categories: AdminCategory[];
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
        </section>
      ) : null}
    </>
  );
}

export function StudioTemplateInspector({
  data,
  selectedRef,
  categories,
  heroPosition,
  onSelectHero,
  onAddHero,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onPatch,
  onDuplicate,
  onDelete,
}: {
  data: HomepageData;
  selectedRef: StudioBannerRef;
  categories: AdminCategory[];
  heroPosition: { index: number; total: number } | null;
  onSelectHero: (index: number) => void;
  onAddHero: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPatch: (patch: HomepageTemplatePatch) => void;
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
          <HeroTemplate slide={slide} onPatch={onPatch} />
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
          <BannerTemplate item={item} categories={categories} onPatch={onPatch} />
        </div>
      </aside>
    );
  }

  return null;
}
