import { Breadcrumb, Button, Result, Skeleton, Space, Typography } from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/services/http/httpClient";
import { QueryErrorAlert } from "@/shared/components";
import { routes } from "@/shared/routes";
import { getProductPromotionStatus, todayUtc } from "@/domain/promotion";
import { ActivePromotionCard } from "../components/ActivePromotionCard";
import { EffectivePriceCard } from "../components/EffectivePriceCard";
import { ProductInfoCard } from "../components/ProductInfoCard";
import { ProductPromotionsTable } from "../components/ProductPromotionsTable";
import { useProduct } from "../hooks/useProductQueries";
import styles from "./ProductDetailPage.module.scss";

export function ProductDetailPage() {
  const { id = "" } = useParams();
  const product = useProduct(id);
  const navigate = useNavigate();

  if (product.isPending) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (product.isError) {
    if (product.error instanceof ApiError && product.error.status === 404) {
      return (
        <Result
          status="404"
          title="Product not found"
          subTitle={`There is no product with id "${id}".`}
          extra={
            <Link to={routes.products()}>
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

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Breadcrumb items={[{ title: <Link to={routes.products()}>Products</Link> }, { title: p.name }]} />

      <Typography.Title level={3} style={{ margin: 0 }}>
        {p.name}
      </Typography.Title>

      <div className={styles.grid}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <ProductInfoCard product={p} promotionStatus={getProductPromotionStatus(p.allPromotions, today)} />
          <ActivePromotionCard promotion={p.activePromotion} today={today} />
          <ProductPromotionsTable
            basePrice={p.basePrice}
            promotions={p.allPromotions}
            today={today}
            onPromotionClick={(promo) => navigate(routes.promotion(promo.id))}
          />
        </Space>

        <EffectivePriceCard basePrice={p.basePrice} effectivePrice={p.effectivePrice} />
      </div>
    </Space>
  );
}
