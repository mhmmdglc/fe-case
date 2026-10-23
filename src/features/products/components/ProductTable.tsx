import { useMemo } from "react";
import { Button, Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ProductListItem } from "@/services/types";
import { CategoryTag, PriceCell, ProductLink } from "@/shared/components";
import type { StoredPromotion } from "@/features/promotions";
import { ProductPromotionCell } from "./ProductPromotionCell";
import styles from "./ProductTable.module.scss";

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
      render: (_: unknown, product) => <ProductPromotionCell product={product} promotions={promotions} />,
    },
  ];
}

interface Props {
  products: ProductListItem[];
  /** Promotions from Redux; they only add the coupon and the "next scheduled" hint. */
  promotions: StoredPromotion[];
  /** Any request in flight, including the next page while the previous one stays visible. */
  fetching: boolean;
  /** First load, nothing to show yet. */
  initialLoading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onProductClick: (product: ProductListItem) => void;
  onClearFilters: () => void;
}

export function ProductTable({
  products,
  promotions,
  fetching,
  initialLoading,
  page,
  pageSize,
  total,
  onPageChange,
  onProductClick,
  onClearFilters,
}: Props) {
  const columns = useMemo(() => buildColumns(promotions), [promotions]);

  return (
    <Table<ProductListItem>
      rowKey="id"
      columns={columns}
      dataSource={products}
      onRow={(product) => ({
        onClick: () => onProductClick(product),
        className: "clickable-row",
      })}
      // Previous page stays visible while the next one loads, marked as loading.
      loading={fetching}
      locale={{
        emptyText: initialLoading ? " " : (
          <Empty description="No products match these filters">
            <Button onClick={onClearFilters}>Clear filters</Button>
          </Empty>
        ),
      }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        showTotal: (count) => `${count} products`,
        onChange: onPageChange,
      }}
    />
  );
}
