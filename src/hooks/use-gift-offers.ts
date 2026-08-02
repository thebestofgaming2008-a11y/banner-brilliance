import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "@/lib/cart";

export type GiftOffer = {
  id: string;
  name: string;
  active: boolean;
  match_mode: "all" | "any";
  earned: boolean;
  progress: number;
  gift_available: boolean;
  starts_at: string | null;
  ends_at: string | null;
  requirements: Array<{
    label: string;
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

export function useGiftOffers() {
  const { items } = useCart();
  const [evaluationTime, setEvaluationTime] = useState(
    () => Math.floor(Date.now() / 60_000) * 60_000,
  );
  useEffect(() => {
    const timer = window.setInterval(
      () => setEvaluationTime(Math.floor(Date.now() / 60_000) * 60_000),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const cart = items.map((item) => ({
    product_id: item.productId || item.id.split("__")[0] || item.id,
    quantity: item.qty,
  }));
  const offers = useQuery(api.gifts.evaluateCart, {
    cart,
    evaluation_time: evaluationTime,
  }) as GiftOffer[] | undefined;
  return {
    offers: offers ?? [],
    earnedGifts: (offers ?? []).filter((offer) => offer.earned),
    loading: offers === undefined,
  };
}
