// Public API of the products feature: the only entry point for other features and the app.

export {
  useCategories,
  useProductOptions,
  useProductsByIds,
  useProductsInCategory,
} from "./hooks/useProductQueries";
export { default as productFiltersReducer } from "./store/filtersSlice";

/** Page loaders for React.lazy in app/router.tsx; each page becomes its own chunk. */
export const productPages = {
  list: () => import("./pages/ProductListPage").then((m) => ({ default: m.ProductListPage })),
  detail: () => import("./pages/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })),
};
