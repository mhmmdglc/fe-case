import { useState } from "react";
import { Breadcrumb, Button, Result, Skeleton, Space, Typography } from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProductsByIds, useProductsInCategory } from "@/features/products";
import { ApiError } from "@/services/http/httpClient";
import { PromotionStatusTag, QueryErrorAlert } from "@/shared/components";
import { routes } from "@/shared/routes";
import { getPromotionStatus } from "@/domain/promotion";
import { CoveredProductsTable, type AffectedProduct } from "../components/CoveredProductsTable";
import { DeletePromotionDialog } from "../components/DeletePromotionDialog";
import { PromotionDetailsCard } from "../components/PromotionDetailsCard";
import { PromotionFormDrawer } from "../components/PromotionFormDrawer";
import { usePromotion } from "../hooks/usePromotionQueries";

export function PromotionDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const promotion = usePromotion(id);
  const promo = promotion.data;
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
            <Link to={routes.promotions()}>
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

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Breadcrumb items={[{ title: <Link to={routes.promotions()}>Promotions</Link> }, { title: p.name }]} />

      <Space size={12} align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          {p.name}
        </Typography.Title>
        <PromotionStatusTag status={getPromotionStatus(p)} />
        <Button onClick={() => setDuplicateOpen(true)}>Duplicate</Button>
        <Button danger onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      </Space>

      <PromotionDetailsCard promotion={p} />

      <CoveredProductsTable
        promotion={p}
        products={products}
        loading={productsLoading}
        error={productsError}
        onProductClick={(product) => navigate(routes.product(product.id))}
      />

      <PromotionFormDrawer open={duplicateOpen} onClose={() => setDuplicateOpen(false)} source={p} />
      <DeletePromotionDialog
        promotion={p}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate(routes.promotions())}
      />
    </Space>
  );
}
