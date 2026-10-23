import { formatPrice } from "@/domain/promotion";

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
