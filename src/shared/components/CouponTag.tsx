import { Tag } from "antd";

export function CouponTag({ code }: { code: string }) {
  return <Tag className="mono">{code}</Tag>;
}
