import { Alert, Space, Spin, Tag, Typography } from "antd";
import { useAppSelector } from "../../app/store";
import { PromotionStatusTag } from "../../components/common";
import { formatDiscount, todayUtc } from "../../domain/promotion";
import type { PromotionFormValues } from "../../domain/promotionForm";
import { datesOverlap, openPromotionsForProducts } from "../../domain/targeting";
import { useProductsInCategory } from "../products/queries";
import { usePromotionsQuery } from "./queries";

/**
 * Active and scheduled promotions already covering the chosen target, shown while the form
 * is filled in. For a category this includes promotions on single products of that category.
 */
export function TargetPromotions({ values }: { values: PromotionFormValues }) {
  const promotionsQuery = usePromotionsQuery();
  const { items, loaded } = useAppSelector((state) => state.promotions);
  const isCategory = values.targetType === "category";
  const categoryProducts = useProductsInCategory(isCategory ? values.targetCategory : null);

  const products = isCategory
    ? (categoryProducts.data?.products ?? [])
    : values.targetProducts.map((p) => ({ id: p.id, category: p.category }));
  const names = new Map<string, string>(
    isCategory
      ? (categoryProducts.data?.products ?? []).map((p) => [p.id, p.name])
      : values.targetProducts.map((p) => [p.id, p.label])
  );

  if (isCategory ? !values.targetCategory : values.targetProducts.length === 0) return null;

  if (promotionsQuery.isError || categoryProducts.isError) {
    return <Typography.Text type="secondary">Existing promotions for this target could not be loaded.</Typography.Text>;
  }
  if (!loaded || (isCategory && categoryProducts.isPending)) {
    return <Spin size="small" />;
  }

  const open = openPromotionsForProducts(items, products, todayUtc());
  const hasDates = Boolean(values.startDate && values.endDate && values.startDate < values.endDate);
  const newRange = { startDate: values.startDate ?? "", endDate: values.endDate ?? "" };

  if (open.length === 0) {
    return <Alert type="success" showIcon title="No active or scheduled promotions on this target." />;
  }

  return (
    <Alert
      type="info"
      showIcon
      title={`${open.length} active or scheduled promotion${open.length > 1 ? "s" : ""} already on this target`}
      description={
        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
          {open.map((promo) => {
            const wholeCategory = isCategory && promo.targetType === "category";
            const covered = promo.productIds.map((id) => names.get(id) ?? id);
            return (
              <div key={promo.id}>
                <Space size={6} wrap>
                  <Typography.Text strong>{promo.name}</Typography.Text>
                  <PromotionStatusTag status={promo.status} />
                  {hasDates && datesOverlap(promo, newRange) && <Tag color="red">Overlaps your dates</Tag>}
                </Space>
                <div className="target-promo-meta">
                  {formatDiscount(promo.discountType, promo.value)} · {promo.startDate} – {promo.endDate}
                </div>
                <div className="target-promo-meta">
                  {wholeCategory
                    ? "Applies to the whole category"
                    : `${isCategory ? "Single-product promotion on" : "Covers"}: ${covered.join(", ")}`}
                </div>
              </div>
            );
          })}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            A new promotion cannot overlap these dates on the same products. Pick dates outside them or
            change the target.
          </Typography.Text>
        </Space>
      }
    />
  );
}
