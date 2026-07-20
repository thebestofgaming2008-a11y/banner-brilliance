export type HomepageTextAlign = "left" | "center" | "right";
export type HomepageTextTone = "light" | "dark";
export type HomepageFont = "display" | "sans";

export type HeroGradient = {
  enabled: "on" | "off";
  startColor: string;
  endColor: string;
  angle: number;
  opacity: number;
};

export type HeroSlide = {
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  backgroundImage: string;
  foregroundImage: string;
  backgroundColor: string;
  imageFocus: string;
  gradient: HeroGradient;
  layout?: "original" | "banner";
  textAlign?: HomepageTextAlign;
  textTone?: HomepageTextTone;
  titleFont?: HomepageFont;
  titleSize?: number;
  mobileTitleSize?: number;
  contentWidth?: number;
  contentOffsetX?: number;
  contentOffsetY?: number;
  foregroundScale?: number;
  overlayOpacity?: number;
};

export type CollectionCard = {
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  image: string;
};

export type HeroProps = {
  slides: HeroSlide[];
  layout: "original" | "banner";
  editorSlide: number;
  textAlign: HomepageTextAlign;
  textTone: HomepageTextTone;
  titleFont: HomepageFont;
  titleSize: number;
  mobileTitleSize: number;
  contentWidth: number;
  contentOffsetX: number;
  contentOffsetY: number;
  foregroundScale: number;
  overlayOpacity: number;
  autoplay: "on" | "off";
};

export type CollectionBannersProps = {
  eyebrow: string;
  title: string;
  cards: CollectionCard[];
  backgroundColor: string;
  titleFont: HomepageFont;
  titleSize: number;
};

export type ProductGridProps = {
  eyebrow: string;
  title: string;
  collection: string;
  productLimit: number;
  showFilters: "yes" | "no";
  backgroundColor: string;
  titleFont: HomepageFont;
  titleSize: number;
  columns: "2" | "3" | "4";
};

export type SplitEditorialProps = {
  eyebrow: string;
  title: string;
  cards: CollectionCard[];
  backgroundColor: string;
  titleFont: HomepageFont;
  titleSize: number;
};

export type CollectionFeatureProps = {
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  collection: string;
  image: string;
  backgroundColor: string;
  bannerColor: string;
  textTone: HomepageTextTone;
  textAlign: HomepageTextAlign;
  titleFont: HomepageFont;
  titleSize: number;
  mobileTitleSize: number;
  productLimit: number;
  layout: "banner-top" | "banner-left";
};

export type PromoBannerProps = {
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  backgroundImage: string;
  foregroundImage: string;
  backgroundColor: string;
  textTone: HomepageTextTone;
  textAlign: HomepageTextAlign;
  titleFont: HomepageFont;
  titleSize: number;
  mobileTitleSize: number;
  imageFocus: string;
  foregroundScale: number;
  overlayOpacity: number;
  minHeight: number;
};

export type TextSectionProps = {
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  backgroundColor: string;
  textColor: string;
  textAlign: HomepageTextAlign;
  titleFont: HomepageFont;
  titleSize: number;
  maxWidth: number;
};

export type SpacerProps = {
  height: number;
  mobileHeight: number;
  backgroundColor: string;
};

export type FeatureStripItem = {
  title: string;
  body: string;
};

export type FeatureStripProps = {
  items: FeatureStripItem[];
  backgroundColor: string;
  textColor: string;
  columns: "2" | "3" | "4";
};

export type ImageGalleryProps = {
  eyebrow: string;
  title: string;
  cards: CollectionCard[];
  backgroundColor: string;
  titleFont: HomepageFont;
  titleSize: number;
  columns: "2" | "3" | "4";
  imageRatio: "portrait" | "square" | "landscape";
};

export type HomepageComponentProps = {
  Hero: HeroProps;
  CollectionBanners: CollectionBannersProps;
  ProductGrid: ProductGridProps;
  SplitEditorial: SplitEditorialProps;
  CollectionFeature: CollectionFeatureProps;
  PromoBanner: PromoBannerProps;
  TextSection: TextSectionProps;
  Spacer: SpacerProps;
  FeatureStrip: FeatureStripProps;
  ImageGallery: ImageGalleryProps;
};

export type HomepageComponentType = keyof HomepageComponentProps;

export type HomepageContentItem = {
  type: HomepageComponentType;
  props: HomepageComponentProps[HomepageComponentType] & { id: string };
};

export type HomepageData = {
  root: {
    props: {
      title: string;
      backgroundColor: string;
    };
  };
  content: HomepageContentItem[];
  zones?: Record<string, HomepageContentItem[]>;
};

export type HomepageVersion = {
  id: string;
  version: number;
  created_at: string;
  created_by?: string | null;
  summary?: string | null;
};

export type HomepageEditorState = {
  draft: HomepageData | null;
  published: HomepageData | null;
  draft_revision: number;
  published_version: number;
  updated_at?: string | null;
  published_at?: string | null;
  versions: HomepageVersion[];
};
