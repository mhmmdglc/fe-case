import { describe, expect, it } from "vitest";
import type { Promotion } from "@/services/types";
import { datesOverlap, nextScheduledPromotion, openPromotionsForProducts, promotionTargetsProduct } from "./targeting";

const today = "2026-06-15";
const dress = { id: "p-030", category: "dresses" };
const otherDress = { id: "p-031", category: "dresses" };
const shirt = { id: "p-001", category: "tops" };

const promo = (overrides: Partial<Promotion>): Promotion => ({
  id: "x",
  name: "Promo",
  discountType: "percentage_off",
  value: 10,
  startDate: "2026-06-10",
  endDate: "2026-06-20",
  targetType: "category",
  targetCategory: "tops",
  ...overrides,
});

const activeTops = promo({ id: "active-tops", name: "Summer Tops Sale" });
const scheduledDresses = promo({
  id: "scheduled-dresses",
  name: "New Arrivals Preview",
  startDate: "2026-06-18",
  endDate: "2026-06-21",
  targetType: "products",
  targetProductIds: ["p-028", "p-029", "p-030"],
  targetCategory: undefined,
});
const laterDresses = promo({
  id: "later-dresses",
  startDate: "2026-07-01",
  endDate: "2026-07-05",
  targetCategory: "dresses",
});
const expiredDresses = promo({
  id: "expired-dresses",
  startDate: "2026-06-01",
  endDate: "2026-06-05",
  targetCategory: "dresses",
});

describe("promotionTargetsProduct", () => {
  it("matches listed product ids", () => {
    expect(promotionTargetsProduct(scheduledDresses, dress)).toBe(true);
    expect(promotionTargetsProduct(scheduledDresses, otherDress)).toBe(false);
  });

  it("matches every product of the target category", () => {
    expect(promotionTargetsProduct(activeTops, shirt)).toBe(true);
    expect(promotionTargetsProduct(activeTops, dress)).toBe(false);
  });
});

describe("datesOverlap", () => {
  const range = { startDate: "2026-06-10", endDate: "2026-06-20" };

  it("counts touching boundary days as overlap", () => {
    expect(datesOverlap(range, { startDate: "2026-06-20", endDate: "2026-06-25" })).toBe(true);
    expect(datesOverlap(range, { startDate: "2026-06-01", endDate: "2026-06-10" })).toBe(true);
  });

  it("is false for ranges that only meet on adjacent days", () => {
    expect(datesOverlap(range, { startDate: "2026-06-21", endDate: "2026-06-25" })).toBe(false);
  });

  it("detects a range fully inside another", () => {
    expect(datesOverlap({ startDate: "2026-06-01", endDate: "2026-06-30" }, range)).toBe(true);
  });
});

describe("openPromotionsForProducts", () => {
  const all = [activeTops, laterDresses, scheduledDresses, expiredDresses];

  it("returns active and scheduled promotions for the products, earliest first, without expired ones", () => {
    const result = openPromotionsForProducts(all, [dress, otherDress], today);
    expect(result.map((p) => [p.id, p.status])).toEqual([
      ["scheduled-dresses", "Scheduled"],
      ["later-dresses", "Scheduled"],
    ]);
  });

  it("reports which of the given products each promotion covers", () => {
    const result = openPromotionsForProducts(all, [dress, otherDress], today);
    expect(result.find((p) => p.id === "scheduled-dresses")?.productIds).toEqual(["p-030"]);
    expect(result.find((p) => p.id === "later-dresses")?.productIds).toEqual(["p-030", "p-031"]);
  });

  it("marks a running promotion as Active", () => {
    expect(openPromotionsForProducts(all, [shirt], today)).toMatchObject([{ id: "active-tops", status: "Active" }]);
  });

  it("is empty when nothing targets the products", () => {
    expect(openPromotionsForProducts(all, [{ id: "p-040", category: "accessories" }], today)).toEqual([]);
  });
});

describe("nextScheduledPromotion", () => {
  it("returns the earliest upcoming promotion of a product with no active one", () => {
    expect(nextScheduledPromotion([laterDresses, scheduledDresses], dress, today)?.id).toBe("scheduled-dresses");
  });

  it("is null when the product has only active or expired promotions", () => {
    expect(nextScheduledPromotion([activeTops, expiredDresses], shirt, today)).toBeNull();
    expect(nextScheduledPromotion([expiredDresses], dress, today)).toBeNull();
  });
});
