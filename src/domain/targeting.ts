import type { Product, Promotion, PromotionStatus } from "../api/types";
import { getPromotionStatus, todayUtc } from "./promotion";

type ProductRef = Pick<Product, "id" | "category">;
type Target = Pick<Promotion, "targetType" | "targetProductIds" | "targetCategory">;
type DateRange = Pick<Promotion, "startDate" | "endDate">;

/** Same targeting rule as the mock API: listed product ids, or every product of the category. */
export function promotionTargetsProduct(promo: Target, product: ProductRef): boolean {
  if (promo.targetType === "products") return promo.targetProductIds?.includes(product.id) ?? false;
  return promo.targetCategory === product.category;
}

/** Inclusive on both ends, like the API's conflict check. */
export function datesOverlap(a: DateRange, b: DateRange): boolean {
  return a.startDate <= b.endDate && a.endDate >= b.startDate;
}

export type OpenPromotion<P> = P & {
  status: Exclude<PromotionStatus, "Expired">;
  /** Which of the given products this promotion covers. */
  productIds: string[];
};

/**
 * Active and scheduled promotions covering any of the given products, earliest first.
 * Expired ones are left out: they can no longer conflict with a new promotion.
 */
export function openPromotionsForProducts<P extends Promotion>(
  promotions: P[],
  products: ProductRef[],
  today: string = todayUtc()
): OpenPromotion<P>[] {
  return promotions
    .flatMap((promo) => {
      const status = getPromotionStatus(promo, today);
      if (status === "Expired") return [];
      const productIds = products.filter((p) => promotionTargetsProduct(promo, p)).map((p) => p.id);
      return productIds.length > 0 ? [{ ...promo, status, productIds }] : [];
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** The earliest scheduled promotion for a product, or null. */
export function nextScheduledPromotion<P extends Promotion>(
  promotions: P[],
  product: ProductRef,
  today: string = todayUtc()
): OpenPromotion<P> | null {
  return openPromotionsForProducts(promotions, [product], today).find((p) => p.status === "Scheduled") ?? null;
}
