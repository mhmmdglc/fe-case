import { Card, Descriptions, Empty, Typography } from "antd";
import type { PromotionWithStatus } from "@/services/types";
import { CouponTag, PromotionLink, PromotionStatusTag } from "@/shared/components";
import { DISCOUNT_TYPE_LABELS, formatDiscount, getPromotionStatus } from "@/domain/promotion";

export function ActivePromotionCard({ promotion: active, today }: { promotion: PromotionWithStatus | null; today: string }) {
  return (
    <Card title="Active promotion">
      {active ? (
        <Descriptions
          column={2}
          items={[
            {
              key: "name",
              label: "Name",
              children: <PromotionLink id={active.id}>{active.name}</PromotionLink>,
            },
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
                <CouponTag code={active.couponCode} />
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
  );
}
