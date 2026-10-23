import { Alert, Button, Tag } from "antd";
import { ApiError } from "../api/client";
import type { PromotionStatus } from "../api/types";
import { formatPrice } from "../domain/promotion";

const STATUS_COLORS: Record<PromotionStatus, string> = {
  Active: "green",
  Scheduled: "blue",
  Expired: "default",
};

export function PromotionStatusTag({ status }: { status: PromotionStatus }) {
  return <Tag color={STATUS_COLORS[status]}>{status}</Tag>;
}

export function CategoryTag({ category }: { category: string }) {
  return <Tag>{category.charAt(0).toUpperCase() + category.slice(1)}</Tag>;
}

/** Effective price, with the base price struck through when they differ. */
export function PriceCell({ basePrice, effectivePrice }: { basePrice: number; effectivePrice: number }) {
  if (effectivePrice === basePrice) return <span className="price-regular">{formatPrice(basePrice)}</span>;
  return (
    <span>
      <span className="price-discounted">{formatPrice(effectivePrice)}</span>{" "}
      <span className="price-old">{formatPrice(basePrice)}</span>
    </span>
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

export function QueryErrorAlert({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert
      type="error"
      showIcon
      title="Could not load data"
      description={errorMessage(error)}
      action={
        <Button size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}
