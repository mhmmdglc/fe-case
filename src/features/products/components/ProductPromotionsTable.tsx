import { Card, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PromotionWithStatus } from "@/services/types";
import { CouponTag, PriceCell, PromotionLink, PromotionStatusTag } from "@/shared/components";
import { computeEffectivePrice, formatDiscount, getPromotionStatus } from "@/domain/promotion";

interface Props {
  basePrice: number;
  promotions: PromotionWithStatus[];
  today: string;
  onPromotionClick: (promotion: PromotionWithStatus) => void;
}

/** Every promotion of one product, with the price each one gives it. */
export function ProductPromotionsTable({ basePrice, promotions, today, onPromotionClick }: Props) {
  const columns: ColumnsType<PromotionWithStatus> = [
    {
      title: "Promotion",
      dataIndex: "name",
      render: (name: string, promo) => <PromotionLink id={promo.id}>{name}</PromotionLink>,
    },
    {
      title: "Coupon",
      dataIndex: "couponCode",
      width: 110,
      render: (code?: string) => (code ? <CouponTag code={code} /> : "—"),
    },
    {
      title: "Discount",
      width: 160,
      render: (_, promo) => formatDiscount(promo.discountType, promo.value),
    },
    {
      title: "Validity",
      width: 220,
      render: (_, promo) => `${promo.startDate} – ${promo.endDate}`,
    },
    {
      title: "Price with this promotion",
      width: 200,
      align: "right",
      render: (_, promo) => (
        <PriceCell basePrice={basePrice} effectivePrice={computeEffectivePrice(basePrice, promo)} />
      ),
    },
    {
      title: "Status",
      width: 120,
      render: (_, promo) => <PromotionStatusTag status={getPromotionStatus(promo, today)} />,
    },
  ];

  return (
    <Card title="All promotions for this product">
      <Table<PromotionWithStatus>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={promotions}
        pagination={false}
        onRow={(promo) => ({
          onClick: () => onPromotionClick(promo),
          className: "clickable-row",
        })}
        locale={{ emptyText: "This product has never been on promotion." }}
      />
    </Card>
  );
}
