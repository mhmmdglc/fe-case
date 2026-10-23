import { Input, Select, Typography } from "antd";
import type { PromotionStatusFilter } from "@/services/types";
import styles from "./ProductFilters.module.scss";

const PROMOTION_STATUS_OPTIONS: { value: PromotionStatusFilter; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "on_promotion", label: "On promotion" },
  { value: "no_promotion", label: "No promotion" },
];

interface Props {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  /** Enter or the search button: applies the term without waiting for the debounce. */
  onSearch: (value: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  promotionStatus: PromotionStatusFilter;
  onPromotionStatusChange: (status: PromotionStatusFilter) => void;
  refreshing: boolean;
}

export function ProductFilters({
  searchInput,
  onSearchInputChange,
  onSearch,
  category,
  onCategoryChange,
  categories,
  categoriesLoading,
  categoriesError,
  promotionStatus,
  onPromotionStatusChange,
  refreshing,
}: Props) {
  return (
    <>
      <div className={styles.toolbar}>
        <Input.Search
          className={styles.search}
          placeholder="Search by product name"
          allowClear
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          onSearch={onSearch}
          aria-label="Search by product name"
        />
        <Select
          className={styles.select}
          value={category}
          onChange={onCategoryChange}
          loading={categoriesLoading}
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
          ]}
          aria-label="Filter by category"
        />
        <Select
          className={styles.select}
          value={promotionStatus}
          onChange={onPromotionStatusChange}
          options={PROMOTION_STATUS_OPTIONS}
          aria-label="Filter by promotion status"
        />
        {refreshing && <span className={styles.refreshing}>Updating results…</span>}
      </div>

      {categoriesError && <Typography.Text type="danger">Categories could not be loaded. </Typography.Text>}
    </>
  );
}
