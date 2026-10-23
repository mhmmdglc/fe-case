import type { DiscountType, Promotion, PromotionStatus } from "../api/types";

/**
 * Today's date as YYYY-MM-DD in UTC. The mock API derives "today" the same way
 * (toISOString), so the UI and the API always agree on a promotion's status.
 */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

type DateRange = Pick<Promotion, "startDate" | "endDate">;

/** Status is derived from dates only; both start and end days are inclusive. */
export function getPromotionStatus(promo: DateRange, today: string = todayUtc()): PromotionStatus {
  if (today < promo.startDate) return "Scheduled";
  if (today > promo.endDate) return "Expired";
  return "Active";
}

type Discount = Pick<Promotion, "discountType" | "value">;

/** basePrice after the discount; never below 0 (a fixed discount may exceed the price). */
export function computeEffectivePrice(basePrice: number, promo: Discount | null): number {
  if (!promo) return basePrice;
  const discounted =
    promo.discountType === "percentage_off"
      ? basePrice * (1 - promo.value / 100)
      : basePrice - promo.value;
  return Math.max(0, discounted);
}

/**
 * Promotion status shown for a product: Active wins, then the nearest
 * upcoming (Scheduled), then Expired. null when no promotion ever targeted it.
 */
export function getProductPromotionStatus(
  promotions: DateRange[],
  today: string = todayUtc()
): PromotionStatus | null {
  const statuses = promotions.map((p) => getPromotionStatus(p, today));
  if (statuses.includes("Active")) return "Active";
  if (statuses.includes("Scheduled")) return "Scheduled";
  if (statuses.includes("Expired")) return "Expired";
  return null;
}

const priceFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

export function formatDiscount(discountType: DiscountType, value: number): string {
  return discountType === "percentage_off" ? `${value}% off` : `${formatPrice(value)} off`;
}

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percentage_off: "Percentage off",
  fixed_amount_off: "Fixed amount off",
};
