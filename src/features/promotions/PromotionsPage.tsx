import { useState } from "react";
import { App, Alert, Button, Card, Drawer, Popconfirm, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PromotionStatus } from "../../api/types";
import { useAppSelector } from "../../app/store";
import {
  CategoryTag,
  CouponTag,
  errorMessage,
  PromotionLink,
  PromotionStatusTag,
  QueryErrorAlert,
} from "../../components/common";
import { DISCOUNT_TYPE_LABELS, formatDiscount, getPromotionStatus, todayUtc } from "../../domain/promotion";
import { PromotionForm } from "./PromotionForm";
import { PromotionPreview } from "./PromotionPreview";
import type { StoredPromotion } from "./promotionsSlice";
import { useDeletePromotion, usePromotionsQuery } from "./queries";

const STATUSES: PromotionStatus[] = ["Active", "Scheduled", "Expired"];

export function PromotionsPage() {
  const query = usePromotionsQuery();
  const { items, loaded } = useAppSelector((state) => state.promotions);
  const remove = useDeletePromotion();
  const { message } = App.useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const today = todayUtc();

  const handleDelete = async (promo: StoredPromotion) => {
    try {
      await remove.mutateAsync(promo.id);
      message.success(`"${promo.name}" was deleted.`);
    } catch (error) {
      message.error(`Could not delete "${promo.name}": ${errorMessage(error)}`);
    }
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
      width: 90,
      align: "right",
      render: (_, promo) => (
        <Popconfirm
          title="Delete this promotion?"
          description="Prices of the affected products change immediately."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(promo)}
        >
          <Button
            type="link"
            danger
            size="small"
            loading={remove.isPending && remove.variables === promo.id}
          >
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Promotions
        </Typography.Title>
        <Button type="primary" onClick={() => setDrawerOpen(true)}>
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

      <Drawer
        title="New promotion"
        size={1100}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <PromotionForm
          onCreated={(promo) => {
            message.success(`"${promo.name}" was created.`);
            setDrawerOpen(false);
          }}
          renderAside={(values) => <PromotionPreview values={values} />}
        />
      </Drawer>
    </Space>
  );
}
