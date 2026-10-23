import { Space, Tag, Typography } from "antd";
import type { ProductListItem } from "@/services/types";
import { CouponTag, PromotionLink } from "@/shared/components";
import { formatDiscount } from "@/domain/promotion";
import { nextScheduledPromotion } from "@/domain/targeting";
import type { StoredPromotion } from "@/features/promotions";
import styles from "./ProductTable.module.scss";

/** The list's "Promotion" column: today's promotion, or the next scheduled one. */
export function ProductPromotionCell({
  product,
  promotions,
}: {
  product: ProductListItem;
  promotions: StoredPromotion[];
}) {
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
}
