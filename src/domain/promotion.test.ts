import { describe, expect, it } from "vitest";
import {
  computeEffectivePrice,
  formatDiscount,
  getProductPromotionStatus,
  getPromotionStatus,
  todayUtc,
} from "./promotion";

const promo = { startDate: "2026-06-10", endDate: "2026-06-20" };

describe("todayUtc", () => {
  it("uses the UTC calendar day, not the local one", () => {
    // 01:30 in Istanbul (UTC+3) is still the previous day in UTC.
    expect(todayUtc(new Date("2026-06-14T22:30:00Z"))).toBe("2026-06-14");
    expect(todayUtc(new Date("2026-06-15T00:00:00Z"))).toBe("2026-06-15");
  });
});

describe("getPromotionStatus", () => {
  it("is Scheduled before the start date", () => {
    expect(getPromotionStatus(promo, "2026-06-09")).toBe("Scheduled");
  });

  it("is Active on the start date (inclusive)", () => {
    expect(getPromotionStatus(promo, "2026-06-10")).toBe("Active");
  });

  it("is Active between the dates", () => {
    expect(getPromotionStatus(promo, "2026-06-15")).toBe("Active");
  });

  it("is Active on the end date (inclusive)", () => {
    expect(getPromotionStatus(promo, "2026-06-20")).toBe("Active");
  });

  it("is Expired after the end date", () => {
    expect(getPromotionStatus(promo, "2026-06-21")).toBe("Expired");
  });

  it("compares dates across month and year boundaries", () => {
    const yearEnd = { startDate: "2026-12-30", endDate: "2027-01-02" };
    expect(getPromotionStatus(yearEnd, "2026-12-29")).toBe("Scheduled");
    expect(getPromotionStatus(yearEnd, "2027-01-01")).toBe("Active");
    expect(getPromotionStatus(yearEnd, "2027-01-03")).toBe("Expired");
  });
});

describe("computeEffectivePrice", () => {
  it("returns the base price without a promotion", () => {
    expect(computeEffectivePrice(349.9, null)).toBe(349.9);
  });

  it("applies a percentage discount", () => {
    expect(computeEffectivePrice(200, { discountType: "percentage_off", value: 20 })).toBe(160);
  });

  it("applies a 100% discount as a free product", () => {
    expect(computeEffectivePrice(200, { discountType: "percentage_off", value: 100 })).toBe(0);
  });

  it("applies a fixed amount discount", () => {
    expect(computeEffectivePrice(899.9, { discountType: "fixed_amount_off", value: 200 })).toBeCloseTo(699.9);
  });

  it("never goes below zero when the fixed amount exceeds the price", () => {
    expect(computeEffectivePrice(149.9, { discountType: "fixed_amount_off", value: 200 })).toBe(0);
  });
});

describe("getProductPromotionStatus", () => {
  const today = "2026-06-15";
  const active = { startDate: "2026-06-10", endDate: "2026-06-20" };
  const scheduled = { startDate: "2026-07-01", endDate: "2026-07-05" };
  const expired = { startDate: "2026-05-01", endDate: "2026-05-05" };

  it("is null when no promotion ever targeted the product", () => {
    expect(getProductPromotionStatus([], today)).toBeNull();
  });

  it("prefers Active over Scheduled and Expired", () => {
    expect(getProductPromotionStatus([expired, scheduled, active], today)).toBe("Active");
  });

  it("is Scheduled when only upcoming and past promotions exist", () => {
    expect(getProductPromotionStatus([expired, scheduled], today)).toBe("Scheduled");
  });

  it("is Expired when all promotions are in the past", () => {
    expect(getProductPromotionStatus([expired], today)).toBe("Expired");
  });
});

describe("formatDiscount", () => {
  it("formats percentage and fixed discounts", () => {
    expect(formatDiscount("percentage_off", 20)).toBe("20% off");
    expect(formatDiscount("fixed_amount_off", 200)).toMatch(/^₺200,00 off$/);
  });
});
