import type { DiscountType, Promotion, PromotionStatus } from "@/services/types";

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

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole calendar days from `from` to `to` (YYYY-MM-DD, UTC); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / DAY_MS);
}

export type DeletionImpact =
  | { kind: "active"; daysLeft: number }
  | { kind: "scheduled"; daysUntilStart: number }
  | { kind: "expired"; daysSinceEnd: number };

/** What deleting a promotion changes today; daysLeft counts today, so it is 1 on the last day. */
export function deletionImpact(promo: DateRange, today: string = todayUtc()): DeletionImpact {
  const status = getPromotionStatus(promo, today);
  if (status === "Active") return { kind: "active", daysLeft: daysBetween(today, promo.endDate) + 1 };
  if (status === "Scheduled") return { kind: "scheduled", daysUntilStart: daysBetween(today, promo.startDate) };
  return { kind: "expired", daysSinceEnd: daysBetween(promo.endDate, today) };
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
