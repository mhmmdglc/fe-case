import { Alert, App, Drawer, Spin } from "antd";
import type { Promotion } from "@/services/types";
import { formValuesFromPromotion } from "@/domain/promotionForm";
import { useProductsByIds } from "@/features/products";
import { PromotionForm } from "./PromotionForm";
import { PromotionPreview } from "./PromotionPreview";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Promotion to duplicate; the form opens prefilled with a copy of it. */
  source?: Promotion | null;
}

/** Create form with live preview. The API has no update, so "Duplicate" is the way to reuse one. */
export function PromotionFormDrawer({ open, onClose, source }: Props) {
  const { message } = App.useApp();
  // Product tags need names and categories; a category target needs nothing extra.
  const productIds = source?.targetType === "products" ? (source.targetProductIds ?? []) : [];
  const products = useProductsByIds(open ? productIds : []);
  const loading = products.some((q) => q.isPending);

  return (
    <Drawer
      title={source ? `Duplicate "${source.name}"` : "New promotion"}
      size={1100}
      open={open}
      onClose={onClose}
      // A copy starts from the source every time it is opened; a new draft survives closing.
      destroyOnHidden={Boolean(source)}
    >
      {source && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="This is a copy. Change the dates or the target before saving: overlapping promotions on the same products are rejected. The original stays unchanged."
        />
      )}
      {source && loading ? (
        <Spin />
      ) : (
        <PromotionForm
          // Remount per source: the form reads initialValues only on mount.
          key={source?.id ?? "new"}
          initialValues={
            source ? formValuesFromPromotion(source, products.flatMap((q) => (q.data ? [q.data] : []))) : undefined
          }
          onCreated={(promo) => {
            message.success(`"${promo.name}" was created.`);
            onClose();
          }}
          renderAside={(values) => <PromotionPreview values={values} />}
        />
      )}
    </Drawer>
  );
}
