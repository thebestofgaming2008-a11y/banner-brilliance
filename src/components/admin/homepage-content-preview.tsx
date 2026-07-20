import type { StorefrontBanner } from "@/services/adminService";

export type HomepagePreviewProduct = {
  id: string;
  name: string;
  image?: string | null;
  price?: number | null;
};

type HomepagePreviewContent = Partial<StorefrontBanner> & {
  placement: string;
  title: string;
  image_url: string;
};

function imageFocusClass(position: string | null | undefined) {
  if (position === "top") return "object-top";
  if (position === "bottom") return "object-bottom";
  return "object-center";
}

function contentAlignmentClass(alignment: string | null | undefined) {
  if (alignment === "center") return "items-center text-center";
  if (alignment === "right") return "items-end text-right";
  return "items-start text-left";
}

function foregroundPositionStyle(position: string | null | undefined) {
  if (position === "left") return { left: "0", right: "auto" };
  if (position === "center") return { left: "50%", right: "auto", transform: "translateX(-50%)" };
  return { left: "auto", right: "0" };
}

export function HomepageContentPreview({
  content,
  products,
  viewport,
}: {
  content: HomepagePreviewContent;
  products: HomepagePreviewProduct[];
  viewport: "desktop" | "mobile";
}) {
  const lightBackground = content.text_theme === "light";
  const isCollection = content.placement === "homepage_collection";
  const isHero = content.placement === "homepage_hero";
  const overlayScale = Math.min(90, Math.max(25, Number(content.overlay_scale ?? 58)));
  const previewProducts = products.slice(0, Math.min(8, Math.max(2, content.product_limit ?? 4)));
  const mobile = viewport === "mobile";

  return (
    <div
      className={`mx-auto overflow-hidden border border-black/10 bg-white shadow-sm transition-all duration-300 ${
        mobile ? "w-[min(100%,390px)]" : "w-full"
      }`}
      aria-label={`${mobile ? "Mobile" : "Desktop"} homepage preview`}
    >
      <div
        className={`relative overflow-hidden ${
          isHero
            ? mobile
              ? "aspect-[390/620]"
              : "aspect-[16/7]"
            : mobile
              ? "aspect-[4/5]"
              : "aspect-[16/8]"
        }`}
        style={{ backgroundColor: content.background_color || "#F39A3B" }}
      >
        {content.image_url ? (
          <img
            src={content.image_url}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover ${imageFocusClass(content.image_position)}`}
          />
        ) : null}
        <div
          className={`absolute inset-0 ${
            lightBackground
              ? "bg-gradient-to-t from-white/80 via-white/10 to-transparent"
              : "bg-gradient-to-t from-black/75 via-black/10 to-transparent"
          }`}
        />
        {content.overlay_image_url ? (
          <img
            src={content.overlay_image_url}
            alt=""
            className="pointer-events-none absolute bottom-0 z-10 max-h-[95%] object-contain object-bottom"
            style={{
              width: `${overlayScale}%`,
              ...foregroundPositionStyle(content.overlay_position),
            }}
          />
        ) : null}
        <div
          className={`absolute inset-0 z-20 flex flex-col justify-end p-[6%] ${
            lightBackground ? "text-black" : "text-white"
          } ${contentAlignmentClass(content.content_alignment)}`}
        >
          <div className={`${mobile ? "max-w-[88%]" : "max-w-[52%]"}`}>
            {content.eyebrow ? (
              <p className="text-[8px] font-bold uppercase opacity-70 md:text-[10px]">
                {content.eyebrow}
              </p>
            ) : null}
            <p
              className={`mt-1 font-serif leading-[0.92] ${
                isHero
                  ? mobile
                    ? "text-[34px]"
                    : "text-[clamp(30px,5vw,68px)]"
                  : mobile
                    ? "text-[30px]"
                    : "text-[clamp(28px,4vw,58px)]"
              }`}
            >
              {content.title || "Your title"}
            </p>
            {content.body ? (
              <p className={`mt-2 leading-relaxed opacity-75 ${mobile ? "text-[9px]" : "text-xs"}`}>
                {content.body}
              </p>
            ) : null}
            {content.button_label ? (
              <span
                className={`mt-3 inline-flex items-center px-4 font-bold uppercase ${
                  mobile ? "h-8 text-[7px]" : "h-9 text-[9px]"
                } ${lightBackground ? "bg-black text-white" : "bg-white text-black"}`}
              >
                {content.button_label}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {isCollection ? (
        <div className={`grid gap-2 bg-white p-3 ${mobile ? "grid-cols-2" : "grid-cols-4"}`}>
          {previewProducts.length
            ? previewProducts.map((product) => (
                <div key={product.id} className="min-w-0">
                  <div className="aspect-[3/4] overflow-hidden bg-[#f4f1eb]">
                    {product.image ? (
                      <img src={product.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-[8px] font-semibold uppercase text-black">
                    {product.name}
                  </p>
                  {product.price != null ? (
                    <p className="text-[8px] text-black/50">Rs. {product.price.toLocaleString()}</p>
                  ) : null}
                </div>
              ))
            : Array.from({ length: mobile ? 2 : 4 }, (_, index) => (
                <div key={`placeholder-${index}`}>
                  <div className="aspect-[3/4] bg-black/5" />
                  <div className="mt-1 h-2 w-3/4 bg-black/10" />
                </div>
              ))}
        </div>
      ) : null}
    </div>
  );
}
