import { useState } from "react";
import { Alert, Button, Card, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PromotionStatus } from "../../api/types";
import { useAppSelector } from "../../app/store";
import {
  CategoryTag,
  CouponTag,
  PromotionLink,
  PromotionStatusTag,
  QueryErrorAlert,
} from "../../components/common";
import { DISCOUNT_TYPE_LABELS, formatDiscount, getPromotionStatus, todayUtc } from "../../domain/promotion";
import { DeletePromotionDialog } from "./DeletePromotionDialog";
import { PromotionFormDrawer } from "./PromotionFormDrawer";
import type { StoredPromotion } from "./promotionsSlice";
import { usePromotionsQuery } from "./queries";

const STATUSES: PromotionStatus[] = ["Active", "Scheduled", "Expired"];

export function PromotionsPage() {
  const query = usePromotionsQuery();
  const { items, loaded } = useAppSelector((state) => state.promotions);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [source, setSource] = useState<StoredPromotion | null>(null);
  const [toDelete, setToDelete] = useState<StoredPromotion | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const today = todayUtc();

  const openDrawer = (promo: StoredPromotion | null) => {
    setSource(promo);
    setDrawerOpen(true);
  };

  const columns: ColumnsType<StoredPromotion> = [
    {
      title: "Name",
      dataIndex: "name",
      render: (name: string, promo) => (
        <Space size={6}>
          <PromotionLink id={promo.id}>{name}</PromotionLink>
          {promo.couponCode && <CouponTag code={promo.couponCode} />}
        </Space>
      ),
    },
    {
      title: "Discount type",
      dataIndex: "discountType",
      width: 150,
      render: (type: StoredPromotion["discountType"]) => DISCOUNT_TYPE_LABELS[type],
    },
    {
      title: "Value",
      dataIndex: "value",
      width: 130,
      render: (_: number, promo) => formatDiscount(promo.discountType, promo.value),
    },
    {
      title: "Applies to",
      width: 170,
      render: (_, promo) =>
        promo.targetType === "category" && promo.targetCategory ? (
          <CategoryTag category={promo.targetCategory} />
        ) : (
          `${promo.targetProductIds?.length ?? 0} selected products`
        ),
    },
    {
      title: "Products",
      dataIndex: "affectedProductCount",
      width: 100,
      align: "right",
      render: (count?: number) => count ?? "—",
    },
    {
      title: "Validity",
      width: 210,
      sorter: (a, b) => a.startDate.localeCompare(b.startDate),
      render: (_, promo) => `${promo.startDate} – ${promo.endDate}`,
    },
    {
      title: "Status",
      width: 120,
      filters: STATUSES.map((s) => ({ text: s, value: s })),
      onFilter: (value, promo) => getPromotionStatus(promo, today) === value,
      render: (_, promo) => <PromotionStatusTag status={getPromotionStatus(promo, today)} />,
    },
    {
      title: "",
      width: 160,
      align: "right",
      render: (_, promo) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openDrawer(promo)}>
            Duplicate
          </Button>
          <Button
            type="link"
            danger
            size="small"
            onClick={() => {
              setToDelete(promo);
              setDeleteOpen(true);
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

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
            <Table<StoredPromotion>
              rowKey="id"
              columns={columns}
              dataSource={items}
              loading={!loaded && query.isFetching}
              pagination={false}
              locale={{ emptyText: loaded ? "No promotions yet." : " " }}
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
