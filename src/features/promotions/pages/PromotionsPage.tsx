import { useState } from "react";
import { Alert, Button, Card, Space, Typography } from "antd";
import { useAppSelector } from "@/app/hooks";
import { QueryErrorAlert } from "@/shared/components";
import { DeletePromotionDialog } from "../components/DeletePromotionDialog";
import { PromotionFormDrawer } from "../components/PromotionFormDrawer";
import { PromotionTable } from "../components/PromotionTable";
import { usePromotionsQuery } from "../hooks/usePromotionQueries";
import type { StoredPromotion } from "../store/promotionsSlice";

export function PromotionsPage() {
  const query = usePromotionsQuery();
  const { items, loaded } = useAppSelector((state) => state.promotions);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [source, setSource] = useState<StoredPromotion | null>(null);
  const [toDelete, setToDelete] = useState<StoredPromotion | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openDrawer = (promo: StoredPromotion | null) => {
    setSource(promo);
    setDrawerOpen(true);
  };

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Promotions
        </Typography.Title>
        <Button type="primary" onClick={() => openDrawer(null)}>
          New promotion
        </Button>
      </Space>

      <Card>
        {!loaded && query.isError ? (
          <QueryErrorAlert error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <>
            {loaded && query.isError && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                title="The list could not be refreshed and may be out of date."
                action={<Button size="small" onClick={() => query.refetch()}>Retry</Button>}
              />
            )}
            <PromotionTable
              promotions={items}
              loaded={loaded}
              loading={!loaded && query.isFetching}
              onDuplicate={openDrawer}
              onDelete={(promo) => {
                setToDelete(promo);
                setDeleteOpen(true);
              }}
            />
          </>
        )}
      </Card>

      <PromotionFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} source={source} />
      {/* The promotion stays set after closing so the dialog keeps its content while it animates out. */}
      {toDelete && (
        <DeletePromotionDialog promotion={toDelete} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      )}
    </Space>
  );
}
