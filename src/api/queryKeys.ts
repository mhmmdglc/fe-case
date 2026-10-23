import type { PreviewRequest, ProductListParams } from "./types";

// Hierarchical keys: invalidating ["products"] covers list, detail and picker queries.
export const queryKeys = {
  products: ["products"] as const,
  productList: (params: ProductListParams) => ["products", "list", params] as const,
  productDetail: (id: string) => ["products", "detail", id] as const,
  productOptions: (q: string) => ["products", "options", q] as const,
  categories: ["categories"] as const,
  promotions: ["promotions"] as const,
  promotionList: ["promotions", "list"] as const,
  promotionDetail: (id: string) => ["promotions", "detail", id] as const,
  promotionPreview: (request: PreviewRequest) => ["promotions", "preview", request] as const,
};
