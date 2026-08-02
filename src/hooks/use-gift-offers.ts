import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";
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
  const [offers, setOffers] = useState<GiftOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluationTime, setEvaluationTime] = useState(
    () => Math.floor(Date.now() / 300_000) * 300_000,
  );
  useEffect(() => {
    const timer = window.setInterval(
      () => setEvaluationTime(Math.floor(Date.now() / 300_000) * 300_000),
      300_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const cart = useMemo(
    () =>
      items.map((item) => ({
        product_id: item.productId || item.id.split("__")[0] || item.id,
        quantity: item.qty,
      })),
    [items],
  );

  useEffect(() => {
    if (!cart.length) {
      setOffers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void convex
      .query(api.gifts.evaluateCart, {
        cart,
        evaluation_time: evaluationTime,
        has_discount: hasDiscount,
      })
      .then((nextOffers) => {
        if (!cancelled) setOffers(nextOffers);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cart, evaluationTime, hasDiscount]);

  return {
    offers,
    earnedGifts: offers.filter((offer) => offer.earned),
    loading,
  };
}
