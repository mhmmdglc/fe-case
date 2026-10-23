import { useEffect, useState } from "react";
import { Card, Space, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { usePromotionsQuery } from "@/features/promotions";
import { QueryErrorAlert } from "@/shared/components";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { routes } from "@/shared/routes";
import { ProductFilters } from "../components/ProductFilters";
import { ProductTable } from "../components/ProductTable";
import { useCategories, useProductList } from "../hooks/useProductQueries";
import {
  categoryChanged,
  filtersCleared,
  PAGE_SIZE,
  pageChanged,
  promotionStatusChanged,
  searchChanged,
} from "../store/filtersSlice";

export function ProductListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const filters = useAppSelector((state) => state.productFilters);
  const products = useProductList(filters);
  const categories = useCategories();
  // Promotions (via Redux) only add the "scheduled" hint; the table itself never waits for them.
  usePromotionsQuery();
  const promotions = useAppSelector((state) => state.promotions.items);

  // The input is local; Redux receives the debounced search term.
  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  useEffect(() => {
    dispatch(searchChanged(debouncedSearch));
  }, [debouncedSearch, dispatch]);

  const clearFilters = () => {
    setSearchInput("");
    dispatch(filtersCleared());
  };

  const data = products.data;

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Products
      </Typography.Title>

      <Card>
        <ProductFilters
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearch={(value) => dispatch(searchChanged(value))}
          category={filters.category}
          onCategoryChange={(value) => dispatch(categoryChanged(value))}
          categories={categories.data ?? []}
          categoriesLoading={categories.isLoading}
          categoriesError={categories.isError}
          promotionStatus={filters.promotionStatus}
          onPromotionStatusChange={(value) => dispatch(promotionStatusChanged(value))}
          refreshing={products.isPlaceholderData}
        />

        {products.isError && !data ? (
          <QueryErrorAlert error={products.error} onRetry={() => products.refetch()} />
        ) : (
          <ProductTable
            products={data?.products ?? []}
            promotions={promotions}
            fetching={products.isFetching}
            initialLoading={products.isLoading}
            page={filters.page}
            pageSize={PAGE_SIZE}
            total={data?.total ?? 0}
            onPageChange={(page) => dispatch(pageChanged(page))}
            onProductClick={(product) => navigate(routes.product(product.id))}
            onClearFilters={clearFilters}
          />
        )}
      </Card>
    </Space>
  );
}
