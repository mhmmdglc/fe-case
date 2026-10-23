import { describe, expect, it } from "vitest";
import {
  buildCreatePayload,
  buildPreviewRequest,
  emptyPromotionForm,
  formValuesFromPromotion,
  mapServerErrors,
  validatePromotionForm,
  type PromotionFormValues,
} from "./promotionForm";
import type { Promotion } from "@/services/types";
import { products } from "@/mocks/db";

const valid: PromotionFormValues = {
  ...emptyPromotionForm,
  name: "Autumn Knitwear",
  discountType: "percentage_off",
  value: 25,
  startDate: "2026-06-10",
  endDate: "2026-06-20",
  targetType: "category",
  targetCategory: "knitwear",
};

describe("validatePromotionForm", () => {
  it("accepts a complete form", () => {
    expect(validatePromotionForm(valid)).toEqual({});
  });

  it("requires every mandatory field on an empty form", () => {
    const errors = validatePromotionForm({ ...emptyPromotionForm, discountType: null });
    expect(Object.keys(errors).sort()).toEqual(
      ["discountType", "endDate", "name", "startDate", "targetCategory", "value"].sort()
    );
  });

  it("rejects a whitespace-only name", () => {
    expect(validatePromotionForm({ ...valid, name: "   " }).name).toBeDefined();
  });

  it("rejects zero and negative values", () => {
    expect(validatePromotionForm({ ...valid, value: 0 }).value).toBeDefined();
    expect(validatePromotionForm({ ...valid, value: -5 }).value).toBeDefined();
  });

  it("rejects non-finite values", () => {
    expect(validatePromotionForm({ ...valid, value: Number.NaN }).value).toBeDefined();
    expect(validatePromotionForm({ ...valid, value: Number.POSITIVE_INFINITY }).value).toBeDefined();
  });

  it("allows exactly 100 for percentage_off but not more", () => {
    expect(validatePromotionForm({ ...valid, value: 100 }).value).toBeUndefined();
    expect(validatePromotionForm({ ...valid, value: 100.01 }).value).toBeDefined();
  });

  it("does not cap fixed amounts at 100 or at the product price", () => {
    expect(
      validatePromotionForm({ ...valid, discountType: "fixed_amount_off", value: 5000 }).value
    ).toBeUndefined();
  });

  it("rejects an end date equal to the start date", () => {
    expect(validatePromotionForm({ ...valid, endDate: valid.startDate }).endDate).toBe(
      "End date must be after the start date."
    );
  });

  it("rejects an end date before the start date", () => {
    expect(validatePromotionForm({ ...valid, endDate: "2026-06-01" }).endDate).toBeDefined();
  });

  it("requires at least one product for a products target", () => {
    const errors = validatePromotionForm({ ...valid, targetType: "products", targetProducts: [] });
    expect(errors.targetProducts).toBeDefined();
    expect(errors.targetCategory).toBeUndefined();
  });

  it("requires a category for a category target", () => {
    expect(validatePromotionForm({ ...valid, targetCategory: null }).targetCategory).toBeDefined();
  });
});

describe("buildCreatePayload", () => {
  it("trims text and omits an empty coupon code", () => {
    const payload = buildCreatePayload({ ...valid, name: "  Autumn  ", couponCode: "  " });
    expect(payload.name).toBe("Autumn");
    expect(payload).not.toHaveProperty("couponCode");
  });

  it("keeps a coupon code", () => {
    expect(buildCreatePayload({ ...valid, couponCode: " KNIT25 " }).couponCode).toBe("KNIT25");
  });

  it("sends only the category for a category target", () => {
    const payload = buildCreatePayload({
      ...valid,
      targetProducts: [{ id: "p-001", label: "Shirt", category: "tops" }],
    });
    expect(payload).toMatchObject({ targetType: "category", targetCategory: "knitwear" });
    expect(payload).not.toHaveProperty("targetProductIds");
  });

  it("sends only product ids for a products target", () => {
    const payload = buildCreatePayload({
      ...valid,
      targetType: "products",
      targetProducts: [
        { id: "p-012", label: "Wide Leg Denim Jeans", category: "bottoms" },
        { id: "p-013", label: "Straight Cut Jeans", category: "bottoms" },
      ],
    });
    expect(payload).toMatchObject({ targetType: "products", targetProductIds: ["p-012", "p-013"] });
    expect(payload).not.toHaveProperty("targetCategory");
  });
});

describe("buildPreviewRequest", () => {
  it("returns the pricing fields for a complete form", () => {
    expect(buildPreviewRequest(valid)).toEqual({
      discountType: "percentage_off",
      value: 25,
      startDate: "2026-06-10",
      endDate: "2026-06-20",
      targetType: "category",
      targetCategory: "knitwear",
    });
  });

  it("does not need a name", () => {
    expect(buildPreviewRequest({ ...valid, name: "" })).not.toBeNull();
  });

  it("returns null without a target, so the API never previews every product", () => {
    expect(buildPreviewRequest({ ...valid, targetType: "products", targetProducts: [] })).toBeNull();
    expect(buildPreviewRequest({ ...valid, targetCategory: null })).toBeNull();
  });

  it("returns null while a pricing field is invalid", () => {
    expect(buildPreviewRequest({ ...valid, value: 150 })).toBeNull();
    expect(buildPreviewRequest({ ...valid, endDate: valid.startDate })).toBeNull();
  });
});

describe("mapServerErrors", () => {
  it("maps every message the mock API can return to a field", () => {
    const { fieldErrors, unmapped } = mapServerErrors([
      "name is required",
      "discountType is required",
      "percentage_off value cannot exceed 100",
      "startDate is required",
      "endDate must be after startDate",
      "at least one product must be selected",
    ]);
    expect(Object.keys(fieldErrors).sort()).toEqual(
      ["discountType", "endDate", "name", "startDate", "targetProducts", "value"].sort()
    );
    expect(fieldErrors.value).toBe("Percentage_off value cannot exceed 100.");
    expect(unmapped).toEqual([]);
  });

  it("maps the category message", () => {
    expect(mapServerErrors(["category is required"]).fieldErrors.targetCategory).toBeDefined();
  });

  it("keeps unknown messages and a second message for the same field", () => {
    const { fieldErrors, unmapped } = mapServerErrors([
      "value must be positive",
      "percentage_off value cannot exceed 100",
      "something unexpected",
    ]);
    expect(fieldErrors.value).toBe("Value must be positive.");
    expect(unmapped).toEqual(["percentage_off value cannot exceed 100", "something unexpected"]);
  });
});

describe("formValuesFromPromotion", () => {
  const denim: Promotion = {
    id: "promo-002",
    name: "Denim Weekend",
    discountType: "percentage_off",
    value: 15,
    startDate: "2026-06-13",
    endDate: "2026-06-20",
    couponCode: "DENIM15",
    targetType: "products",
    // Deliberately not in catalogue order: the form keeps the promotion's order.
    targetProductIds: ["p-013", "p-012"],
  };

  it("copies a product promotion with labelled products in targetProductIds order", () => {
    expect(formValuesFromPromotion(denim, products)).toEqual({
      name: "Denim Weekend (copy)",
      discountType: "percentage_off",
      value: 15,
      startDate: "2026-06-13",
      endDate: "2026-06-20",
      couponCode: "DENIM15",
      targetType: "products",
      targetCategory: null,
      targetProducts: [
        { id: "p-013", label: "Straight Cut Jeans · BOT-JNS-002", category: "bottoms" },
        { id: "p-012", label: "Wide Leg Denim Jeans · BOT-JNS-001", category: "bottoms" },
      ],
    });
  });

  it("falls back to the id as label for products it cannot find", () => {
    const values = formValuesFromPromotion({ ...denim, targetProductIds: ["p-012", "p-999"] }, products);
    expect(values.targetProducts).toEqual([
      { id: "p-012", label: "Wide Leg Denim Jeans · BOT-JNS-001", category: "bottoms" },
      { id: "p-999", label: "p-999", category: "" },
    ]);
  });

  it("labels nothing from an empty product list", () => {
    expect(formValuesFromPromotion(denim, []).targetProducts).toEqual([
      { id: "p-013", label: "p-013", category: "" },
      { id: "p-012", label: "p-012", category: "" },
    ]);
  });

  it("copies a category promotion without coupon: empty coupon, no products", () => {
    const tops: Promotion = {
      id: "promo-003",
      name: "Coat Season Kickoff",
      discountType: "fixed_amount_off",
      value: 200,
      startDate: "2026-06-14",
      endDate: "2026-06-29",
      targetType: "category",
      targetCategory: "outerwear",
    };
    expect(formValuesFromPromotion(tops, products)).toEqual({
      name: "Coat Season Kickoff (copy)",
      discountType: "fixed_amount_off",
      value: 200,
      startDate: "2026-06-14",
      endDate: "2026-06-29",
      couponCode: "",
      targetType: "category",
      targetCategory: "outerwear",
      targetProducts: [],
    });
  });

  it("gives a copy that passes form validation and keeps the original untouched", () => {
    const original = structuredClone(denim);
    const values = formValuesFromPromotion(denim, products);
    expect(validatePromotionForm(values)).toEqual({});
    expect(denim).toEqual(original);
  });
});
