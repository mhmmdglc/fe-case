import { Button, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PromotionStatus } from "@/services/types";
import { CategoryTag, CouponTag, PromotionLink, PromotionStatusTag } from "@/shared/components";
import { DISCOUNT_TYPE_LABELS, formatDiscount, getPromotionStatus, todayUtc } from "@/domain/promotion";
import type { StoredPromotion } from "../store/promotionsSlice";

const STATUSES: PromotionStatus[] = ["Active", "Scheduled", "Expired"];

interface Props {
  promotions: StoredPromotion[];
  /** False until the first list response reached Redux. */
  loaded: boolean;
  loading: boolean;
  onDuplicate: (promotion: StoredPromotion) => void;
  onDelete: (promotion: StoredPromotion) => void;
}

export function PromotionTable({ promotions, loaded, loading, onDuplicate, onDelete }: Props) {
  const today = todayUtc();

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
          <Button type="link" size="small" onClick={() => onDuplicate(promo)}>
            Duplicate
          </Button>
          <Button type="link" danger size="small" onClick={() => onDelete(promo)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table<StoredPromotion>
      rowKey="id"
      columns={columns}
      dataSource={promotions}
      loading={loading}
      pagination={false}
      locale={{ emptyText: loaded ? "No promotions yet." : " " }}
    />
  );
}
