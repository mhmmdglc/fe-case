import { useEffect, useMemo, useState } from "react";
import { Button, Card, Empty, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import type { ProductListItem, PromotionStatusFilter } from "../../api/types";
import { useAppDispatch, useAppSelector } from "../../app/store";
import {
  CategoryTag,
  CouponTag,
  PriceCell,
  ProductLink,
  PromotionLink,
  QueryErrorAlert,
} from "../../components/common";
import { formatDiscount } from "../../domain/promotion";
import { nextScheduledPromotion } from "../../domain/targeting";
import type { StoredPromotion } from "../promotions/promotionsSlice";
import { usePromotionsQuery } from "../promotions/queries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  categoryChanged,
  filtersCleared,
  PAGE_SIZE,
  pageChanged,
  promotionStatusChanged,
  searchChanged,
} from "./filtersSlice";
import { useCategories, useProductList } from "./queries";
import styles from "./ProductListPage.module.scss";

const PROMOTION_STATUS_OPTIONS: { value: PromotionStatusFilter; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "on_promotion", label: "On promotion" },
  { value: "no_promotion", label: "No promotion" },
];

function buildColumns(promotions: StoredPromotion[]): ColumnsType<ProductListItem> {
  return [
    {
      title: "Product",
      dataIndex: "name",
      render: (name: string, product) => (
        <span className={styles.name}>
          <ProductLink id={product.id}>{name}</ProductLink>
        </span>
      ),
    },
    { title: "Category", dataIndex: "category", width: 140, render: (c: string) => <CategoryTag category={c} /> },
    { title: "SKU", dataIndex: "sku", width: 150, render: (sku: string) => <span className="mono">{sku}</span> },
    {
      title: "Base price",
      dataIndex: "basePrice",
      width: 140,
      align: "right",
      render: (_: number, p) => <PriceCell basePrice={p.basePrice} effectivePrice={p.basePrice} />,
    },
    {
      title: "Effective price",
      dataIndex: "effectivePrice",
      width: 200,
      align: "right",
      render: (_: number, p) => <PriceCell basePrice={p.basePrice} effectivePrice={p.effectivePrice} />,
    },
    {
      title: "Promotion",
      dataIndex: "activePromotion",
      width: 280,
      render: (_: unknown, product) => {
        const promo = product.activePromotion;
        if (promo) {
          // The list endpoint omits the coupon code; take it from the promotions in Redux.
          const coupon = promotions.find((p) => p.id === promo.id)?.couponCode;
          return (
            <Space orientation="vertical" size={2}>
              <Space size={4}>
                <Tag color="green">On promotion · {formatDiscount(promo.discountType, promo.value)}</Tag>
                {coupon && <CouponTag code={coupon} />}
              </Space>
              <span className={styles.promoName}>
                <PromotionLink id={promo.id}>{promo.name}</PromotionLink>
              </span>
            </Space>
          );
        }
        // Not on promotion today, but one may already be scheduled (it blocks overlapping new ones).
        const upcoming = nextScheduledPromotion(promotions, product);
        return (
          <Space orientation="vertical" size={2}>
            <Typography.Text type="secondary">No promotion today</Typography.Text>
            {upcoming && (
              <span className={styles.promoName}>
                Next: <PromotionLink id={upcoming.id}>{upcoming.name}</PromotionLink> · from {upcoming.startDate}
              </span>
            )}
          </Space>
        );
      },
    },
  ];
}

export function ProductListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const filters = useAppSelector((state) => state.productFilters);
  const products = useProductList(filters);
  const categories = useCategories();
  // Promotions (via Redux) only add the "scheduled" hint; the table itself never waits for them.
  usePromotionsQuery();
  const promotions = useAppSelector((state) => state.promotions.items);
  const columns = useMemo(() => buildColumns(promotions), [promotions]);

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
        <div className={styles.toolbar}>
          <Input.Search
            className={styles.search}
            placeholder="Search by product name"
            allowClear
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={(value) => dispatch(searchChanged(value))}
            aria-label="Search by product name"
          />
          <Select
            className={styles.select}
            value={filters.category}
            onChange={(value) => dispatch(categoryChanged(value))}
            loading={categories.isLoading}
            options={[
              { value: "", label: "All categories" },
              ...(categories.data ?? []).map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
            ]}
            aria-label="Filter by category"
          />
          <Select
            className={styles.select}
            value={filters.promotionStatus}
            onChange={(value) => dispatch(promotionStatusChanged(value))}
            options={PROMOTION_STATUS_OPTIONS}
            aria-label="Filter by promotion status"
          />
          {products.isPlaceholderData && <span className={styles.refreshing}>Updating results…</span>}
        </div>

        {categories.isError && (
          <Typography.Text type="danger">Categories could not be loaded. </Typography.Text>
        )}

        {products.isError && !data ? (
          <QueryErrorAlert error={products.error} onRetry={() => products.refetch()} />
        ) : (
          <Table<ProductListItem>
            rowKey="id"
            columns={columns}
            dataSource={data?.products ?? []}
            onRow={(product) => ({
              onClick: () => navigate(`/products/${product.id}`),
              className: "clickable-row",
            })}
            // Previous page stays visible while the next one loads, marked as loading.
            loading={products.isFetching}
            locale={{
              emptyText: products.isLoading ? " " : (
                <Empty description="No products match these filters">
                  <Button onClick={clearFilters}>Clear filters</Button>
                </Empty>
              ),
            }}
            pagination={{
              current: filters.page,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              showSizeChanger: false,
              showTotal: (total) => `${total} products`,
              onChange: (page) => dispatch(pageChanged(page)),
            }}
          />
        )}
      </Card>
    </Space>
  );
}
