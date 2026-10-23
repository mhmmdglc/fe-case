import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { getCategories, getProduct, getProducts } from "@/services/products.service";
import { queryKeys } from "@/services/queryKeys";
import type { ProductListParams } from "@/services/types";
import { PAGE_SIZE, type ProductFiltersState } from "../store/filtersSlice";

/** Server-side search, filtering and pagination; every filter is part of the key. */
export function useProductList(filters: ProductFiltersState) {
  const params: ProductListParams = { ...filters, limit: PAGE_SIZE };
  return useQuery({
    queryKey: queryKeys.productList(params),
    queryFn: ({ signal }) => getProducts(params, signal),
    // Keep the previous page on screen while the next one loads (shown as loading).
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.productDetail(id),
    queryFn: ({ signal }) => getProduct(id, signal),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: Infinity,
  });
}

// Categories hold about 10 products; one server-side filtered page covers a whole category.
const CATEGORY_PAGE_LIMIT = 100;

/** Products of one category (server-side filter), used to show what a category target covers. */
export function useProductsInCategory(category: string | null) {
  const params: ProductListParams = {
    q: "",
    category: category ?? "",
    promotionStatus: "all",
    page: 1,
    limit: CATEGORY_PAGE_LIMIT,
  };
  return useQuery({
    queryKey: queryKeys.productList(params),
    queryFn: ({ signal }) => getProducts(params, signal),
    enabled: Boolean(category),
  });
}

/** Product details for a known list of ids (a promotion's specific products). */
export function useProductsByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.productDetail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getProduct(id, signal),
    })),
  });
}

/** Paged product search for the promotion target picker. */
export function useProductOptions(q: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.productOptions(q),
    queryFn: ({ pageParam, signal }) =>
      getProducts({ q, category: "", promotionStatus: "all", page: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    enabled,
  });
}
