import { Card, Tag, Typography } from "antd";
import { formatPrice } from "@/domain/promotion";
import styles from "./EffectivePriceCard.module.scss";

export function EffectivePriceCard({ basePrice, effectivePrice }: { basePrice: number; effectivePrice: number }) {
  const isDiscounted = effectivePrice !== basePrice;

  return (
    <Card className={styles.priceCard}>
      <div className={styles.priceLabel}>Effective price</div>
      <div className={`${styles.effectivePrice} ${isDiscounted ? styles.discounted : ""}`}>
        {formatPrice(effectivePrice)}
      </div>
      {isDiscounted ? (
        <>
          <div className={styles.basePrice}>{formatPrice(basePrice)}</div>
          <Tag color="green" className={styles.saving}>
            You save {formatPrice(basePrice - effectivePrice)}
          </Tag>
        </>
      ) : (
        <Typography.Text type="secondary">Base price, no active discount</Typography.Text>
      )}
    </Card>
  );
}
