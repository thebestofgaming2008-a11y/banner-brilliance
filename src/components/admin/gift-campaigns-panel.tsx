import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Gift,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type {
  AdminCategory,
  GiftCampaign,
  GiftCampaignInput,
  GiftRequirement,
} from "@/services/adminService";
import type { Product } from "@/services/productService";
import { cn } from "@/lib/utils";

type Draft = GiftCampaignInput & { id?: string; archived_at?: string | null };

const inputClass =
  "h-10 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-sm outline-none transition focus:border-[#111827] focus:ring-1 focus:ring-[#111827]";
const labelClass = "mb-1.5 block text-xs font-medium text-[#4B5563]";

function slug(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function blankRequirement(): GiftRequirement {
  return {
    label: "",
    scope_type: "collection",
    collection_slugs: [],
    category_ids: [],
    product_ids: [],
    required_quantity: 1,
  };
}

function blankCampaign(sortOrder: number): Draft {
  return {
    name: "",
    active: false,
    match_mode: "all",
    requirements: [blankRequirement()],
    gift_product_id: "",
    gift_quantity: 1,
    gift_color: null,
    gift_size: null,
    starts_at: null,
    ends_at: null,
    sort_order: sortOrder,
    priority: Math.max(1, 100 - sortOrder),
    combines_with_other_gifts: false,
    repeatable: false,
    max_awards_per_order: 1,
    allow_discount_codes: true,
    archived_at: null,
  };
}

function campaignDraft(campaign: GiftCampaign): Draft {
  return {
    id: campaign.id,
    name: campaign.name,
    active: campaign.active,
    match_mode: campaign.match_mode,
    requirements: campaign.requirements,
    gift_product_id: campaign.gift_product_id,
    gift_quantity: campaign.gift_quantity,
    gift_color: campaign.gift_color,
    gift_size: campaign.gift_size,
    starts_at: campaign.starts_at,
    ends_at: campaign.ends_at,
    sort_order: campaign.sort_order,
    priority: campaign.priority,
    combines_with_other_gifts: campaign.combines_with_other_gifts,
    repeatable: campaign.repeatable,
    max_awards_per_order: campaign.max_awards_per_order,
    allow_discount_codes: campaign.allow_discount_codes,
    archived_at: campaign.archived_at,
  };
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function statusFor(campaign: GiftCampaign) {
  const now = Date.now();
  if (campaign.archived_at) return "Archived";
  if (!campaign.active) return "Inactive";
  if (campaign.starts_at && Date.parse(campaign.starts_at) > now) return "Scheduled";
  if (campaign.ends_at && Date.parse(campaign.ends_at) <= now) return "Ended";
  return "Active";
}

function productOptions(product: Product, type: "color" | "size") {
  return type === "color" ? (product.color_options ?? []) : (product.size_options ?? []);
}

export function GiftCampaignsPanel({
  campaigns,
  products,
  categories,
  onSave,
  onDelete,
}: {
  campaigns: GiftCampaign[];
  products: Product[];
  categories: AdminCategory[];
  onSave: (input: GiftCampaignInput, id?: string) => Promise<GiftCampaign>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Draft | null>(
    campaigns[0] ? campaignDraft(campaigns[0]) : null,
  );
  const [productQuery, setProductQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active !== false),
    [products],
  );
  const collections = useMemo(
    () =>
      categories
        .filter((category) => category.type === "collection" && category.is_active !== false)
        .sort(
          (left, right) =>
            Number(left.sort_order ?? 999) - Number(right.sort_order ?? 999) ||
            left.name.localeCompare(right.name),
        )
        .map((category) => ({ id: category.id, value: slug(category.slug), label: category.name })),
    [categories],
  );
  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return activeProducts.filter(
      (product) =>
        !query ||
        product.name.toLowerCase().includes(query) ||
        String(product.category ?? "")
          .toLowerCase()
          .includes(query),
    );
  }, [activeProducts, productQuery]);
  const reward = activeProducts.find((product) => product.id === draft?.gift_product_id);
  const campaignSummary = useMemo(() => {
    if (!draft) return "";
    const requirements = draft.requirements.map((requirement) => {
      if (requirement.scope_type === "subtotal") {
        return `spend INR ${requirement.required_quantity.toLocaleString("en-IN")}`;
      }
      const fallback =
        requirement.scope_type === "collection" ? "selected collection" : "selected products";
      return `${requirement.required_quantity} from ${requirement.label || fallback}`;
    });
    const condition = requirements.join(draft.match_mode === "all" ? " and " : " or ");
    const giftName = reward?.name ?? "the selected gift";
    const repeat = draft.repeatable
      ? ` Repeats up to ${draft.max_awards_per_order} times per order.`
      : " Limited to one award per order.";
    const action = requirements.some((requirement) => requirement.startsWith("spend "))
      ? condition
      : `buy ${condition || "the qualifying products"}`;
    return `${action.charAt(0).toUpperCase()}${action.slice(1)} and receive ${draft.gift_quantity} x ${giftName}.${repeat}`;
  }, [draft, reward?.name]);
  const otherActiveCampaigns = useMemo(
    () =>
      draft?.active
        ? campaigns.filter(
            (campaign) => campaign.id !== draft.id && campaign.active && !campaign.archived_at,
          ).length
        : 0,
    [campaigns, draft?.active, draft?.id],
  );

  const updateRequirement = (index: number, patch: Partial<GiftRequirement>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            requirements: current.requirements.map((requirement, requirementIndex) =>
              requirementIndex === index ? { ...requirement, ...patch } : requirement,
            ),
          }
        : current,
    );
  };

  const submit = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error("Add a campaign name.");
    if (!draft.gift_product_id) return toast.error("Choose the free gift product.");
    if (
      draft.requirements.some(
        (requirement) =>
          requirement.required_quantity < 1 ||
          (requirement.scope_type === "collection" && !requirement.collection_slugs.length) ||
          (requirement.scope_type === "products" && !requirement.product_ids.length),
      )
    ) {
      return toast.error("Complete every qualifying requirement.");
    }
    if (
      draft.starts_at &&
      draft.ends_at &&
      Date.parse(draft.ends_at) <= Date.parse(draft.starts_at)
    )
      return toast.error("The end date must be after the start date.");

    setSaving(true);
    try {
      const { id, archived_at: _archivedAt, ...input } = draft;
      const saved = await onSave(
        {
          ...input,
          name: input.name.trim(),
          requirements: input.requirements.map((requirement) => ({
            ...requirement,
            label:
              requirement.label.trim() ||
              (requirement.scope_type === "collection"
                ? collections.find((item) => item.value === requirement.collection_slugs[0])
                    ?.label || "Selected collection"
                : requirement.scope_type === "products"
                  ? "Selected products"
                  : "Cart subtotal"),
          })),
        },
        id,
      );
      setDraft(campaignDraft(saved));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gift campaign could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (
      !draft?.id ||
      !window.confirm(
        `Archive ${draft.name}? It will stop immediately and remain available in campaign history.`,
      )
    )
      return;
    try {
      if (await onDelete(draft.id)) setDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gift campaign could not be archived.");
    }
  };

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-white lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="border-b border-[#E5E7EB] bg-[#FAFAFA] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] p-4">
          <div>
            <h2 className="text-sm font-semibold text-[#111827]">Free gift campaigns</h2>
            <p className="mt-0.5 text-xs text-[#6B7280]">{campaigns.length} configured</p>
          </div>
          <button
            type="button"
            aria-label="Create gift campaign"
            title="Create gift campaign"
            onClick={() => setDraft(blankCampaign(campaigns.length))}
            className="grid h-9 w-9 place-items-center rounded-md bg-[#111827] text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 lg:max-h-[calc(100vh-250px)]">
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              onClick={() => setDraft(campaignDraft(campaign))}
              className={cn(
                "mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left",
                draft?.id === campaign.id ? "bg-white shadow-sm" : "hover:bg-white/70",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  statusFor(campaign) === "Active" ? "bg-emerald-500" : "bg-[#9CA3AF]",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#111827]">
                  {campaign.name}
                </span>
                <span className="text-[11px] text-[#6B7280]">{statusFor(campaign)}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
            </button>
          ))}
          {!campaigns.length ? (
            <div className="px-3 py-10 text-center text-xs leading-5 text-[#6B7280]">
              No gift campaigns yet.
            </div>
          ) : null}
        </div>
      </aside>

      {draft ? (
        <div className="min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
            <div>
              <p className="text-[11px] font-medium uppercase text-[#6B7280]">
                {draft.id ? "Edit campaign" : "New campaign"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#111827]">
                {draft.name || "Untitled free gift"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {draft.id && !draft.archived_at ? (
                <button
                  type="button"
                  aria-label="Archive gift campaign"
                  title="Archive gift campaign"
                  onClick={() => void archive()}
                  className="grid h-10 w-10 place-items-center rounded-md border border-[#D1D5DB] text-[#991B1B]"
                >
                  <Archive className="h-4 w-4" />
                </button>
              ) : null}
              {!draft.archived_at ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void submit()}
                  className="h-10 rounded-md bg-[#111827] px-5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save campaign"}
                </button>
              ) : null}
            </div>
          </header>

          <fieldset
            disabled={Boolean(draft.archived_at)}
            className="space-y-7 p-5 disabled:opacity-70 md:p-6"
          >
            {draft.archived_at ? (
              <div className="rounded-md border border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#4B5563]">
                This campaign is archived and preserved for order history.
              </div>
            ) : null}
            <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_170px]">
              <label>
                <span className={labelClass}>Campaign name</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Buy 4 kufis, get a free gift"
                  className={inputClass}
                />
              </label>
              <div>
                <span className={labelClass}>Status</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.active}
                  onClick={() => setDraft({ ...draft, active: !draft.active })}
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm font-medium",
                    draft.active
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-[#D1D5DB] text-[#6B7280]",
                  )}
                >
                  {draft.active ? "Active" : "Inactive"}
                  <span
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full",
                      draft.active ? "bg-emerald-600 text-white" : "bg-[#E5E7EB]",
                    )}
                  >
                    {draft.active ? <Check className="h-3 w-3" /> : null}
                  </span>
                </button>
              </div>
            </section>

            <details className="group border-t border-[#E5E7EB] pt-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2">
                <span>
                  <span className="block text-sm font-semibold text-[#111827]">Advanced rules</span>
                  <span className="mt-1 block text-xs text-[#6B7280]">
                    Optional limits for overlapping offers, repeats, and discount codes.
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#6B7280] transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-5">
                <p className="text-xs text-[#6B7280]">
                  Higher priority offers are evaluated first when campaigns overlap.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <label>
                    <span className={labelClass}>Priority</span>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={draft.priority}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          priority: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Awards per order</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      disabled={!draft.repeatable}
                      value={draft.max_awards_per_order}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          max_awards_per_order: Math.min(
                            10,
                            Math.max(1, Number(event.target.value) || 1),
                          ),
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.repeatable}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        repeatable: !draft.repeatable,
                        max_awards_per_order: draft.repeatable ? 1 : draft.max_awards_per_order,
                      })
                    }
                    className="flex h-10 items-center justify-between self-end rounded-md border border-[#D1D5DB] px-3 text-left text-xs font-medium text-[#374151]"
                  >
                    Repeat when qualified
                    <span
                      className={cn(
                        "h-5 w-9 rounded-full p-0.5 transition-colors",
                        draft.repeatable ? "bg-emerald-600" : "bg-[#D1D5DB]",
                      )}
                    >
                      <span
                        className={cn(
                          "block h-4 w-4 rounded-full bg-white transition-transform",
                          draft.repeatable && "translate-x-4",
                        )}
                      />
                    </span>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.combines_with_other_gifts}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        combines_with_other_gifts: !draft.combines_with_other_gifts,
                      })
                    }
                    className="flex h-10 items-center justify-between self-end rounded-md border border-[#D1D5DB] px-3 text-left text-xs font-medium text-[#374151]"
                  >
                    Combine with gifts
                    <span
                      className={cn(
                        "h-5 w-9 rounded-full p-0.5 transition-colors",
                        draft.combines_with_other_gifts ? "bg-emerald-600" : "bg-[#D1D5DB]",
                      )}
                    >
                      <span
                        className={cn(
                          "block h-4 w-4 rounded-full bg-white transition-transform",
                          draft.combines_with_other_gifts && "translate-x-4",
                        )}
                      />
                    </span>
                  </button>
                </div>
                <label className="mt-4 flex items-center gap-3 text-xs text-[#374151]">
                  <input
                    type="checkbox"
                    checked={draft.allow_discount_codes}
                    onChange={(event) =>
                      setDraft({ ...draft, allow_discount_codes: event.target.checked })
                    }
                  />
                  Allow this gift to combine with discount codes
                </label>
                {otherActiveCampaigns ? (
                  <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {otherActiveCampaigns} other active gift campaign
                    {otherActiveCampaigns === 1 ? "" : "s"}. Priority and combination settings will
                    resolve overlapping orders safely.
                  </p>
                ) : null}
              </div>
            </details>

            <section className="border-t border-[#E5E7EB] pt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Customer must buy</h3>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Add one requirement for each product group in the offer.
                  </p>
                </div>
                <div className="inline-flex rounded-md border border-[#D1D5DB] p-0.5">
                  {(["all", "any"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDraft({ ...draft, match_mode: mode })}
                      className={cn(
                        "rounded px-3 py-1.5 text-xs font-medium",
                        draft.match_mode === mode ? "bg-[#111827] text-white" : "text-[#6B7280]",
                      )}
                    >
                      {mode === "all" ? "All requirements" : "Any requirement"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {draft.requirements.map((requirement, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4 md:grid-cols-[96px_150px_minmax(0,1fr)_40px]"
                  >
                    <label>
                      <span className={labelClass}>
                        {requirement.scope_type === "subtotal" ? "Minimum INR" : "Quantity"}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={requirement.scope_type === "subtotal" ? 10000000 : 99}
                        value={requirement.required_quantity}
                        onChange={(event) =>
                          updateRequirement(index, {
                            required_quantity: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label>
                      <span className={labelClass}>From</span>
                      <select
                        value={requirement.scope_type}
                        onChange={(event) =>
                          updateRequirement(index, {
                            scope_type: event.target.value as
                              "collection" | "products" | "subtotal",
                            collection_slugs: [],
                            category_ids: [],
                            product_ids: [],
                          })
                        }
                        className={inputClass}
                      >
                        <option value="collection">A collection</option>
                        <option value="products">Specific products</option>
                        <option value="subtotal">Cart subtotal</option>
                      </select>
                    </label>
                    {requirement.scope_type === "collection" ? (
                      <label>
                        <span className={labelClass}>Collection</span>
                        <select
                          value={requirement.collection_slugs[0] ?? ""}
                          onChange={(event) =>
                            updateRequirement(index, {
                              collection_slugs: event.target.value ? [event.target.value] : [],
                              category_ids: event.target.value
                                ? [
                                    collections.find((item) => item.value === event.target.value)
                                      ?.id ?? "",
                                  ].filter(Boolean)
                                : [],
                              label:
                                collections.find((item) => item.value === event.target.value)
                                  ?.label ?? "",
                            })
                          }
                          className={inputClass}
                        >
                          <option value="">Choose collection</option>
                          {collections.map((collection) => (
                            <option key={collection.value} value={collection.value}>
                              {collection.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : requirement.scope_type === "products" ? (
                      <div>
                        <span className={labelClass}>Products</span>
                        <details className="relative">
                          <summary
                            className={cn(inputClass, "flex cursor-pointer list-none items-center")}
                          >
                            {requirement.product_ids.length
                              ? `${requirement.product_ids.length} selected`
                              : "Choose products"}
                          </summary>
                          <div className="absolute z-20 mt-1 w-full rounded-md border border-[#D1D5DB] bg-white p-2 shadow-lg">
                            <label className="flex h-9 items-center gap-2 border-b border-[#E5E7EB] px-2">
                              <Search className="h-4 w-4 text-[#9CA3AF]" />
                              <input
                                value={productQuery}
                                onChange={(event) => setProductQuery(event.target.value)}
                                placeholder="Search products"
                                className="min-w-0 flex-1 text-sm outline-none"
                              />
                            </label>
                            <div className="max-h-52 overflow-y-auto py-1">
                              {visibleProducts.map((product) => {
                                const selected = requirement.product_ids.includes(product.id);
                                return (
                                  <label
                                    key={product.id}
                                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-[#F3F4F6]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() =>
                                        updateRequirement(index, {
                                          product_ids: selected
                                            ? requirement.product_ids.filter(
                                                (id) => id !== product.id,
                                              )
                                            : [...requirement.product_ids, product.id],
                                          label: "Selected products",
                                        })
                                      }
                                    />
                                    <span className="min-w-0 truncate">{product.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </details>
                      </div>
                    ) : (
                      <div className="flex h-10 items-center self-end rounded-md border border-[#E5E7EB] bg-white px-3 text-xs text-[#6B7280]">
                        Based on the server-verified INR subtotal
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove requirement ${index + 1}`}
                      title="Remove requirement"
                      disabled={draft.requirements.length === 1}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          requirements: draft.requirements.filter(
                            (_, requirementIndex) => requirementIndex !== index,
                          ),
                        })
                      }
                      className="mt-[22px] grid h-10 w-10 place-items-center rounded-md border border-[#D1D5DB] text-[#6B7280] disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={draft.requirements.length >= 6}
                onClick={() =>
                  setDraft({ ...draft, requirements: [...draft.requirements, blankRequirement()] })
                }
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-[#D1D5DB] px-3 text-xs font-medium disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Add requirement
              </button>
            </section>

            <section className="border-t border-[#E5E7EB] pt-6">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-[#C94D2B]" />
                <h3 className="text-sm font-semibold text-[#111827]">Free gift</h3>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="md:col-span-2">
                  <span className={labelClass}>Gift product</span>
                  <select
                    value={draft.gift_product_id}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        gift_product_id: event.target.value,
                        gift_color: null,
                        gift_size: null,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">Choose gift product</option>
                    {activeProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.stock_quantity ?? 0} in stock)
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Gift quantity</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={draft.gift_quantity}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        gift_quantity: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                    className={inputClass}
                  />
                </label>
                <div className="hidden lg:block" />
                {reward && productOptions(reward, "color").length ? (
                  <label>
                    <span className={labelClass}>Gift colour</span>
                    <select
                      value={draft.gift_color ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, gift_color: event.target.value || null })
                      }
                      className={inputClass}
                    >
                      <option value="">First available</option>
                      {productOptions(reward, "color").map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {reward && productOptions(reward, "size").length ? (
                  <label>
                    <span className={labelClass}>Gift size</span>
                    <select
                      value={draft.gift_size ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, gift_size: event.target.value || null })
                      }
                      className={inputClass}
                    >
                      <option value="">First available</option>
                      {productOptions(reward, "size").map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </section>

            <section className="border-t border-[#E5E7EB] pt-6">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[#6B7280]" />
                <h3 className="text-sm font-semibold text-[#111827]">Schedule</h3>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Starts</span>
                  <input
                    type="datetime-local"
                    value={toLocalDateTime(draft.starts_at)}
                    onChange={(event) =>
                      setDraft({ ...draft, starts_at: toIsoDateTime(event.target.value) })
                    }
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Ends</span>
                  <input
                    type="datetime-local"
                    value={toLocalDateTime(draft.ends_at)}
                    onChange={(event) =>
                      setDraft({ ...draft, ends_at: toIsoDateTime(event.target.value) })
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-md border border-[#D8DEE8] bg-[#F8FAFC] p-4">
              <p className="text-[10px] font-semibold uppercase text-[#64748B]">Customer offer</p>
              <p className="mt-2 text-sm leading-6 text-[#111827]">{campaignSummary}</p>
              {reward &&
              Number(reward.stock_quantity ?? 0) <
                draft.gift_quantity * (draft.repeatable ? draft.max_awards_per_order : 1) ? (
                <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Gift stock is below the maximum quantity this campaign could award in one order.
                </p>
              ) : null}
            </section>
          </fieldset>
        </div>
      ) : (
        <div className="grid min-h-[420px] place-items-center p-8 text-center">
          <div>
            <Gift className="mx-auto h-8 w-8 text-[#C94D2B]" />
            <h2 className="mt-4 text-lg font-semibold text-[#111827]">Create a free gift offer</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#6B7280]">
              Choose what customers buy, the gift they earn, and when the campaign runs.
            </p>
            <button
              type="button"
              onClick={() => setDraft(blankCampaign(campaigns.length))}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" /> New campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
