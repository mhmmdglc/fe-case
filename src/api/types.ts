// Types mirror the actual responses of src/mocks/handlers.ts, not only the README.

export type DiscountType = "percentage_off" | "fixed_amount_off";
export type TargetType = "products" | "category";
export type PromotionStatus = "Active" | "Scheduled" | "Expired";
export type PromotionStatusFilter = "all" | "on_promotion" | "no_promotion";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  basePrice: number;
  stockQuantity: number;
}

export interface Promotion {
  id: string;
  name: string;
  discountType: DiscountType;
  value: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  couponCode?: string;
  targetType: TargetType;
  targetProductIds?: string[];
  targetCategory?: string;
}

/** API responses add a computed status; the app recomputes it with getPromotionStatus. */
export type PromotionWithStatus = Promotion & { status: PromotionStatus };

/** GET /api/promotions item. */
export type PromotionListItem = PromotionWithStatus & { affectedProductCount: number };

/** The short promotion object embedded in GET /api/products items. */
export type PromotionSummary = Pick<Promotion, "id" | "name" | "discountType" | "value">;

export interface ProductListItem extends Product {
  effectivePrice: number;
  activePromotion: PromotionSummary | null;
}

export interface ProductListResponse {
  products: ProductListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductListParams {
  q: string;
  category: string;
  promotionStatus: PromotionStatusFilter;
  page: number;
  limit: number;
}

export interface ProductDetail extends Product {
  effectivePrice: number;
  activePromotion: PromotionWithStatus | null;
  allPromotions: PromotionWithStatus[];
}

export type CreatePromotionRequest = Omit<Promotion, "id">;

export type PreviewRequest = Omit<CreatePromotionRequest, "name" | "couponCode">;

export interface PreviewItem {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  effectivePrice: number;
  discount: string;
}

export interface PreviewResponse {
  preview: PreviewItem[];
  conflicts: string[];
}
