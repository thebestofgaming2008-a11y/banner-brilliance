import type { Config, Field } from "@puckeditor/core";

import type { AdminCategory } from "@/services/adminService";
import { StoreFooter, StoreHeader } from "@/components/store/store-chrome";
import {
  HomepageCollectionBanners,
  HomepageCollectionFeature,
  HomepageHero,
  HomepageFeatureStrip,
  HomepageImageGallery,
  HomepageProductGrid,
  HomepagePromoBanner,
  HomepageSpacer,
  HomepageSplitEditorial,
  HomepageTextSection,
} from "./components";
import { DEFAULT_HERO_GRADIENT } from "./brand";
import { homepageGradientField } from "./homepage-gradient-field";
import { homepageColorField, homepageImageField } from "./homepage-image-field";
import type { CollectionCard, HeroSlide, HomepageComponentProps } from "./types";

const text = (label: string, placeholder = ""): Field<string> => ({
  type: "text",
  label,
  placeholder,
  contentEditable: true,
});

const textarea = (label: string): Field<string> => ({
  type: "textarea",
  label,
  contentEditable: true,
});

const number = (label: string, min: number, max: number, step = 1): Field<number> => ({
  type: "number",
  label,
  min,
  max,
  step,
});

const textAlign: Field<"left" | "center" | "right"> = {
  type: "radio",
  label: "Alignment",
  options: [
    { label: "Left", value: "left" },
    { label: "Centre", value: "center" },
    { label: "Right", value: "right" },
  ],
};

const textTone: Field<"light" | "dark"> = {
  type: "radio",
  label: "Text colour",
  options: [
    { label: "White", value: "light" },
    { label: "Black", value: "dark" },
  ],
};

const titleFont: Field<"display" | "sans"> = {
  type: "select",
  label: "Title font",
  options: [
    { label: "Fawzaan display", value: "display" },
    { label: "Clean sans", value: "sans" },
  ],
};

const heroPreviewSlide: Field<number> = {
  type: "custom",
  label: "Slide shown in editor",
  render: ({ value, onChange, readOnly }) => (
    <div className="grid grid-cols-6 gap-1.5">
      {[1, 2, 3, 4, 5, 6].map((slide) => (
        <button
          key={slide}
          type="button"
          aria-label={`Preview hero slide ${slide}`}
          disabled={readOnly}
          onClick={() => onChange(slide)}
          className={`grid h-8 place-items-center rounded border text-xs font-semibold ${Number(value || 1) === slide ? "border-black bg-black text-white" : "border-black/15 bg-white text-black/55"}`}
        >
          {slide}
        </button>
      ))}
    </div>
  ),
};

function cardFields() {
  return {
    eyebrow: text("Small heading"),
    title: text("Title"),
    body: textarea("Description"),
    buttonLabel: text("Button text"),
    buttonUrl: text("Button link", "/shop"),
    image: homepageImageField("Image"),
  };
}

const defaultCard = (index: number): CollectionCard => ({
  eyebrow: "Collection",
  title: `NEW COLLECTION ${index + 1}`,
  body: "Describe this collection.",
  buttonLabel: "Shop collection",
  buttonUrl: "/shop",
  image: "",
});

const defaultSlide = (index: number): HeroSlide => ({
  eyebrow: "New collection",
  title: `HERO SLIDE ${index + 1}`,
  body: "",
  buttonLabel: "Shop now",
  buttonUrl: "/shop",
  backgroundImage: "",
  foregroundImage: "",
  backgroundColor: "#F6AD32",
  imageFocus: "center",
  gradient: { ...DEFAULT_HERO_GRADIENT },
  layout: "original",
  textAlign: "left",
  textTone: "light",
  titleFont: "display",
  titleSize: 76,
  mobileTitleSize: 48,
  contentWidth: 650,
  contentOffsetX: 6,
  contentOffsetY: 9,
  foregroundScale: 100,
  overlayOpacity: 12,
});

export function createHomepagePuckConfig(
  categories: AdminCategory[],
  options: { previewStoreChrome?: boolean } = {},
): Config<HomepageComponentProps, { title: string; backgroundColor: string }> {
  const collectionOptions = [
    { label: "All products", value: "all" },
    ...categories
      .filter((category) => category.type === "collection" && category.is_active !== false)
      .map((category) => ({ label: category.name, value: category.slug })),
  ];

  return {
    categories: {
      hero: { title: "Hero & banners", components: ["Hero", "PromoBanner"] },
      commerce: {
        title: "Products & collections",
        components: ["ProductGrid", "CollectionFeature", "CollectionBanners", "SplitEditorial"],
      },
      content: { title: "Text & spacing", components: ["TextSection", "Spacer"] },
      details: { title: "Details & galleries", components: ["FeatureStrip", "ImageGallery"] },
    },
    root: {
      fields: {
        backgroundColor: homepageColorField("Page background"),
      },
      defaultProps: { title: "Fawzaan homepage", backgroundColor: "#ffffff" },
      render: ({ children, backgroundColor }) => (
        <main
          className={
            options.previewStoreChrome
              ? "store-page min-h-screen font-sans-ui text-black"
              : undefined
          }
          style={{ minHeight: "100%", backgroundColor }}
        >
          {options.previewStoreChrome ? <StoreHeader /> : null}
          {children}
          {options.previewStoreChrome ? <StoreFooter /> : null}
        </main>
      ),
    },
    components: {
      Hero: {
        label: "Hero slider",
        fields: {
          editorSlide: heroPreviewSlide,
          slides: {
            type: "array",
            label: "Hero slides",
            min: 1,
            max: 6,
            defaultItemProps: defaultSlide,
            getItemSummary: (item, index) => item.title || `Slide ${(index ?? 0) + 1}`,
            arrayFields: {
              eyebrow: text("Small heading"),
              title: text("Title"),
              body: textarea("Description"),
              buttonLabel: text("Button text"),
              buttonUrl: text("Button link", "/shop"),
              backgroundImage: homepageImageField("Background image"),
              foregroundImage: homepageImageField("Image on top"),
              backgroundColor: homepageColorField("Background colour"),
              gradient: homepageGradientField("Gradient overlay"),
              layout: {
                type: "radio",
                label: "Slide layout",
                options: [
                  { label: "Original portrait", value: "original" },
                  { label: "Standard banner", value: "banner" },
                ],
              },
              textAlign,
              textTone,
              titleFont,
              titleSize: number("Desktop title size", 36, 140),
              mobileTitleSize: number("Mobile title size", 26, 84),
              contentWidth: number("Text width", 280, 1000, 10),
              contentOffsetX: number("Horizontal position (%)", 2, 80),
              contentOffsetY: number("Vertical position (%)", 3, 55),
              foregroundScale: number("Image on top size (%)", 25, 150),
              overlayOpacity: number("Image overlay strength (%)", 0, 80),
              imageFocus: {
                type: "select",
                label: "Background focus",
                options: [
                  { label: "Centre", value: "center" },
                  { label: "Top", value: "center top" },
                  { label: "Bottom", value: "center bottom" },
                  { label: "Left", value: "left center" },
                  { label: "Right", value: "right center" },
                ],
              },
            },
          },
        },
        defaultProps: {
          slides: [defaultSlide(0)],
          layout: "original",
          editorSlide: 1,
          textAlign: "left",
          textTone: "light",
          titleFont: "display",
          titleSize: 76,
          mobileTitleSize: 48,
          contentWidth: 650,
          contentOffsetX: 6,
          contentOffsetY: 9,
          foregroundScale: 100,
          overlayOpacity: 18,
          autoplay: "on",
        },
        render: ({ puck, ...props }) => <HomepageHero {...props} editMode={puck.isEditing} />,
      },
      CollectionBanners: {
        label: "Collection banner grid",
        fields: {
          eyebrow: text("Small heading"),
          title: text("Title"),
          cards: {
            type: "array",
            label: "Collection banners",
            min: 1,
            max: 6,
            defaultItemProps: defaultCard,
            getItemSummary: (item, index) => item.title || `Collection ${(index ?? 0) + 1}`,
            arrayFields: cardFields(),
          },
          backgroundColor: homepageColorField("Section background"),
          titleFont,
          titleSize: number("Heading size", 28, 90),
        },
        defaultProps: {
          eyebrow: "Shop more collections",
          title: "EXPLORE EDITS",
          cards: [defaultCard(0), defaultCard(1)],
          backgroundColor: "#ffffff",
          titleFont: "display",
          titleSize: 52,
        },
        render: (props) => <HomepageCollectionBanners {...props} />,
      },
      ProductGrid: {
        label: "Product grid",
        fields: {
          eyebrow: text("Small heading"),
          title: text("Title"),
          collection: { type: "select", label: "Products from", options: collectionOptions },
          productLimit: number("Maximum products", 1, 48),
          showFilters: {
            type: "radio",
            label: "Collection filters",
            options: [
              { label: "Show", value: "yes" },
              { label: "Hide", value: "no" },
            ],
          },
          backgroundColor: homepageColorField("Section background"),
          titleFont,
          titleSize: number("Heading size", 28, 90),
          columns: {
            type: "radio",
            label: "Desktop columns",
            options: [
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4", value: "4" },
            ],
          },
        },
        defaultProps: {
          eyebrow: "Browse the store",
          title: "SHOP ALL",
          collection: "all",
          productLimit: 24,
          showFilters: "yes",
          backgroundColor: "#ffffff",
          titleFont: "display",
          titleSize: 52,
          columns: "4",
        },
        render: (props) => <HomepageProductGrid {...props} />,
      },
      SplitEditorial: {
        label: "Two-image collection",
        fields: {
          eyebrow: text("Small heading"),
          title: text("Title"),
          cards: {
            type: "array",
            label: "Panels",
            min: 1,
            max: 4,
            defaultItemProps: defaultCard,
            getItemSummary: (item, index) => item.title || `Panel ${(index ?? 0) + 1}`,
            arrayFields: cardFields(),
          },
          backgroundColor: homepageColorField("Section background"),
          titleFont,
          titleSize: number("Heading size", 28, 90),
        },
        defaultProps: {
          eyebrow: "Fawzaan essentials",
          title: "DAILY ESSENTIALS",
          cards: [defaultCard(0), defaultCard(1)],
          backgroundColor: "#ffffff",
          titleFont: "display",
          titleSize: 52,
        },
        render: (props) => <HomepageSplitEditorial {...props} />,
      },
      CollectionFeature: {
        label: "Collection with products",
        fields: {
          eyebrow: text("Small heading"),
          title: text("Title"),
          body: textarea("Description"),
          buttonLabel: text("Button text"),
          buttonUrl: text("Button link", "/shop"),
          collection: { type: "select", label: "Products from", options: collectionOptions },
          image: homepageImageField("Collection image"),
          backgroundColor: homepageColorField("Section background"),
          bannerColor: homepageColorField("Banner background"),
          textTone,
          textAlign,
          titleFont,
          titleSize: number("Desktop title size", 32, 120),
          mobileTitleSize: number("Mobile title size", 26, 72),
          productLimit: number("Maximum products", 1, 8),
          layout: {
            type: "radio",
            label: "Layout",
            options: [
              { label: "Banner above", value: "banner-top" },
              { label: "Banner beside", value: "banner-left" },
            ],
          },
        },
        defaultProps: {
          eyebrow: "Collection",
          title: "COLLECTION TITLE",
          body: "Describe this collection.",
          buttonLabel: "Shop collection",
          buttonUrl: "/shop",
          collection: collectionOptions[1]?.value || "all",
          image: "",
          backgroundColor: "#ffffff",
          bannerColor: "#000000",
          textTone: "light",
          textAlign: "left",
          titleFont: "display",
          titleSize: 64,
          mobileTitleSize: 42,
          productLimit: 4,
          layout: "banner-top",
        },
        render: (props) => <HomepageCollectionFeature {...props} />,
      },
      PromoBanner: {
        label: "Offer banner",
        fields: {
          eyebrow: text("Small heading"),
          title: text("Title"),
          body: textarea("Description"),
          buttonLabel: text("Button text"),
          buttonUrl: text("Button link", "/shop"),
          backgroundImage: homepageImageField("Background image"),
          foregroundImage: homepageImageField("Image on top"),
          backgroundColor: homepageColorField("Background colour"),
          textTone,
          textAlign,
          titleFont,
          titleSize: number("Desktop title size", 32, 120),
          mobileTitleSize: number("Mobile title size", 26, 72),
          imageFocus: text("Image focus", "center"),
          foregroundScale: number("Foreground image size (%)", 20, 100),
          overlayOpacity: number("Overlay strength (%)", 0, 80),
          minHeight: number("Section height", 300, 900, 10),
        },
        defaultProps: {
          eyebrow: "Limited offer",
          title: "YOUR OFFER",
          body: "Add the details customers need.",
          buttonLabel: "Shop now",
          buttonUrl: "/shop",
          backgroundImage: "",
          foregroundImage: "",
          backgroundColor: "#F6AD32",
          textTone: "dark",
          textAlign: "left",
          titleFont: "display",
          titleSize: 68,
          mobileTitleSize: 42,
          imageFocus: "center",
          foregroundScale: 55,
          overlayOpacity: 18,
          minHeight: 520,
        },
        render: (props) => <HomepagePromoBanner {...props} />,
      },
      TextSection: {
        label: "Text section",
        fields: {
          eyebrow: text("Small heading"),
          title: text("Title"),
          body: textarea("Body"),
          buttonLabel: text("Button text"),
          buttonUrl: text("Button link"),
          backgroundColor: homepageColorField("Background colour"),
          textColor: homepageColorField("Text colour"),
          textAlign,
          titleFont,
          titleSize: number("Title size", 28, 100),
          maxWidth: number("Content width", 320, 1180, 20),
        },
        defaultProps: {
          eyebrow: "Our story",
          title: "A NEW SECTION",
          body: "Add your message here.",
          buttonLabel: "",
          buttonUrl: "",
          backgroundColor: "#ffffff",
          textColor: "#000000",
          textAlign: "center",
          titleFont: "display",
          titleSize: 52,
          maxWidth: 760,
        },
        render: (props) => <HomepageTextSection {...props} />,
      },
      Spacer: {
        label: "Spacing",
        fields: {
          height: number("Desktop space", 0, 300),
          mobileHeight: number("Mobile space", 0, 200),
          backgroundColor: homepageColorField("Background colour"),
        },
        defaultProps: { height: 64, mobileHeight: 32, backgroundColor: "#ffffff" },
        render: (props) => <HomepageSpacer {...props} />,
      },
      FeatureStrip: {
        label: "Benefits strip",
        fields: {
          items: {
            type: "array",
            label: "Benefits",
            min: 1,
            max: 8,
            defaultItemProps: (index) => ({
              title: `Benefit ${index + 1}`,
              body: "Add a short customer benefit.",
            }),
            getItemSummary: (item, index) => item.title || `Benefit ${(index ?? 0) + 1}`,
            arrayFields: {
              title: text("Title"),
              body: textarea("Description"),
            },
          },
          backgroundColor: homepageColorField("Background colour"),
          textColor: homepageColorField("Text colour"),
          columns: {
            type: "radio",
            label: "Desktop columns",
            options: [
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4", value: "4" },
            ],
          },
        },
        defaultProps: {
          items: [
            { title: "Secure checkout", body: "Protected payments for India." },
            { title: "Worldwide ordering", body: "Personal confirmation through WhatsApp." },
            { title: "Order tracking", body: "Updates from dispatch to delivery." },
          ],
          backgroundColor: "#ffffff",
          textColor: "#000000",
          columns: "3",
        },
        render: (props) => <HomepageFeatureStrip {...props} />,
      },
      ImageGallery: {
        label: "Image and link gallery",
        fields: {
          eyebrow: text("Small heading"),
          title: text("Title"),
          cards: {
            type: "array",
            label: "Gallery items",
            min: 1,
            max: 8,
            defaultItemProps: defaultCard,
            getItemSummary: (item, index) => item.title || `Image ${(index ?? 0) + 1}`,
            arrayFields: cardFields(),
          },
          backgroundColor: homepageColorField("Section background"),
          titleFont,
          titleSize: number("Heading size", 28, 90),
          columns: {
            type: "radio",
            label: "Desktop columns",
            options: [
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4", value: "4" },
            ],
          },
          imageRatio: {
            type: "radio",
            label: "Image shape",
            options: [
              { label: "Portrait", value: "portrait" },
              { label: "Square", value: "square" },
              { label: "Landscape", value: "landscape" },
            ],
          },
        },
        defaultProps: {
          eyebrow: "Discover more",
          title: "EXPLORE FAWZAAN",
          cards: [defaultCard(0), defaultCard(1), defaultCard(2)],
          backgroundColor: "#ffffff",
          titleFont: "display",
          titleSize: 52,
          columns: "3",
          imageRatio: "portrait",
        },
        render: (props) => <HomepageImageGallery {...props} />,
      },
    },
  };
}
