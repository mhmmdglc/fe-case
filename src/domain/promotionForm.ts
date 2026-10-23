import type {
  CreatePromotionRequest,
  DiscountType,
  PreviewRequest,
  Product,
  Promotion,
  TargetType,
} from "@/services/types";

export interface ProductOption {
  id: string;
  label: string;
  /** Needed to find category-wide promotions that already cover a selected product. */
  category: string;
}

export interface PromotionFormValues {
  name: string;
  discountType: DiscountType | null;
  value: number | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  couponCode: string;
  targetType: TargetType;
  /** Selected products keep their labels so tags survive picker searches. */
  targetProducts: ProductOption[];
  targetCategory: string | null;
}

export type FormField =
  | "name"
  | "discountType"
  | "value"
  | "startDate"
  | "endDate"
  | "targetProducts"
  | "targetCategory";

export type FieldErrors = Partial<Record<FormField, string>>;

export const emptyPromotionForm: PromotionFormValues = {
  name: "",
  discountType: "percentage_off",
  value: null,
  startDate: null,
  endDate: null,
  couponCode: "",
  targetType: "category",
  targetProducts: [],
  targetCategory: null,
};

/**
 * Create-form values copied from an existing promotion (Duplicate). `products` are the loaded
 * details of its target products; an id that could not be loaded keeps the id as its label.
 */
export function formValuesFromPromotion(
  promo: Promotion,
  products: Pick<Product, "id" | "name" | "sku" | "category">[]
): PromotionFormValues {
  const byId = new Map(products.map((p) => [p.id, p]));
  return {
    name: `${promo.name} (copy)`,
    discountType: promo.discountType,
    value: promo.value,
    startDate: promo.startDate,
    endDate: promo.endDate,
    couponCode: promo.couponCode ?? "",
    targetType: promo.targetType,
    targetProducts:
      promo.targetType === "products"
        ? (promo.targetProductIds ?? []).map((id) => {
            const product = byId.get(id);
            return product
              ? { id, label: `${product.name} · ${product.sku}`, category: product.category }
              : { id, label: id, category: "" };
          })
        : [],
    targetCategory: promo.targetCategory ?? null,
  };
}

/** Same rules as POST /api/promotions, checked before the request is sent. */
export function validatePromotionForm(values: PromotionFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.name.trim()) errors.name = "Name is required.";
  if (!values.discountType) errors.discountType = "Discount type is required.";

  if (values.value === null) {
    errors.value = "Discount value is required.";
  } else if (!Number.isFinite(values.value) || values.value <= 0) {
    errors.value = "Discount value must be a positive number.";
  } else if (values.discountType === "percentage_off" && values.value > 100) {
    errors.value = "Percentage discount cannot exceed 100.";
  }

  if (!values.startDate) errors.startDate = "Start date is required.";
  if (!values.endDate) {
    errors.endDate = "End date is required.";
  } else if (values.startDate && values.endDate <= values.startDate) {
    errors.endDate = "End date must be after the start date.";
  }

  if (values.targetType === "products" && values.targetProducts.length === 0) {
    errors.targetProducts = "Select at least one product.";
  }
  if (values.targetType === "category" && !values.targetCategory) {
    errors.targetCategory = "Select a category.";
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Only the fields of the chosen target type are sent; the other one is dropped. */
function targetFields(values: PromotionFormValues) {
  return values.targetType === "products"
    ? { targetType: "products" as const, targetProductIds: values.targetProducts.map((p) => p.id) }
    : { targetType: "category" as const, targetCategory: values.targetCategory ?? "" };
}

/** Builds the POST body. Call only after validatePromotionForm returned no errors. */
export function buildCreatePayload(values: PromotionFormValues): CreatePromotionRequest {
  const couponCode = values.couponCode.trim();
  return {
    name: values.name.trim(),
    discountType: values.discountType as DiscountType,
    value: values.value as number,
    startDate: values.startDate as string,
    endDate: values.endDate as string,
    ...(couponCode ? { couponCode } : {}),
    ...targetFields(values),
  };
}

const PREVIEW_FIELDS: FormField[] = [
  "discountType",
  "value",
  "startDate",
  "endDate",
  "targetProducts",
  "targetCategory",
];

/**
 * Preview request, or null while any field the preview depends on is missing
 * or invalid. Never sends an empty target: the mock API would then return every product.
 */
export function buildPreviewRequest(values: PromotionFormValues): PreviewRequest | null {
  const errors = validatePromotionForm(values);
  if (PREVIEW_FIELDS.some((field) => errors[field])) return null;
  const { name: _name, couponCode: _couponCode, ...request } = buildCreatePayload(values);
  return request;
}

// 422 messages from the mock API are plain strings; map the known ones to fields.
const SERVER_ERROR_FIELDS: Array<[RegExp, FormField]> = [
  [/^name\b/i, "name"],
  [/^discountType\b/i, "discountType"],
  [/^(percentage_off )?value\b/i, "value"],
  [/^startDate\b/i, "startDate"],
  [/^endDate\b/i, "endDate"],
  [/\bproducts?\b/i, "targetProducts"],
  [/^category\b/i, "targetCategory"],
];

export function mapServerErrors(messages: string[]): { fieldErrors: FieldErrors; unmapped: string[] } {
  const fieldErrors: FieldErrors = {};
  const unmapped: string[] = [];

  for (const message of messages) {
    const match = SERVER_ERROR_FIELDS.find(([pattern]) => pattern.test(message));
    if (match && !fieldErrors[match[1]]) {
      fieldErrors[match[1]] = message.charAt(0).toUpperCase() + message.slice(1) + ".";
    } else {
      unmapped.push(message);
    }
  }

  return { fieldErrors, unmapped };
}
