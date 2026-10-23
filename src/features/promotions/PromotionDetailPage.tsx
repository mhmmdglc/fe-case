import { Breadcrumb, Button, Card, Descriptions, Result, Skeleton, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  CategoryTag,
  CouponTag,
  PriceCell,
  ProductLink,
  PromotionLink,
  PromotionStatusTag,
  QueryErrorAlert,
} from "../../components/common";
import {
  computeEffectivePrice,
  DISCOUNT_TYPE_LABELS,
  formatDiscount,
  getPromotionStatus,
} from "../../domain/promotion";
import { useProductsByIds, useProductsInCategory } from "../products/queries";
import { usePromotion } from "./queries";

interface AffectedProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  basePrice: number;
  effectivePrice: number;
  activePromotion: { id: string; name: string } | null;
}

export function PromotionDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const promotion = usePromotion(id);
  const promo = promotion.data;

  // Affected products come from the API: a server-side category filter or the listed ids.
  const byCategory = useProductsInCategory(promo?.targetType === "category" ? (promo.targetCategory ?? null) : null);
  const byIds = useProductsByIds(promo?.targetType === "products" ? (promo.targetProductIds ?? []) : []);

  if (promotion.isPending) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (promotion.isError) {
    if (promotion.error instanceof ApiError && promotion.error.status === 404) {
      return (
        <Result
          status="404"
          title="Promotion not found"
          subTitle={`There is no promotion with id "${id}". It may have been deleted.`}
          extra={
            <Link to="/promotions">
              <Button type="primary">Back to promotions</Button>
            </Link>
          }
        />
      );
    }
    return <QueryErrorAlert error={promotion.error} onRetry={() => promotion.refetch()} />;
  }

  const p = promotion.data;
  const isCategory = p.targetType === "category";
  const productsLoading = isCategory ? byCategory.isPending : byIds.some((q) => q.isPending);
  const productsError = isCategory ? byCategory.isError : byIds.some((q) => q.isError);
  const products: AffectedProduct[] = isCategory
    ? (byCategory.data?.products ?? [])
    : byIds.flatMap((q) => (q.data ? [q.data] : []));

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
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Breadcrumb items={[{ title: <Link to="/promotions">Promotions</Link> }, { title: p.name }]} />

      <Space size={12} align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          {p.name}
        </Typography.Title>
        <PromotionStatusTag status={getPromotionStatus(p)} />
      </Space>

      <Card title="Promotion details">
        <Descriptions
          column={3}
          items={[
            { key: "type", label: "Discount type", children: DISCOUNT_TYPE_LABELS[p.discountType] },
            { key: "value", label: "Discount", children: formatDiscount(p.discountType, p.value) },
            {
              key: "coupon",
              label: "Coupon code",
              children: p.couponCode ? (
                <CouponTag code={p.couponCode} />
              ) : (
                <Typography.Text type="secondary">None</Typography.Text>
              ),
            },
            { key: "start", label: "Start date", children: p.startDate },
            { key: "end", label: "End date", children: p.endDate },
            {
              key: "target",
              label: "Applies to",
              children: isCategory && p.targetCategory ? (
                <Space size={4}>
                  Whole category <CategoryTag category={p.targetCategory} />
                </Space>
              ) : (
                `${p.targetProductIds?.length ?? 0} selected products`
              ),
            },
          ]}
        />
      </Card>

      <Card title={`Products covered (${productsLoading ? "…" : products.length})`}>
        {productsError && (
          <Typography.Text type="danger">Some products could not be loaded.</Typography.Text>
        )}
        <Table<AffectedProduct>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={products}
          loading={productsLoading}
          pagination={false}
          onRow={(product) => ({
            onClick: () => navigate(`/products/${encodeURIComponent(product.id)}`),
            className: "clickable-row",
          })}
        />
      </Card>
    </Space>
  );
}
