import { useMemo, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isPreOrderProduct, type StoreProduct } from "@/data/store";
import { useCurrency } from "@/hooks/use-currency";
import { useCart } from "@/lib/cart";
import { ProductGiftCue } from "@/components/store/product-gift-cue";

function productIsAvailable(product: StoreProduct) {
  return product.inStock !== false && Number(product.stockQuantity ?? 1) > 0;
}

function defaultSelections(product: StoreProduct) {
  return Object.fromEntries(
    (product.optionGroups ?? [])
      .filter((group) => group.values.length > 0)
      .map((group) => [group.name, group.values[0]]),
  );
}

export function ProductQuickAdd({
  product,
  interactive = true,
}: {
  product: StoreProduct;
  interactive?: boolean;
}) {
  const { add, isReady } = useCart();
  const { formatPrice } = useCurrency();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    defaultSelections(product),
  );
  const groups = useMemo(
    () => (product.optionGroups ?? []).filter((group) => group.values.length > 0),
    [product.optionGroups],
  );
  const requiresChoice = groups.some((group) => group.values.length > 1);
  const available = productIsAvailable(product);
  const preOrder = isPreOrderProduct(product);
  const connected = Boolean(product.id && product.id !== product.slug);
  const canAdd = interactive && isReady && available && connected;

  const addSelectedProduct = () => {
    if (!connected) {
      toast.error("This product is not connected to the live catalog yet.");
      return;
    }
    if (!available) {
      toast.error("This product is currently sold out.");
      return;
    }

    const variant = groups
      .map((group) => selected[group.name])
      .filter(Boolean)
      .join(" / ");
    setOpen(false);
    add({
      id: `${product.slug}__${variant || "default"}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variant,
      price: product.price,
      img: product.images[0] ?? "",
    });
    setAdded(true);
    toast.success(
      preOrder ? `${product.name} added to your pre-order` : `${product.name} added to cart`,
    );
    window.setTimeout(() => setAdded(false), 1800);
  };

  const startQuickAdd = () => {
    if (!canAdd) return;
    if (requiresChoice) setOpen(true);
    else addSelectedProduct();
  };

  const label = !available
    ? "Sold out"
    : !connected
      ? "Unavailable"
      : added
        ? "Added"
        : preOrder
          ? "Pre order"
          : "Add";

  return (
    <>
      <ProductGiftCue product={product} />
      <button
        type="button"
        onClick={startQuickAdd}
        disabled={!canAdd}
        aria-label={`${requiresChoice && available ? `Choose options to ${preOrder ? "pre order" : "add"}` : label}: ${product.name}`}
        tabIndex={interactive ? undefined : -1}
        className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md px-3 text-[10px] font-bold uppercase transition-[color,background-color,border-color,filter,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9643C] ${
          available && connected
            ? "brand-mango-bg text-white hover:-translate-y-0.5 hover:brightness-[0.98] active:scale-[0.97] active:translate-y-0 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60"
            : "cursor-not-allowed border border-black/10 bg-[#EFEFED] text-black/45"
        } ${added ? "product-add-success" : ""}`}
      >
        {added ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <ShoppingBag size={14} aria-hidden="true" />
        )}
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[420px] gap-0 overflow-hidden rounded-md border-black/10 bg-white p-0 text-black shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
          <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 border-b border-black/10 p-5 pr-12">
            <div className="aspect-[3/4] overflow-hidden rounded-md bg-[#F7F7F5]">
              <img
                src={product.images[0]}
                alt=""
                className={`h-full w-full ${product.mediaFit === "contain" ? "object-contain p-2" : "object-cover"}`}
                style={{ objectPosition: product.mediaPosition ?? "center" }}
              />
            </div>
            <div className="min-w-0 self-center">
              <p className="section-kicker text-black/50">Quick add</p>
              <DialogTitle className="product-name mt-2 text-[18px] leading-5">
                {product.name}
              </DialogTitle>
              <DialogDescription className="mt-2 text-[13px] font-semibold text-black">
                {formatPrice(product.price)}
              </DialogDescription>
            </div>
          </div>

          <div className="max-h-[52vh] overflow-y-auto p-5">
            {groups.map((group) => (
              <fieldset key={group.name} className="mb-5 last:mb-0">
                <legend className="text-[10px] font-bold uppercase">
                  {group.values.length > 1 ? `Select ${group.name.toLowerCase()}` : group.name}
                </legend>
                {group.values.length === 1 ? (
                  <p className="mt-2 text-[13px] text-black/65">{group.values[0]}</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.values.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setSelected((current) => ({ ...current, [group.name]: value }))
                        }
                        aria-pressed={selected[group.name] === value}
                        className={`min-h-10 rounded-md border px-4 text-[11px] font-semibold transition-colors ${
                          selected[group.name] === value
                            ? "border-black bg-black text-white"
                            : "border-black/20 bg-white hover:border-[#D9643C]"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
            ))}
          </div>

          <div className="border-t border-black/10 p-5">
            <button
              type="button"
              onClick={addSelectedProduct}
              className="brand-mango-bg flex h-12 w-full items-center justify-center gap-2 rounded-md text-[11px] font-bold uppercase text-white transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-[0.98] active:translate-y-0"
            >
              <ShoppingBag size={15} aria-hidden="true" />
              {preOrder ? "Pre order" : "Add"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
