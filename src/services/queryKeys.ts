import type { PreviewRequest, ProductListParams } from "./types";

/*
 * One branch per feature; a new feature adds its own branch object below. Key values are
 * hierarchical: invalidating ["products"] covers list, detail and picker queries.
 * Branches are spread into one flat `queryKeys` object so call sites read queryKeys.productDetail(id).
 */
const productKeys = {
  products: ["products"] as const,
  productList: (params: ProductListParams) => ["products", "list", params] as const,
  productDetail: (id: string) => ["products", "detail", id] as const,
  productOptions: (q: string) => ["products", "options", q] as const,
};

const categoryKeys = {
  categories: ["categories"] as const,
};

const promotionKeys = {
  promotions: ["promotions"] as const,
  promotionList: ["promotions", "list"] as const,
  promotionDetail: (id: string) => ["promotions", "detail", id] as const,
  /** null: no valid request yet (the query is disabled). */
  promotionPreview: (request: PreviewRequest | null) => ["promotions", "preview", request] as const,
};

export const queryKeys = { ...productKeys, ...categoryKeys, ...promotionKeys };
