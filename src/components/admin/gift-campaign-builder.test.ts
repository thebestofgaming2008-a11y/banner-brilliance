import { describe, expect, test } from "vitest";

import {
  blankGiftCampaign,
  giftCampaignSummary,
  validateGiftCampaign,
} from "./gift-campaign-builder";

describe("gift campaign builder", () => {
  test("explains incomplete setup in plain language", () => {
    const draft = blankGiftCampaign(1);
    const readiness = validateGiftCampaign(draft, null);

    expect(readiness.errors).toEqual([
      "Give the offer an internal name.",
      "Choose a collection.",
      "Choose the free gift product.",
    ]);
  });

  test("builds a customer-readable offer summary", () => {
    const draft = blankGiftCampaign(1);
    draft.name = "Kufi reward";
    draft.requirements = [
      {
        label: "Kufis",
        scope_type: "collection",
        collection_slugs: ["kufis"],
        category_ids: ["category-kufis"],
        product_ids: [],
        required_quantity: 4,
      },
    ];
    draft.gift_product_id = "gift-ittar";

    expect(giftCampaignSummary(draft, "White Ittar")).toBe(
      "Buy 4 items from Kufis and receive White Ittar free. The gift is awarded once per order.",
    );
    expect(validateGiftCampaign(draft, 10)).toEqual({ errors: [], warnings: [] });
  });

  test("prevents a live offer from promising unavailable stock", () => {
    const draft = blankGiftCampaign(1);
    draft.name = "Launch reward";
    draft.active = true;
    draft.requirements[0] = {
      label: "Cart total",
      scope_type: "subtotal",
      collection_slugs: [],
      category_ids: [],
      product_ids: [],
      required_quantity: 2000,
    };
    draft.gift_product_id = "gift-ittar";

    expect(validateGiftCampaign(draft, 0).errors).toContain(
      "Add gift stock before making this offer live.",
    );
  });

  test("warns when a repeating offer can exceed available stock", () => {
    const draft = blankGiftCampaign(1);
    draft.name = "Repeat reward";
    draft.requirements[0] = {
      label: "Kufis",
      scope_type: "collection",
      collection_slugs: ["kufis"],
      category_ids: ["category-kufis"],
      product_ids: [],
      required_quantity: 2,
    };
    draft.gift_product_id = "gift-ittar";
    draft.repeatable = true;
    draft.max_awards_per_order = 3;

    expect(validateGiftCampaign(draft, 2).warnings).toContain(
      "Stock is below the maximum this offer could give to one customer.",
    );
  });
});
