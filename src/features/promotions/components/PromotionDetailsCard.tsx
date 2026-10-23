import { Card, Descriptions, Space, Typography } from "antd";
import type { Promotion } from "@/services/types";
import { CategoryTag, CouponTag } from "@/shared/components";
import { DISCOUNT_TYPE_LABELS, formatDiscount } from "@/domain/promotion";

export function PromotionDetailsCard({ promotion: p }: { promotion: Promotion }) {
  const isCategory = p.targetType === "category";

  return (
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
  );
}
