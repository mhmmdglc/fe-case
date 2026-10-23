import { Card, Descriptions, Typography } from "antd";
import type { ProductDetail, PromotionStatus } from "@/services/types";
import { CategoryTag, PromotionStatusTag } from "@/shared/components";
import { formatPrice } from "@/domain/promotion";

interface Props {
  product: ProductDetail;
  /** Derived from all of the product's promotions; null when it never had one. */
  promotionStatus: PromotionStatus | null;
}

export function ProductInfoCard({ product: p, promotionStatus }: Props) {
  return (
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
            children: promotionStatus ? (
              <PromotionStatusTag status={promotionStatus} />
            ) : (
              <Typography.Text type="secondary">No promotions</Typography.Text>
            ),
          },
        ]}
      />
    </Card>
  );
}
