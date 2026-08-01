import { useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarClock,
  Check,
  ChevronRight,
  Plus,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Promotion, PromotionInput } from "@/services/adminService";
import type { Product } from "@/services/productService";
import { cn } from "@/lib/utils";

type PromotionDraft = PromotionInput & {
  id?: string;
  usedCount: number;
};

const inputClass =
  "h-10 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-sm outline-none transition focus:border-[#111827] focus:ring-1 focus:ring-[#111827]";
const labelClass = "mb-1.5 block text-xs font-medium text-[#4B5563]";

function blankPromotion(): PromotionDraft {
  return {
    name: "",
    code: "",
    type: "percent",
    value: 10,
    active: true,
    usage_limit: null,
    starts_at: null,
    ends_at: null,
    minimum_subtotal: null,
    maximum_discount: null,
    scope_type: "all",
    product_ids: [],
    storefront_enabled: false,
    storefront_title: null,
    storefront_message: null,
    storefront_badge: "OFFER",
    storefront_button_label: null,
    storefront_button_url: null,
    usedCount: 0,
  };
}

function promotionDraft(promotion: Promotion): PromotionDraft {
  return {
    id: promotion.id,
    name: promotion.name,
    code: promotion.code,
    type: promotion.type,
    value: promotion.value,
    active: promotion.active,
    usage_limit: promotion.usage_limit,
    starts_at: promotion.starts_at,
    ends_at: promotion.ends_at,
    minimum_subtotal: promotion.minimum_subtotal,
    maximum_discount: promotion.maximum_discount,
    scope_type: promotion.scope_type,
    product_ids: promotion.product_ids,
    storefront_enabled: promotion.storefront_enabled,
    storefront_title: promotion.storefront_title,
    storefront_message: promotion.storefront_message,
    storefront_badge: promotion.storefront_badge,
    storefront_button_label: promotion.storefront_button_label,
    storefront_button_url: promotion.storefront_button_url,
    usedCount: promotion.used_count,
  };
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function statusFor(promotion: Promotion) {
  const now = Date.now();
  if (!promotion.active) return { label: "Inactive", tone: "neutral" };
  if (promotion.starts_at && Date.parse(promotion.starts_at) > now)
    return { label: "Scheduled", tone: "scheduled" };
  if (promotion.ends_at && Date.parse(promotion.ends_at) <= now)
    return { label: "Ended", tone: "neutral" };
  if (promotion.usage_limit != null && promotion.used_count >= promotion.usage_limit)
    return { label: "Limit reached", tone: "neutral" };
  return { label: "Active", tone: "active" };
}

function discountLabel(promotion: Pick<Promotion, "type" | "value">) {
  return promotion.type === "percent"
    ? `${promotion.value}% off`
    : `INR ${promotion.value.toLocaleString("en-IN")} off`;
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium text-[#111827]">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-[#6B7280]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#111827]" : "bg-[#D1D5DB]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        >
          {checked ? <Check className="h-3 w-3 text-[#111827]" /> : null}
        </span>
      </button>
    </div>
  );
}

export function PromotionsPanel({
  promotions,
  products,
  onSave,
  onDelete,
}: {
  promotions: Promotion[];
  products: Product[];
  onSave: (input: PromotionInput, id?: string) => Promise<Promotion>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<PromotionDraft | null>(
    promotions[0] ? promotionDraft(promotions[0]) : null,
  );
  const [productQuery, setProductQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return products
      .filter((product) => product.is_active !== false)
      .filter(
        (product) =>
          !query ||
          product.name.toLowerCase().includes(query) ||
          String(product.category ?? "")
            .toLowerCase()
            .includes(query),
      );
  }, [productQuery, products]);

  const update = <Key extends keyof PromotionDraft>(key: Key, value: PromotionDraft[Key]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const toggleStorefront = (checked: boolean) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            active: checked ? true : current.active,
            storefront_enabled: checked,
            storefront_title:
              current.storefront_title || (checked ? "A special offer for you" : null),
            storefront_message: current.storefront_message,
            storefront_badge: current.storefront_badge || (checked ? "OFFER" : null),
            storefront_button_label: null,
            storefront_button_url: null,
          }
        : current,
    );

  const submit = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.code.trim()) {
      toast.error("Add a promotion name and checkout code.");
      return;
    }
    if (!Number.isFinite(draft.value) || draft.value <= 0) {
      toast.error("Enter a discount greater than zero.");
      return;
    }
    if (draft.type === "percent" && draft.value > 100) {
      toast.error("A percentage discount cannot exceed 100%.");
      return;
    }
    if (draft.scope_type === "products" && draft.product_ids.length === 0) {
      toast.error("Choose at least one eligible product.");
      return;
    }
    if (
      draft.starts_at &&
      draft.ends_at &&
      Date.parse(draft.ends_at) <= Date.parse(draft.starts_at)
    ) {
      toast.error("The end date must be after the start date.");
      return;
    }
    setSaving(true);
    try {
      const { id, usedCount: _usedCount, ...input } = draft;
      const saved = await onSave(
        {
          ...input,
          name: input.name.trim(),
          code: input.code.trim().toUpperCase(),
          storefront_title: input.storefront_title?.trim() || null,
          storefront_message: input.storefront_message?.trim() || null,
          storefront_badge: input.storefront_badge?.trim() || null,
          storefront_button_label: null,
          storefront_button_url: null,
        },
        id,
      );
      setDraft(promotionDraft(saved));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Promotion could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) return;
    if (!window.confirm(`Delete ${draft.code}? Customers will no longer be able to use this code.`))
      return;
    try {
      if (await onDelete(draft.id)) setDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Promotion could not be deleted.");
    }
  };

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Promotions</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Checkout discounts and the optional storefront offer popup.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(blankPromotion());
            setProductQuery("");
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#1F2937]"
        >
          <Plus className="h-4 w-4" />
          New promotion
        </button>
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-white lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-[#E5E7EB] bg-[#FAFAFA] lg:border-b-0 lg:border-r">
          <div className="border-b border-[#E5E7EB] px-4 py-3 text-xs font-medium text-[#6B7280]">
            {promotions.length} {promotions.length === 1 ? "promotion" : "promotions"}
          </div>
          <div className="max-h-[320px] overflow-y-auto lg:max-h-[700px]">
            {promotions.length ? (
              promotions.map((promotion) => {
                const status = statusFor(promotion);
                return (
                  <button
                    key={promotion.id}
                    type="button"
                    onClick={() => {
                      setDraft(promotionDraft(promotion));
                      setProductQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-[#E5E7EB] px-4 py-3.5 text-left transition",
                      draft?.id === promotion.id ? "bg-white" : "hover:bg-white/70",
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#F3F4F6] text-[#374151]">
                      <BadgePercent className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[#111827]">
                          {promotion.code}
                        </span>
                        {promotion.storefront_enabled ? (
                          <Store
                            className="h-3.5 w-3.5 shrink-0 text-[#B7791F]"
                            aria-label="Featured on storefront"
                          />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[#6B7280]">
                        {discountLabel(promotion)} / {status.label}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                  </button>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <BadgePercent className="mx-auto h-7 w-7 text-[#9CA3AF]" />
                <p className="mt-3 text-sm font-medium text-[#374151]">No promotions yet</p>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                  Create a checkout code when the store has an offer.
                </p>
              </div>
            )}
          </div>
        </aside>

        {draft ? (
          <div className="min-w-0">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111827]">
                  {draft.id ? draft.name || draft.code : "New promotion"}
                </p>
                {draft.id ? (
                  <p className="text-xs text-[#6B7280]">
                    Used {draft.usedCount}
                    {draft.usage_limit ? ` of ${draft.usage_limit}` : " times"}
                  </p>
                ) : (
                  <p className="text-xs text-[#6B7280]">
                    {discountLabel(draft)} /{" "}
                    {draft.scope_type === "all"
                      ? "all products"
                      : `${draft.product_ids.length} selected`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Close promotion editor"
                className="grid h-9 w-9 place-items-center rounded-md text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-8 px-4 py-6 sm:px-6">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Code and value</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className={labelClass}>Internal name</span>
                    <input
                      value={draft.name}
                      onChange={(event) => update("name", event.target.value)}
                      placeholder="Summer promotion"
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Checkout code</span>
                    <input
                      value={draft.code}
                      onChange={(event) =>
                        update("code", event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
                      }
                      placeholder="SUMMER20"
                      spellCheck={false}
                      className={cn(inputClass, "font-mono uppercase")}
                    />
                  </label>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <div>
                    <span className={labelClass}>Discount type</span>
                    <div className="grid h-10 grid-cols-2 rounded-md border border-[#D1D5DB] bg-[#F9FAFB] p-0.5">
                      {(["percent", "fixed"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => update("type", type)}
                          className={cn(
                            "rounded text-xs font-medium transition",
                            draft.type === type
                              ? "bg-white text-[#111827] shadow-sm"
                              : "text-[#6B7280]",
                          )}
                        >
                          {type === "percent" ? "Percentage" : "Fixed amount"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label>
                    <span className={labelClass}>
                      {draft.type === "percent" ? "Percentage off" : "Amount off (INR)"}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      max={draft.type === "percent" ? "100" : undefined}
                      step="0.01"
                      value={draft.value}
                      onChange={(event) => update("value", Number(event.target.value))}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] pt-7">
                <h3 className="text-sm font-semibold text-[#111827]">Eligible products</h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(["all", "products"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => update("scope_type", scope)}
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-md border px-3 text-left transition",
                        draft.scope_type === scope
                          ? "border-[#111827] bg-[#F9FAFB]"
                          : "border-[#D1D5DB] hover:border-[#9CA3AF]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                          draft.scope_type === scope
                            ? "border-[#111827] bg-[#111827]"
                            : "border-[#9CA3AF]",
                        )}
                      >
                        {draft.scope_type === scope ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        ) : null}
                      </span>
                      <span>
                        <span className="block text-sm font-medium">
                          {scope === "all" ? "All products" : "Selected products"}
                        </span>
                        <span className="block text-xs text-[#6B7280]">
                          {scope === "all"
                            ? "Discount the full product subtotal"
                            : "Discount only eligible items"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                {draft.scope_type === "products" ? (
                  <div className="mt-4 overflow-hidden rounded-md border border-[#D1D5DB]">
                    <div className="relative border-b border-[#E5E7EB]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                      <input
                        type="search"
                        value={productQuery}
                        onChange={(event) => setProductQuery(event.target.value)}
                        placeholder="Search products"
                        className="h-10 w-full bg-white pl-9 pr-3 text-sm outline-none"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {visibleProducts.map((product) => {
                        const selected = draft.product_ids.includes(product.id);
                        return (
                          <label
                            key={product.id}
                            className="flex cursor-pointer items-center gap-3 border-b border-[#F3F4F6] px-3 py-2.5 last:border-0 hover:bg-[#F9FAFB]"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                update(
                                  "product_ids",
                                  selected
                                    ? draft.product_ids.filter((id) => id !== product.id)
                                    : [...draft.product_ids, product.id],
                                )
                              }
                              className="h-4 w-4 rounded border-[#9CA3AF] accent-[#111827]"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
                            <span className="shrink-0 text-xs text-[#6B7280]">
                              INR {Number(product.price_inr ?? 0).toLocaleString("en-IN")}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-[#6B7280]">
                      {draft.product_ids.length} selected
                    </div>
                  </div>
                ) : null}
              </div>

              <details className="group border-t border-[#E5E7EB] pt-7">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#111827]">
                  Optional limits and schedule
                  <ChevronRight className="h-4 w-4 text-[#6B7280] transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                  Leave these empty for an unlimited promotion that starts immediately.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className={labelClass}>Minimum subtotal (INR)</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="No minimum"
                      value={draft.minimum_subtotal ?? ""}
                      onChange={(event) =>
                        update("minimum_subtotal", nullableNumber(event.target.value))
                      }
                      className={inputClass}
                    />
                  </label>
                  {draft.type === "percent" ? (
                    <label>
                      <span className={labelClass}>Maximum discount (INR)</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="No maximum"
                        value={draft.maximum_discount ?? ""}
                        onChange={(event) =>
                          update("maximum_discount", nullableNumber(event.target.value))
                        }
                        className={inputClass}
                      />
                    </label>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                  <label>
                    <span className={labelClass}>Total usage limit</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Unlimited"
                      value={draft.usage_limit ?? ""}
                      onChange={(event) =>
                        update("usage_limit", nullableNumber(event.target.value))
                      }
                      className={inputClass}
                    />
                  </label>
                  <div className="hidden sm:block" />
                  <label>
                    <span className={labelClass}>Starts</span>
                    <input
                      type="datetime-local"
                      value={toLocalDateTime(draft.starts_at)}
                      onChange={(event) => update("starts_at", toIsoDateTime(event.target.value))}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Ends</span>
                    <input
                      type="datetime-local"
                      value={toLocalDateTime(draft.ends_at)}
                      onChange={(event) => update("ends_at", toIsoDateTime(event.target.value))}
                      className={inputClass}
                    />
                  </label>
                </div>
              </details>

              <div className="border-t border-[#E5E7EB] pt-7">
                <Toggle
                  checked={draft.active}
                  onChange={(checked) => update("active", checked)}
                  label="Active at checkout"
                  description="Customers can use the code while its dates and limits allow it."
                />
              </div>

              <div className="border-t border-[#E5E7EB] pt-7">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#4B5563]" />
                  <h3 className="text-sm font-semibold text-[#111827]">Storefront offer</h3>
                </div>
                <div className="mt-4">
                  <Toggle
                    checked={draft.storefront_enabled}
                    onChange={toggleStorefront}
                    label="Show the corner offer"
                    description="Only one active promotion can be featured. Enabling this replaces the previous featured offer."
                  />
                </div>
                {draft.storefront_enabled ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className={labelClass}>Popup title</span>
                      <input
                        value={draft.storefront_title ?? ""}
                        onChange={(event) => update("storefront_title", event.target.value)}
                        placeholder="A special offer for you"
                        className={inputClass}
                      />
                    </label>
                    <label>
                      <span className={labelClass}>Corner label</span>
                      <input
                        value={draft.storefront_badge ?? ""}
                        onChange={(event) => update("storefront_badge", event.target.value)}
                        maxLength={18}
                        placeholder="OFFER"
                        className={inputClass}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className={labelClass}>Message</span>
                      <textarea
                        value={draft.storefront_message ?? ""}
                        onChange={(event) => update("storefront_message", event.target.value)}
                        rows={3}
                        placeholder="Tell customers what the promotion includes."
                        className="w-full resize-y rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#111827] focus:ring-1 focus:ring-[#111827]"
                      />
                    </label>
                    <div className="sm:col-span-2 border border-[#E5E7EB] bg-[#F7F7F5] p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[#6B7280]">
                        Storefront preview
                      </p>
                      <div className="brand-mango-bg p-4 text-white shadow-sm">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase text-white/75">
                            {draft.storefront_badge || "OFFER"}
                          </p>
                          <p className="mt-2 truncate text-base font-semibold text-white">
                            {draft.storefront_title || "A special offer for you"}
                          </p>
                          <p className="mt-1 truncate text-xs text-white/75">
                            {draft.storefront_message ||
                              "Tell customers what the promotion includes."}
                          </p>
                        </div>
                        <span className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded bg-white text-[10px] font-bold uppercase text-[#D75631]">
                          Copy code {draft.code || "YOURCODE"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#E5E7EB] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {draft.id ? (
                    <button
                      type="button"
                      onClick={() => void remove()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#111827] px-5 text-sm font-semibold text-white transition hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <CalendarClock className="h-4 w-4" />
                      Save promotion
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[420px] place-items-center px-6 text-center">
            <div>
              <BadgePercent className="mx-auto h-8 w-8 text-[#9CA3AF]" />
              <p className="mt-3 text-sm font-medium text-[#374151]">
                Select a promotion or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
