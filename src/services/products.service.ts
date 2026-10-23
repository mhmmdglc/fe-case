import { apiRequest } from "./http/httpClient";
import type { ProductDetail, ProductListParams, ProductListResponse } from "./types";

export function buildProductListQuery(params: ProductListParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.promotionStatus !== "all") search.set("promotionStatus", params.promotionStatus);
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  return search.toString();
}

export const getProducts = (params: ProductListParams, signal?: AbortSignal) =>
  apiRequest<ProductListResponse>(`/api/products?${buildProductListQuery(params)}`, { signal });

export const getProduct = (id: string, signal?: AbortSignal) =>
  apiRequest<ProductDetail>(`/api/products/${encodeURIComponent(id)}`, { signal });

export const getCategories = (signal?: AbortSignal) => apiRequest<string[]>("/api/categories", { signal });
