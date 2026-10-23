import { Breadcrumb, Button, Card, Descriptions, Empty, Result, Skeleton, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import type { PromotionWithStatus } from "../../api/types";
import { CategoryTag, PriceCell, PromotionStatusTag, QueryErrorAlert } from "../../components/common";
import {
  computeEffectivePrice,
  DISCOUNT_TYPE_LABELS,
  formatDiscount,
  formatPrice,
  getProductPromotionStatus,
  getPromotionStatus,
  todayUtc,
} from "../../domain/promotion";
import { useProduct } from "./queries";
import styles from "./ProductDetailPage.module.scss";

export function ProductDetailPage() {
  const { id = "" } = useParams();
  const product = useProduct(id);

  if (product.isPending) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (product.isError) {
    if (product.error instanceof ApiError && product.error.status === 404) {
      return (
        <Result
          status="404"
          title="Product not found"
          subTitle={`There is no product with id "${id}".`}
          extra={
            <Link to="/products">
              <Button type="primary">Back to products</Button>
            </Link>
          }
        />
      );
    }
    return <QueryErrorAlert error={product.error} onRetry={() => product.refetch()} />;
  }

  const p = product.data;
  const today = todayUtc();
  const active = p.activePromotion;
  const productStatus = getProductPromotionStatus(p.allPromotions, today);
  const isDiscounted = p.effectivePrice !== p.basePrice;

  const historyColumns: ColumnsType<PromotionWithStatus> = [
    { title: "Promotion", dataIndex: "name" },
    {
      title: "Discount",
      width: 160,
      render: (_, promo) => formatDiscount(promo.discountType, promo.value),
    },
    {
      title: "Validity",
      width: 220,
      render: (_, promo) => `${promo.startDate} – ${promo.endDate}`,
    },
    {
      title: "Price with this promotion",
      width: 200,
      align: "right",
      render: (_, promo) => (
        <PriceCell basePrice={p.basePrice} effectivePrice={computeEffectivePrice(p.basePrice, promo)} />
      ),
    },
    {
      title: "Status",
      width: 120,
      render: (_, promo) => <PromotionStatusTag status={getPromotionStatus(promo, today)} />,
    },
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Breadcrumb items={[{ title: <Link to="/products">Products</Link> }, { title: p.name }]} />

      <Typography.Title level={3} style={{ margin: 0 }}>
        {p.name}
      </Typography.Title>

      <div className={styles.grid}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Card title="Product details">
            <Descriptions
              column={2}
              items={[
                { key: "name", label: "Name", children: p.name },
                { key: "sku", label: "SKU", children: <span className="mono">{p.sku}</span> },
                { key: "category", label: "Category", children: <CategoryTag category={p.category} /> },
                { key: "stock", label: "Stock quantity", children: p.stockQuantity },
                { key: "base", label: "Base price", children: formatPrice(p.basePrice) },
                { key: "effective", label: "Effective price", children: formatPrice(p.effectivePrice) },
                {
                  key: "status",
                  label: "Promotion status",
                  children: productStatus ? (
                    <PromotionStatusTag status={productStatus} />
                  ) : (
                    <Typography.Text type="secondary">No promotions</Typography.Text>
                  ),
                },
              ]}
            />
          </Card>

          <Card title="Active promotion">
            {active ? (
              <Descriptions
                column={2}
                items={[
                  { key: "name", label: "Name", children: active.name },
                  {
                    key: "status",
                    label: "Status",
                    children: <PromotionStatusTag status={getPromotionStatus(active, today)} />,
                  },
                  { key: "type", label: "Discount type", children: DISCOUNT_TYPE_LABELS[active.discountType] },
                  { key: "value", label: "Discount", children: formatDiscount(active.discountType, active.value) },
                  { key: "dates", label: "Valid", children: `${active.startDate} – ${active.endDate}` },
                  {
                    key: "coupon",
                    label: "Coupon code",
                    children: active.couponCode ? (
                      <Tag className="mono">{active.couponCode}</Tag>
                    ) : (
                      <Typography.Text type="secondary">None</Typography.Text>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No promotion is active for this product today. It sells at its base price."
              />
            )}
          </Card>

          <Card title="All promotions for this product">
            <Table<PromotionWithStatus>
              rowKey="id"
              size="small"
              columns={historyColumns}
              dataSource={p.allPromotions}
              pagination={false}
              locale={{ emptyText: "This product has never been on promotion." }}
            />
          </Card>
        </Space>

        <Card className={styles.priceCard}>
          <div className={styles.priceLabel}>Effective price</div>
          <div className={`${styles.effectivePrice} ${isDiscounted ? styles.discounted : ""}`}>
            {formatPrice(p.effectivePrice)}
          </div>
          {isDiscounted ? (
            <>
              <div className={styles.basePrice}>{formatPrice(p.basePrice)}</div>
              <Tag color="green" className={styles.saving}>
                You save {formatPrice(p.basePrice - p.effectivePrice)}
              </Tag>
            </>
          ) : (
            <Typography.Text type="secondary">Base price, no active discount</Typography.Text>
          )}
        </Card>
      </div>
    </Space>
  );
}
