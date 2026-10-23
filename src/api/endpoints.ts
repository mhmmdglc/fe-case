import { apiRequest } from "./client";
import type {
  CreatePromotionRequest,
  PreviewRequest,
  PreviewResponse,
  ProductDetail,
  ProductListParams,
  ProductListResponse,
  PromotionListItem,
  PromotionWithStatus,
} from "./types";

export function buildProductListQuery(params: ProductListParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.promotionStatus !== "all") search.set("promotionStatus", params.promotionStatus);
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  return search.toString();
}

export const api = {
  getProducts: (params: ProductListParams, signal?: AbortSignal) =>
    apiRequest<ProductListResponse>(`/api/products?${buildProductListQuery(params)}`, { signal }),

  getProduct: (id: string, signal?: AbortSignal) =>
    apiRequest<ProductDetail>(`/api/products/${encodeURIComponent(id)}`, { signal }),

  getCategories: (signal?: AbortSignal) => apiRequest<string[]>("/api/categories", { signal }),

  getPromotion: (id: string, signal?: AbortSignal) =>
    apiRequest<PromotionWithStatus>(`/api/promotions/${encodeURIComponent(id)}`, { signal }),

  getPromotions: (signal?: AbortSignal) => apiRequest<PromotionListItem[]>("/api/promotions", { signal }),

  createPromotion: (body: CreatePromotionRequest) =>
    apiRequest<PromotionWithStatus>("/api/promotions", { method: "POST", body }),

  deletePromotion: (id: string) =>
    apiRequest<void>(`/api/promotions/${encodeURIComponent(id)}`, { method: "DELETE" }),

  previewPromotion: (body: PreviewRequest, signal?: AbortSignal) =>
    apiRequest<PreviewResponse>("/api/promotions/preview", { method: "POST", body, signal }),
};
