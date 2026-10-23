// Public API of the promotions feature: the only entry point for other features and the app.

export { usePromotionsQuery } from "./hooks/usePromotionQueries";
export { default as promotionsReducer, type StoredPromotion } from "./store/promotionsSlice";

/** Page loaders for React.lazy in app/router.tsx; each page becomes its own chunk. */
export const promotionPages = {
  list: () => import("./pages/PromotionsPage").then((m) => ({ default: m.PromotionsPage })),
  detail: () => import("./pages/PromotionDetailPage").then((m) => ({ default: m.PromotionDetailPage })),
};
