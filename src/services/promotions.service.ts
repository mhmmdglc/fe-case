import { apiRequest } from "./http/httpClient";
import type {
  CreatePromotionRequest,
  PreviewRequest,
  PreviewResponse,
  PromotionListItem,
  PromotionWithStatus,
} from "./types";

export const getPromotion = (id: string, signal?: AbortSignal) =>
  apiRequest<PromotionWithStatus>(`/api/promotions/${encodeURIComponent(id)}`, { signal });

export const getPromotions = (signal?: AbortSignal) => apiRequest<PromotionListItem[]>("/api/promotions", { signal });

export const createPromotion = (body: CreatePromotionRequest) =>
  apiRequest<PromotionWithStatus>("/api/promotions", { method: "POST", body });

export const deletePromotion = (id: string) =>
  apiRequest<void>(`/api/promotions/${encodeURIComponent(id)}`, { method: "DELETE" });

export const previewPromotion = (body: PreviewRequest, signal?: AbortSignal) =>
  apiRequest<PreviewResponse>("/api/promotions/preview", { method: "POST", body, signal });
