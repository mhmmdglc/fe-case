import { Card, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Promotion } from "@/services/types";
import { CategoryTag, PriceCell, ProductLink, PromotionLink } from "@/shared/components";
import { computeEffectivePrice } from "@/domain/promotion";

/** Fields shared by category list items and product details. */
export interface AffectedProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  basePrice: number;
  effectivePrice: number;
  activePromotion: { id: string; name: string } | null;
}

interface Props {
  promotion: Promotion;
  products: AffectedProduct[];
  loading: boolean;
  /** Some of the products could not be loaded. */
  error: boolean;
  onProductClick: (product: AffectedProduct) => void;
}

/** Products a promotion covers: the price it gives them and their price today. */
export function CoveredProductsTable({ promotion: p, products, loading, error, onProductClick }: Props) {
  const columns: ColumnsType<AffectedProduct> = [
    {
      title: "Product",
      dataIndex: "name",
      render: (name: string, product) => <ProductLink id={product.id}>{name}</ProductLink>,
    },
    { title: "SKU", dataIndex: "sku", width: 150, render: (sku: string) => <span className="mono">{sku}</span> },
    { title: "Category", dataIndex: "category", width: 130, render: (c: string) => <CategoryTag category={c} /> },
    {
      title: "Price with this promotion",
      width: 210,
      align: "right",
      render: (_, product) => (
        <PriceCell basePrice={product.basePrice} effectivePrice={computeEffectivePrice(product.basePrice, p)} />
      ),
    },
    {
      title: "Price today",
      width: 260,
      align: "right",
      render: (_, product) => (
        <Space orientation="vertical" size={0} style={{ alignItems: "flex-end" }}>
          <PriceCell basePrice={product.basePrice} effectivePrice={product.effectivePrice} />
          {product.activePromotion && product.activePromotion.id !== p.id && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              via <PromotionLink id={product.activePromotion.id}>{product.activePromotion.name}</PromotionLink>
            </Typography.Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title={`Products covered (${loading ? "…" : products.length})`}>
      {error && <Typography.Text type="danger">Some products could not be loaded.</Typography.Text>}
      <Table<AffectedProduct>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={products}
        loading={loading}
        pagination={false}
        onRow={(product) => ({
          onClick: () => onProductClick(product),
          className: "clickable-row",
        })}
      />
    </Card>
  );
}
