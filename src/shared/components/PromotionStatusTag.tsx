import { Tag } from "antd";
import type { PromotionStatus } from "@/services/types";

const STATUS_COLORS: Record<PromotionStatus, string> = {
  Active: "green",
  Scheduled: "blue",
  Expired: "default",
};

export function PromotionStatusTag({ status }: { status: PromotionStatus }) {
  return <Tag color={STATUS_COLORS[status]}>{status}</Tag>;
}
