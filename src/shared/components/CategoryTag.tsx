import { Tag } from "antd";

export function CategoryTag({ category }: { category: string }) {
  return <Tag>{category.charAt(0).toUpperCase() + category.slice(1)}</Tag>;
}
