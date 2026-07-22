export type HomepageTextAlign = "left" | "center" | "right";
export type HomepageTextTone = "light" | "dark";
export type HomepageFont = "display" | "sans";

export type HomepageViewport = "desktop" | "mobile";
export type BannerLayerType = "text" | "button" | "image" | "shape";
export type BannerFillType = "solid" | "image" | "linear" | "radial" | "conic";

export type BannerGradientStop = {
  color: string;
  position: number;
};

export type BannerFill = {
  id: string;
  type: BannerFillType;
  enabled: boolean;
  opacity: number;
  color?: string;
  src?: string;
  fit?: "cover" | "contain" | "fill" | "tile";
  position?: string;
  offsetX?: number;
  offsetY?: number;
  zoom?: number;
  blur?: number;
  blendMode?: "normal" | "multiply" | "screen" | "overlay" | "soft-light";
  angle?: number;
  centerX?: number;
  centerY?: number;
  stops?: BannerGradientStop[];
};

export type BannerLayerStyle = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked?: boolean;
  fontFamily?: "instrument" | "schibsted" | "serif" | "sans";
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: HomepageTextAlign;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline";
  whiteSpace?: "normal" | "nowrap" | "pre-wrap";
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  shadowColor?: string;
  blur?: number;
  objectFit?: "cover" | "contain" | "fill";
  objectPosition?: string;
  cropX?: number;
  cropY?: number;
  cropZoom?: number;
  lockAspectRatio?: boolean;
  blendMode?: "normal" | "multiply" | "screen" | "overlay" | "soft-light";
};

export type BannerLayer = {
  id: string;
  name: string;
  type: BannerLayerType;
  semantic?: "h1" | "h2" | "h3" | "p" | "span";
  text?: string;
  src?: string;
  href?: string;
  style: BannerLayerStyle;
  mobileStyle?: Partial<BannerLayerStyle>;
};

export type BannerScene = {
  version: 1;
  name: string;
  height: number;
  mobileHeight: number;
  coordinateMode?: "full" | "original-hero";
  fills: BannerFill[];
  layers: BannerLayer[];
};

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
  scene?: BannerScene;
};

export type CollectionCard = {
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  image: string;
  scene?: BannerScene;
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
  autoplayInterval?: number;
  transition?: "slide" | "fade";
  transitionDuration?: number;
  pauseOnHover?: "yes" | "no";
  loop?: "yes" | "no";
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
  layout: "banner-top" | "banner-left" | "banner-right";
  scene?: BannerScene;
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
  scene?: BannerScene;
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
  [Type in HomepageComponentType]: {
    type: Type;
    props: HomepageComponentProps[Type] & { id: string };
  };
}[HomepageComponentType];

export type HomepageData = {
  schemaVersion: 2;
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
  has_published?: boolean;
  is_draft_published?: boolean;
  draft_revision: number;
  published_version: number;
  updated_at?: string | null;
  published_at?: string | null;
  versions: HomepageVersion[];
};
