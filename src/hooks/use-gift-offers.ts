import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "@/lib/cart";

export type GiftOffer = {
  id: string;
  name: string;
  match_mode: "all" | "any";
  earned: boolean;
  eligible: boolean;
  progress: number;
  award_count: number;
  gift_available: boolean;
  blocked_reason: string | null;
  requirements: Array<{
    label: string;
    scope_type: "collection" | "products" | "subtotal";
    required_quantity: number;
    current_quantity: number;
    complete: boolean;
  }>;
  gift: {
    id: string;
    name: string;
    slug: string | null;
    image: string | null;
    quantity: number;
    color: string | null;
    size: string | null;
  };
};

export function useGiftOffers(hasDiscount = false) {
  const { items } = useCart();
  const [evaluationTime, setEvaluationTime] = useState(() => Date.now());

  const cart = useMemo(
    () =>
      items.map((item) => ({
        product_id: item.productId || item.id.split("__")[0] || item.id,
        quantity: item.qty,
      })),
    [items],
  );

  const result = useQuery(api.gifts.evaluateStorefront, {
    cart,
    evaluation_time: evaluationTime,
    has_discount: hasDiscount,
  });

  useEffect(() => {
    if (!result?.next_change_at) return;
    const delay = Math.min(2_147_000_000, Math.max(250, result.next_change_at - Date.now() + 250));
    const timer = window.setTimeout(() => setEvaluationTime(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [result?.next_change_at]);

  const offers = (result?.offers ?? []) as GiftOffer[];

  return {
    offers,
    earnedGifts: offers.filter((offer) => offer.earned),
    loading: result === undefined,
  };
}
