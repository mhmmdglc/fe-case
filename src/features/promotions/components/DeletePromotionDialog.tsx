import { Alert, App, Modal, Space, Spin, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Promotion } from "@/services/types";
import { ProductLink } from "@/shared/components";
import { errorMessage } from "@/shared/utils/errorMessage";
import { computeEffectivePrice, deletionImpact, formatPrice } from "@/domain/promotion";
import { useProductsByIds, useProductsInCategory } from "@/features/products";
import { useDeletePromotion } from "../hooks/usePromotionMutations";

interface Props {
  promotion: Promotion;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

/** Fields shared by category list items and product details. */
interface CoveredProduct {
  id: string;
  name: string;
  basePrice: number;
  effectivePrice: number;
  activePromotion: { id: string } | null;
}

const LISTED_PRODUCTS = 6;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Confirms a delete and states what it changes: today's prices, a planned discount, or nothing. */
export function DeletePromotionDialog({ promotion, open, onClose, onDeleted }: Props) {
  const { message } = App.useApp();
  const remove = useDeletePromotion();
  const isCategory = promotion.targetType === "category";
  const category = isCategory ? (promotion.targetCategory ?? null) : null;

  // Covered products are fetched only while the dialog is open.
  const byCategory = useProductsInCategory(open ? category : null);
  const byIds = useProductsByIds(open && !isCategory ? (promotion.targetProductIds ?? []) : []);
  const loading = isCategory ? Boolean(category) && byCategory.isPending : byIds.some((q) => q.isPending);
  const loadError = isCategory ? byCategory.isError : byIds.some((q) => q.isError);
  const products: CoveredProduct[] = isCategory
    ? (byCategory.data?.products ?? [])
    : byIds.flatMap((q) => (q.data ? [q.data] : []));

  const impact = deletionImpact(promotion);
  const n = products.length;

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(promotion.id);
      message.success(`"${promotion.name}" was deleted.`);
      onClose();
      onDeleted?.();
    } catch {
      // remove.error is shown inside the dialog, which stays open.
    }
  };

  const sentences: string[] = [];
  if (impact.kind === "active") {
    sentences.push(
      n === 1
        ? "1 product goes back to its base price immediately."
        : `${n} products go back to their base price immediately.`
    );
    sentences.push(
      impact.daysLeft === 1
        ? "It ends today anyway."
        : `It would end on ${promotion.endDate} anyway (${impact.daysLeft} days left, including today).`
    );
  } else if (impact.kind === "scheduled") {
    sentences.push(
      `It has not started yet: it starts on ${promotion.startDate} (in ${plural(impact.daysUntilStart, "day")}). Current prices do not change.`
    );
    sentences.push(`The planned discount on ${plural(n, "product")} is cancelled.`);
  } else {
    sentences.push(
      `It already ended on ${promotion.endDate} (${plural(impact.daysSinceEnd, "day")} ago). No prices change; only the record is removed.`
    );
  }
  if (promotion.couponCode && impact.kind !== "expired") {
    sentences.push(`Coupon code ${promotion.couponCode} stops working.`);
  }

  const columns: ColumnsType<CoveredProduct> = [
    {
      title: "Product",
      dataIndex: "name",
      render: (name: string, product) => <ProductLink id={product.id}>{name}</ProductLink>,
    },
    {
      title: "Price",
      align: "right",
      width: 220,
      render: (_, product) => {
        if (impact.kind === "scheduled") {
          return (
            <Space size={6}>
              <span className="price-old">
                {`Planned ${formatPrice(computeEffectivePrice(product.basePrice, promotion))}`}
              </span>
              {/* Today's price stays, which may come from another active promotion. */}
              <span>{`Stays ${formatPrice(product.effectivePrice)}`}</span>
            </Space>
          );
        }
        return product.activePromotion?.id === promotion.id
          ? `${formatPrice(product.effectivePrice)} → ${formatPrice(product.basePrice)}`
          : "No change";
      },
    },
  ];

  const rest = n - LISTED_PRODUCTS;

  return (
    <Modal
      title={`Delete "${promotion.name}"?`}
      open={open}
      okText="Delete promotion"
      cancelText="Cancel"
      okButtonProps={{ danger: true }}
      confirmLoading={remove.isPending}
      onOk={handleDelete}
      onCancel={onClose}
      afterClose={() => remove.reset()}
      width={600}
    >
      {loading ? (
        <Spin />
      ) : (
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          <Alert
            type={impact.kind === "active" ? "warning" : "info"}
            showIcon
            title={
              <Space orientation="vertical" size={4}>
                {sentences.map((sentence) => (
                  <div key={sentence}>{sentence}</div>
                ))}
              </Space>
            }
          />
          {loadError && <Typography.Text type="danger">Some products could not be loaded.</Typography.Text>}
          {impact.kind !== "expired" && n > 0 && (
            <>
              <Table<CoveredProduct>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={products.slice(0, LISTED_PRODUCTS)}
                pagination={false}
              />
              {rest > 0 && <Typography.Text type="secondary">{`and ${rest} more`}</Typography.Text>}
            </>
          )}
        </Space>
      )}
      {remove.isError && (
        <Alert type="error" showIcon style={{ marginTop: 12 }} title={errorMessage(remove.error)} />
      )}
    </Modal>
  );
}
