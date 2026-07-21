import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { StoreProductCard } from "@/components/store/product-card";
import { merchandiseProducts, useStoreProducts } from "@/data/store";
import { useCatalogPresentation } from "@/services/catalogPresentation";
import { BannerSceneView } from "./banner-scene";
import { normalizeHomepageData } from "./default-data";
import type {
  CollectionBannersProps,
  CollectionFeatureProps,
  HeroProps,
  FeatureStripProps,
  ImageGalleryProps,
  HomepageData,
  HomepageFont,
  ProductGridProps,
  PromoBannerProps,
  SpacerProps,
  SplitEditorialProps,
  TextSectionProps,
} from "./types";

type EditorAware = { editMode?: boolean; id?: string };

function fontClass(font: HomepageFont) {
  return font === "sans" ? "font-sans-ui font-bold" : "font-serif-display font-normal";
}

function normalized(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function textAlignClass(value: "left" | "center" | "right") {
  if (value === "center") return "items-center text-center";
  if (value === "right") return "items-end text-right";
  return "items-start text-left";
}

function safeLink(url: string) {
  const value = String(url || "#").trim();
  return value.startsWith("/") || value.startsWith("#") || /^https:\/\//i.test(value) ? value : "#";
}

export function HomepageHero({
  id,
  slides,
  layout,
  editorSlide,
  textAlign,
  textTone,
  titleFont,
  titleSize,
  mobileTitleSize,
  contentWidth,
  contentOffsetX,
  contentOffsetY,
  foregroundScale,
  overlayOpacity,
  autoplay = "on",
  autoplayInterval = 5200,
  transition = "slide",
  transitionDuration = 760,
  pauseOnHover = "yes",
  loop = "yes",
  editMode,
}: HeroProps & EditorAware) {
  const safeSlides = slides?.length ? slides.slice(0, 12) : [];
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    if (!editMode) return;
    setActive(Math.min(safeSlides.length - 1, Math.max(0, Number(editorSlide || 1) - 1)));
  }, [editMode, editorSlide, safeSlides.length]);

  useEffect(() => {
    if (
      editMode ||
      autoplay !== "on" ||
      dragging ||
      (hovered && pauseOnHover === "yes") ||
      safeSlides.length < 2
    )
      return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(
      () =>
        setActive((current) =>
          loop === "yes"
            ? (current + 1) % safeSlides.length
            : Math.min(current + 1, safeSlides.length - 1),
        ),
      Math.min(30000, Math.max(1500, autoplayInterval)),
    );
    return () => window.clearTimeout(timer);
  }, [
    active,
    autoplay,
    autoplayInterval,
    dragging,
    editMode,
    hovered,
    loop,
    pauseOnHover,
    safeSlides.length,
  ]);

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, safeSlides.length - 1)));
  }, [safeSlides.length]);

  if (!safeSlides.length) {
    return editMode ? (
      <div className="brand-mango-bg grid min-h-[420px] place-items-center p-8 text-center text-sm">
        Add at least one hero slide from the right panel.
      </div>
    ) : null;
  }

  const goTo = (index: number) => {
    if (!safeSlides.length) return;
    setActive(
      loop === "yes"
        ? (index + safeSlides.length) % safeSlides.length
        : Math.min(safeSlides.length - 1, Math.max(0, index)),
    );
  };

  const finishDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragStart.current === null) return;
    const threshold = Math.min(72, event.currentTarget.clientWidth * 0.14);
    const completedOffset = event.clientX - dragStart.current;
    if (Math.abs(completedOffset) >= threshold) {
      goTo(active + (completedOffset < 0 ? 1 : -1));
    }
    dragStart.current = null;
    setDragging(false);
    setDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      dragged.current = false;
    }, 0);
  };

  const activeSlide = safeSlides[active];
  const activeLayout = (activeSlide?.layout ?? layout) === "banner" ? "banner" : "original";
  const activeLightText = (activeSlide?.textTone ?? textTone) === "light";
  const activeScene = activeSlide?.scene;

  return (
    <section
      data-homepage-banner-id={id}
      className={`relative overflow-hidden ${activeScene ? "homepage-scene-hero" : ""} ${activeLightText ? "text-white" : "text-black"} ${dragging ? "cursor-grabbing" : safeSlides.length > 1 ? "cursor-grab" : ""}`}
      style={
        activeScene
          ? ({
              "--homepage-scene-height": `${Math.max(420, activeScene.height)}px`,
              "--homepage-scene-mobile-height": `${Math.max(320, activeScene.mobileHeight)}px`,
              touchAction: "pan-y",
            } as CSSProperties)
          : {
              height:
                activeLayout === "original"
                  ? "clamp(560px, 166.41vw, 820px)"
                  : "clamp(560px, 82vw, 720px)",
              touchAction: "pan-y",
            }
      }
      aria-label="Featured collection"
      data-transition={transition}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={(event) => {
        if (editMode || safeSlides.length < 2 || !event.isPrimary || event.button !== 0) return;
        dragStart.current = event.clientX;
        dragged.current = false;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (dragStart.current === null) return;
        const nextOffset = event.clientX - dragStart.current;
        if (Math.abs(nextOffset) > 5) dragged.current = true;
        setDragOffset(nextOffset);
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClickCapture={(event) => {
        if (!dragged.current) return;
        event.preventDefault();
        event.stopPropagation();
        dragged.current = false;
      }}
    >
      <div
        data-hero-track
        className="flex h-full will-change-transform"
        style={
          {
            transform:
              transition === "fade"
                ? undefined
                : `translate3d(calc(-${active * 100}% + ${dragOffset}px), 0, 0)`,
            transition:
              dragging || transition === "fade"
                ? "none"
                : `transform ${Math.min(2000, Math.max(100, transitionDuration))}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            "--hero-transition-duration": `${Math.min(2000, Math.max(100, transitionDuration))}ms`,
          } as CSSProperties
        }
      >
        {safeSlides.map((slide, index) => {
          const slideTextTone = slide.textTone ?? textTone;
          const slideTextAlign = slide.textAlign ?? textAlign;
          const slideTitleFont = slide.titleFont ?? titleFont;
          const slideTitleSize = slide.titleSize ?? titleSize;
          const slideMobileTitleSize = slide.mobileTitleSize ?? mobileTitleSize;
          const slideContentWidth = slide.contentWidth ?? contentWidth;
          const slideContentOffsetX = slide.contentOffsetX ?? contentOffsetX;
          const slideContentOffsetY = slide.contentOffsetY ?? contentOffsetY;
          const slideForegroundScale = slide.foregroundScale ?? foregroundScale;
          const slideOverlayOpacity = slide.overlayOpacity ?? overlayOpacity;
          const lightText = slideTextTone === "light";
          const align = textAlignClass(slideTextAlign);
          const selectedLayout = (slide.layout ?? layout) === "banner" ? "banner" : "original";
          const gradient = slide.gradient ?? {
            enabled: "on" as const,
            startColor: "#FBCB3D",
            endColor: "#F18532",
            angle: 105,
            opacity: 84,
          };
          const originalTitle =
            index === 0
              ? { left: 37, top: 121, width: 316 }
              : index === 1
                ? { left: 41, top: 100, width: 319 }
                : { left: 30, top: 110, width: 330 };

          if (slide.scene) {
            return (
              <article
                key={`${slide.title}-${index}`}
                className="relative h-full w-full shrink-0 overflow-hidden"
                aria-hidden={active !== index}
                inert={active !== index}
              >
                <BannerSceneView scene={slide.scene} className="h-full" />
              </article>
            );
          }

          return (
            <article
              key={`${slide.title}-${index}`}
              className={`relative h-full w-full shrink-0 overflow-hidden ${lightText ? "text-white" : "text-black"}`}
              style={{ backgroundColor: slide.backgroundColor || "#F6AD32" }}
              aria-hidden={active !== index}
              inert={active !== index}
            >
              {slide.backgroundImage ? (
                <img
                  src={slide.backgroundImage}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding="async"
                  draggable={false}
                  className="pointer-events-none absolute inset-0 z-[1] h-full w-full select-none object-cover"
                  style={{ objectPosition: slide.imageFocus || "center" }}
                />
              ) : null}
              {gradient.enabled === "on" ? (
                <div
                  data-hero-gradient={active === index ? true : undefined}
                  data-gradient-angle={gradient.angle}
                  className="pointer-events-none absolute inset-0 z-[2]"
                  style={{
                    backgroundImage: `linear-gradient(${Math.min(360, Math.max(0, gradient.angle))}deg, ${gradient.startColor}, ${gradient.endColor})`,
                    opacity: Math.min(1, Math.max(0, gradient.opacity / 100)),
                  }}
                />
              ) : null}
              <div
                className={`pointer-events-none absolute inset-0 z-[3] ${lightText ? "bg-black" : "bg-white"}`}
                style={{ opacity: Math.min(0.8, Math.max(0, slideOverlayOpacity / 100)) }}
              />
              <a
                href={safeLink(slide.buttonUrl)}
                aria-label={slide.buttonLabel || `View ${slide.title}`}
                className="absolute inset-0 z-[15]"
                draggable={false}
              />

              {selectedLayout === "original" ? (
                <div
                  className="pointer-events-none absolute left-1/2 top-0 z-10 h-full -translate-x-1/2 overflow-hidden"
                  style={{ aspectRatio: "390 / 649", containerType: "inline-size" }}
                >
                  {slide.foregroundImage ? (
                    <img
                      src={slide.foregroundImage}
                      alt=""
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "low"}
                      decoding="async"
                      draggable={false}
                      className="absolute inset-x-0 bottom-0 z-10 mx-auto h-auto w-full select-none object-contain object-bottom"
                    />
                  ) : null}
                  <h1
                    className="absolute z-20 m-0 whitespace-nowrap text-center font-serif-display font-normal leading-none"
                    style={{
                      left: `${(originalTitle.left / 390) * 100}%`,
                      top: `${(originalTitle.top / 649) * 100}%`,
                      width: `${(originalTitle.width / 390) * 100}%`,
                      fontSize: `${(52 / 390) * 100}cqw`,
                    }}
                  >
                    {slide.title}
                  </h1>
                  <span
                    className="absolute z-20 text-[12px] font-semibold uppercase leading-none underline underline-offset-4"
                    style={{ left: `${(25 / 390) * 100}%`, top: `${(614 / 649) * 100}%` }}
                  >
                    Shop the collection
                  </span>
                </div>
              ) : (
                <>
                  {slide.foregroundImage ? (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center overflow-hidden">
                      <img
                        src={slide.foregroundImage}
                        alt=""
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                        draggable={false}
                        className="max-h-full max-w-none select-none object-contain object-bottom"
                        style={{ width: `${Math.min(150, Math.max(25, slideForegroundScale))}%` }}
                      />
                    </div>
                  ) : null}
                  <div
                    className={`pointer-events-none relative z-20 flex h-full flex-col justify-end px-[22px] md:px-8 ${align}`}
                    style={{
                      paddingLeft: `${Math.max(2, slideContentOffsetX)}%`,
                      paddingRight: `${Math.max(2, 100 - slideContentOffsetX - 88)}%`,
                      paddingBottom: `${Math.max(3, slideContentOffsetY)}%`,
                    }}
                  >
                    <div style={{ maxWidth: `${Math.max(280, slideContentWidth)}px` }}>
                      {slide.eyebrow ? (
                        <p
                          className={`section-kicker ${lightText ? "text-white/75" : "text-black/65"}`}
                        >
                          {slide.eyebrow}
                        </p>
                      ) : null}
                      <h1
                        className={`mt-3 leading-[0.92] ${fontClass(slideTitleFont)}`}
                        style={{
                          fontSize: `clamp(${Math.max(28, slideMobileTitleSize)}px, 7vw, ${Math.max(36, slideTitleSize)}px)`,
                        }}
                      >
                        {slide.title}
                      </h1>
                      {slide.body ? (
                        <p
                          className={`mt-4 max-w-lg text-sm leading-6 ${lightText ? "text-white/78" : "text-black/70"}`}
                        >
                          {slide.body}
                        </p>
                      ) : null}
                      {slide.buttonLabel ? (
                        <span
                          className={`mt-7 inline-flex h-11 items-center px-6 text-[11px] font-bold uppercase ${lightText ? "bg-white text-black" : "bg-black text-white"}`}
                        >
                          {slide.buttonLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>

      {safeSlides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous hero slide"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => goTo(active - 1)}
            className="absolute left-3 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronLeft size={23} />
          </button>
          <button
            type="button"
            aria-label="Next hero slide"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => goTo(active + 1)}
            className="absolute right-3 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronRight size={23} />
          </button>
          <div
            className="absolute bottom-4 right-5 z-30 flex items-center gap-2"
            aria-label="Choose hero slide"
          >
            {safeSlides.map((item, index) => (
              <button
                key={`${item.title}-${index}`}
                type="button"
                aria-label={`Show ${item.title || `slide ${index + 1}`}`}
                aria-current={active === index}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full bg-white shadow-sm transition-all ${active === index ? "w-8 opacity-100" : "w-3 opacity-55 hover:opacity-90"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export function HomepageCollectionBanners({
  eyebrow,
  title,
  cards,
  backgroundColor,
  titleFont,
  titleSize,
}: CollectionBannersProps & EditorAware) {
  return (
    <section className="px-[18px] py-14 md:px-8 md:py-20" style={{ backgroundColor }}>
      <div className="mx-auto max-w-[1120px]">
        <div className="text-center">
          {eyebrow ? <p className="section-kicker text-black/50">{eyebrow}</p> : null}
          <h2
            className={`mt-2 text-black ${fontClass(titleFont)}`}
            style={{ fontSize: `${titleSize}px`, lineHeight: 1 }}
          >
            {title}
          </h2>
        </div>
        <div className="mt-9 grid gap-4 md:mt-12 md:grid-cols-2">
          {(cards ?? []).slice(0, 6).map((card, index) => (
            <a
              key={`${card.title}-${index}`}
              href={safeLink(card.buttonUrl)}
              className="group relative min-h-[520px] overflow-hidden bg-black text-white md:min-h-[600px]"
            >
              {card.scene ? (
                <BannerSceneView scene={card.scene} interactive={false} />
              ) : card.image ? (
                <img
                  src={card.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                />
              ) : null}
              {card.scene ? null : (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              )}
              {card.scene ? null : (
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-9">
                  {card.eyebrow ? (
                    <p className="section-kicker text-white/72">{card.eyebrow}</p>
                  ) : null}
                  <h3
                    className={`mt-3 text-[42px] leading-none md:text-[60px] ${fontClass(titleFont)}`}
                  >
                    {card.title}
                  </h3>
                  {card.body ? (
                    <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">{card.body}</p>
                  ) : null}
                  {card.buttonLabel ? (
                    <span className="mt-7 inline-flex h-11 items-center bg-white px-5 text-[10px] font-bold uppercase text-black">
                      {card.buttonLabel}
                    </span>
                  ) : null}
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomepageProductGrid({
  eyebrow,
  title,
  collection,
  productLimit,
  showFilters,
  backgroundColor,
  titleFont,
  titleSize,
  columns,
}: ProductGridProps & EditorAware) {
  const { products } = useStoreProducts();
  const { taxonomy } = useCatalogPresentation();
  const [activeCollection, setActiveCollection] = useState(collection || "all");
  const collectionRows = useMemo(
    () => taxonomy.filter((item) => item.type === "collection" && item.is_active !== false),
    [taxonomy],
  );
  useEffect(() => setActiveCollection(collection || "all"), [collection]);
  const visible = merchandiseProducts(
    products.filter((product) => {
      if (normalized(activeCollection) === "all") return true;
      return (
        normalized(product.collectionSlug) === normalized(activeCollection) ||
        normalized(product.collection) === normalized(activeCollection)
      );
    }),
  ).slice(0, Math.min(48, Math.max(1, productLimit)));
  const desktopColumns =
    columns === "2" ? "md:grid-cols-2" : columns === "3" ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <section id="shop-all" className="px-[22px] py-16 md:px-8 md:py-24" style={{ backgroundColor }}>
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-end justify-between gap-6">
          <div>
            {eyebrow ? <p className="section-kicker text-black/50">{eyebrow}</p> : null}
            <h2
              className={`mt-2 text-black ${fontClass(titleFont)}`}
              style={{ fontSize: `${titleSize}px`, lineHeight: 1 }}
            >
              {title}
            </h2>
          </div>
          <p className="hidden text-xs text-black/50 md:block">{visible.length} products</p>
        </div>
        {showFilters === "yes" ? (
          <div
            className="no-scrollbar -mx-[22px] mt-7 flex gap-6 overflow-x-auto border-b border-black/10 px-[22px] md:mx-0 md:px-0"
            role="tablist"
            aria-label="Filter products"
          >
            {[{ slug: "all", name: "All" }, ...collectionRows].map((item) => (
              <button
                key={item.slug}
                type="button"
                role="tab"
                aria-selected={normalized(activeCollection) === normalized(item.slug)}
                onClick={() => setActiveCollection(item.slug)}
                className={`relative shrink-0 pb-3 text-[11px] font-bold uppercase ${normalized(activeCollection) === normalized(item.slug) ? "text-black" : "text-black/40"}`}
              >
                {item.name}
                {normalized(activeCollection) === normalized(item.slug) ? (
                  <span className="brand-mango-bg absolute inset-x-0 bottom-0 h-0.5" />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
        <div
          className={`mt-8 grid grid-cols-2 gap-x-3 gap-y-11 ${desktopColumns} md:gap-x-4 md:gap-y-14`}
        >
          {visible.map((product) => (
            <StoreProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomepageSplitEditorial({
  eyebrow,
  title,
  cards,
  backgroundColor,
  titleFont,
  titleSize,
}: SplitEditorialProps & EditorAware) {
  return (
    <section className="px-[18px] py-14 md:px-8 md:py-24" style={{ backgroundColor }}>
      <div className="mx-auto max-w-[1120px]">
        <div className="text-center">
          {eyebrow ? <p className="section-kicker text-black/50">{eyebrow}</p> : null}
          <h2
            className={`mt-2 text-black ${fontClass(titleFont)}`}
            style={{ fontSize: `${titleSize}px`, lineHeight: 1 }}
          >
            {title}
          </h2>
        </div>
        <div className="mt-9 grid gap-4 md:mt-12 md:grid-cols-2 md:gap-5">
          {(cards ?? []).slice(0, 4).map((card, index) => (
            <a
              key={`${card.title}-${index}`}
              href={safeLink(card.buttonUrl)}
              className="group relative min-h-[520px] overflow-hidden bg-black text-white md:min-h-[650px]"
            >
              {card.image ? (
                <img
                  src={card.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/18 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                {card.eyebrow ? (
                  <p className="section-kicker text-white/70">{card.eyebrow}</p>
                ) : null}
                <h3
                  className={`mt-3 text-[42px] leading-none md:text-[58px] ${fontClass(titleFont)}`}
                >
                  {card.title}
                </h3>
                {card.body ? (
                  <p className="mt-4 max-w-sm text-sm leading-6 text-white/74">{card.body}</p>
                ) : null}
                {card.buttonLabel ? (
                  <span className="mt-7 inline-flex h-11 items-center gap-2 bg-white px-5 text-[10px] font-bold uppercase text-black">
                    {card.buttonLabel}
                    <ChevronRight size={14} />
                  </span>
                ) : null}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomepageCollectionFeature({
  id,
  eyebrow,
  title,
  body,
  buttonLabel,
  buttonUrl,
  collection,
  image,
  backgroundColor,
  bannerColor,
  textTone,
  textAlign,
  titleFont,
  titleSize,
  mobileTitleSize,
  productLimit,
  layout,
  scene,
  editMode,
}: CollectionFeatureProps & EditorAware) {
  const { products } = useStoreProducts();
  const selected = merchandiseProducts(
    products.filter(
      (product) =>
        normalized(product.collectionSlug) === normalized(collection) ||
        normalized(product.collection) === normalized(collection),
    ),
  ).slice(0, Math.min(8, Math.max(1, productLimit)));
  if (!selected.length && !editMode) return null;
  const lightText = textTone === "light";
  const banner = (
    <a
      data-homepage-banner-id={id}
      href={safeLink(buttonUrl)}
      className={`group relative block min-h-[460px] overflow-hidden md:min-h-[620px] ${lightText ? "text-white" : "text-black"}`}
      style={{ backgroundColor: bannerColor }}
    >
      {scene ? (
        <BannerSceneView scene={scene} interactive={false} />
      ) : image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
        />
      ) : null}
      {scene ? null : (
        <div
          className={`absolute inset-0 bg-gradient-to-t ${lightText ? "from-black/80 via-black/15" : "from-white/85 via-white/15"} to-transparent`}
        />
      )}
      {scene ? null : (
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col p-6 md:p-9 ${textAlignClass(textAlign)}`}
        >
          {eyebrow ? (
            <p className={`section-kicker ${lightText ? "text-white/72" : "text-black/60"}`}>
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={`mt-2 leading-none ${fontClass(titleFont)}`}
            style={{ fontSize: `clamp(${mobileTitleSize}px, 6vw, ${titleSize}px)` }}
          >
            {title}
          </h2>
          {body ? (
            <p
              className={`mt-4 max-w-sm text-sm leading-6 ${lightText ? "text-white/75" : "text-black/70"}`}
            >
              {body}
            </p>
          ) : null}
          {buttonLabel ? (
            <span
              className={`mt-7 inline-flex h-11 items-center px-5 text-[10px] font-bold uppercase ${lightText ? "bg-white text-black" : "bg-black text-white"}`}
            >
              {buttonLabel}
            </span>
          ) : null}
        </div>
      )}
    </a>
  );
  const grid = selected.length ? (
    <div
      className={`grid grid-cols-2 gap-x-3 gap-y-10 ${layout === "banner-top" ? "md:grid-cols-4" : "md:grid-cols-2"} md:gap-x-4`}
    >
      {selected.map((product) => (
        <StoreProductCard key={product.slug} product={product} />
      ))}
    </div>
  ) : (
    <div className="grid min-h-60 place-items-center border border-dashed border-black/20 p-8 text-center text-sm text-black/50">
      No visible products match “{collection}”. Change the collection field or add products to it.
    </div>
  );
  return (
    <section className="px-[18px] py-14 md:px-8 md:py-20" style={{ backgroundColor }}>
      <div
        className={`mx-auto max-w-[1120px] ${layout === "banner-top" ? "space-y-10" : "grid gap-6 md:grid-cols-[0.9fr_1.1fr]"}`}
      >
        {layout === "banner-right" ? grid : banner}
        {layout === "banner-right" ? banner : grid}
      </div>
    </section>
  );
}

export function HomepagePromoBanner(props: PromoBannerProps & EditorAware) {
  const lightText = props.textTone === "light";
  return (
    <section className="bg-white px-[18px] py-10 md:px-8 md:py-16">
      <div
        data-homepage-banner-id={props.id}
        className={`relative mx-auto max-w-[1180px] overflow-hidden ${lightText ? "text-white" : "text-black"}`}
        style={{
          minHeight: `${Math.max(300, props.minHeight)}px`,
          backgroundColor: props.backgroundColor,
        }}
      >
        {props.scene ? (
          <BannerSceneView scene={props.scene} />
        ) : props.backgroundImage ? (
          <img
            src={props.backgroundImage}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: props.imageFocus }}
          />
        ) : null}
        {!props.scene && props.foregroundImage ? (
          <img
            src={props.foregroundImage}
            alt=""
            loading="lazy"
            className="pointer-events-none absolute bottom-0 right-0 z-10 max-h-full object-contain object-bottom"
            style={{ width: `${Math.min(100, Math.max(20, props.foregroundScale))}%` }}
          />
        ) : null}
        {!props.scene ? (
          <div
            className={`absolute inset-0 z-[11] ${lightText ? "bg-black" : "bg-white"}`}
            style={{ opacity: props.overlayOpacity / 100 }}
          />
        ) : null}
        {!props.scene ? (
          <div
            className={`relative z-20 flex min-h-[inherit] flex-col justify-end p-7 md:p-12 ${textAlignClass(props.textAlign)}`}
            style={{ minHeight: `${Math.max(300, props.minHeight)}px` }}
          >
            {props.eyebrow ? <p className="section-kicker opacity-65">{props.eyebrow}</p> : null}
            <h2
              className={`mt-3 leading-none ${fontClass(props.titleFont)}`}
              style={{ fontSize: `clamp(${props.mobileTitleSize}px, 6vw, ${props.titleSize}px)` }}
            >
              {props.title}
            </h2>
            {props.body ? (
              <p className="mt-4 max-w-lg text-sm leading-6 opacity-75">{props.body}</p>
            ) : null}
            {props.buttonLabel ? (
              <a
                href={safeLink(props.buttonUrl)}
                className={`mt-7 inline-flex h-11 items-center px-6 text-[11px] font-bold uppercase ${lightText ? "bg-white text-black" : "bg-black text-white"}`}
              >
                {props.buttonLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function HomepageTextSection({
  eyebrow,
  title,
  body,
  buttonLabel,
  buttonUrl,
  backgroundColor,
  textColor,
  textAlign,
  titleFont,
  titleSize,
  maxWidth,
}: TextSectionProps & EditorAware) {
  return (
    <section
      className="px-[22px] py-16 md:px-8 md:py-24"
      style={{ backgroundColor, color: textColor }}
    >
      <div
        className={`mx-auto flex flex-col ${textAlignClass(textAlign)}`}
        style={{ maxWidth: `${Math.max(320, maxWidth)}px` }}
      >
        {eyebrow ? <p className="section-kicker opacity-55">{eyebrow}</p> : null}
        <h2
          className={`mt-3 leading-none ${fontClass(titleFont)}`}
          style={{ fontSize: `${titleSize}px` }}
        >
          {title}
        </h2>
        {body ? (
          <p className="mt-5 whitespace-pre-line text-sm leading-7 opacity-70">{body}</p>
        ) : null}
        {buttonLabel ? (
          <a
            href={safeLink(buttonUrl)}
            className="mt-7 inline-flex h-11 items-center bg-current px-6 text-[11px] font-bold uppercase"
          >
            <span style={{ color: backgroundColor }}>{buttonLabel}</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function HomepageSpacer({
  height,
  mobileHeight,
  backgroundColor,
}: SpacerProps & EditorAware) {
  return (
    <div
      aria-hidden
      className="homepage-spacer"
      style={
        {
          "--spacer-mobile": `${mobileHeight}px`,
          "--spacer-desktop": `${height}px`,
          backgroundColor,
        } as React.CSSProperties
      }
    />
  );
}

export function HomepageFeatureStrip({
  items,
  backgroundColor,
  textColor,
  columns,
}: FeatureStripProps & EditorAware) {
  const desktopColumns =
    columns === "2" ? "md:grid-cols-2" : columns === "3" ? "md:grid-cols-3" : "md:grid-cols-4";
  return (
    <section
      className="border-y border-black/10 px-[22px] py-8 md:px-8 md:py-10"
      style={{ backgroundColor, color: textColor }}
    >
      <div className={`mx-auto grid max-w-[1180px] grid-cols-2 gap-x-5 gap-y-7 ${desktopColumns}`}>
        {(items ?? []).slice(0, 8).map((item, index) => (
          <div key={`${item.title}-${index}`} className="min-w-0">
            <span className="brand-mango-bg mb-3 block h-1 w-8" />
            <h3 className="text-[11px] font-bold uppercase">{item.title}</h3>
            {item.body ? <p className="mt-1.5 text-xs leading-5 opacity-65">{item.body}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomepageImageGallery({
  eyebrow,
  title,
  cards,
  backgroundColor,
  titleFont,
  titleSize,
  columns,
  imageRatio,
}: ImageGalleryProps & EditorAware) {
  const desktopColumns =
    columns === "2" ? "md:grid-cols-2" : columns === "3" ? "md:grid-cols-3" : "md:grid-cols-4";
  const ratio =
    imageRatio === "square"
      ? "aspect-square"
      : imageRatio === "landscape"
        ? "aspect-[4/3]"
        : "aspect-[3/4]";
  return (
    <section className="px-[22px] py-16 md:px-8 md:py-24" style={{ backgroundColor }}>
      <div className="mx-auto max-w-[1180px]">
        {eyebrow ? <p className="section-kicker text-black/50">{eyebrow}</p> : null}
        <h2
          className={`mt-2 leading-none ${fontClass(titleFont)}`}
          style={{ fontSize: `${titleSize}px` }}
        >
          {title}
        </h2>
        <div className={`mt-8 grid grid-cols-2 gap-3 md:mt-10 md:gap-4 ${desktopColumns}`}>
          {(cards ?? []).slice(0, 8).map((card, index) => (
            <a
              key={`${card.title}-${index}`}
              href={safeLink(card.buttonUrl)}
              className="group min-w-0"
            >
              <div className={`${ratio} overflow-hidden bg-[#F7F7F5]`}>
                {card.image ? (
                  <img
                    src={card.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                ) : null}
              </div>
              {card.eyebrow ? (
                <p className="section-kicker mt-3 text-black/45">{card.eyebrow}</p>
              ) : null}
              <h3 className="mt-1 text-sm font-bold uppercase">{card.title}</h3>
              {card.body ? (
                <p className="mt-1.5 text-xs leading-5 text-black/60">{card.body}</p>
              ) : null}
              {card.buttonLabel ? (
                <span className="mt-3 inline-flex border-b border-black pb-1 text-[10px] font-bold uppercase">
                  {card.buttonLabel}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

const renderers = {
  Hero: HomepageHero,
  CollectionBanners: HomepageCollectionBanners,
  ProductGrid: HomepageProductGrid,
  SplitEditorial: HomepageSplitEditorial,
  CollectionFeature: HomepageCollectionFeature,
  PromoBanner: HomepagePromoBanner,
  TextSection: HomepageTextSection,
  Spacer: HomepageSpacer,
  FeatureStrip: HomepageFeatureStrip,
  ImageGallery: HomepageImageGallery,
} as const;

export function HomepageRenderer({
  data,
  editMode = false,
}: {
  data: HomepageData;
  editMode?: boolean;
}) {
  const normalizedData = useMemo(() => normalizeHomepageData(data), [data]);
  return (
    <div style={{ backgroundColor: normalizedData.root?.props?.backgroundColor || "#ffffff" }}>
      {(normalizedData.content ?? []).map((item) => {
        const Renderer = renderers[item.type] as
          React.ComponentType<Record<string, unknown>> | undefined;
        if (!Renderer) return null;
        return <Renderer key={item.props.id} {...item.props} editMode={editMode} />;
      })}
    </div>
  );
}
