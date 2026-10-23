import { describe, expect, it } from "vitest";
import {
  computeEffectivePrice,
  daysBetween,
  deletionImpact,
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

describe("daysBetween", () => {
  it("is 0 for the same day", () => {
    expect(daysBetween("2026-06-15", "2026-06-15")).toBe(0);
  });

  it("counts whole days forward", () => {
    expect(daysBetween("2026-06-15", "2026-06-16")).toBe(1);
    expect(daysBetween("2026-06-15", "2026-06-25")).toBe(10);
  });

  it("is negative when `to` is earlier", () => {
    expect(daysBetween("2026-06-16", "2026-06-15")).toBe(-1);
    expect(daysBetween("2026-06-25", "2026-06-15")).toBe(-10);
  });

  it("rolls over months, leap days and years", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-06-15", "2027-06-15")).toBe(365);
  });

  it("is not affected by daylight saving changes (UTC calendar days)", () => {
    // Europe switches clocks on 2026-03-29 and 2026-10-25.
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
});

describe("deletionImpact", () => {
  const range = { startDate: "2026-06-10", endDate: "2026-06-20" };

  it("is scheduled the day before the start", () => {
    expect(deletionImpact(range, "2026-06-09")).toEqual({ kind: "scheduled", daysUntilStart: 1 });
  });

  it("is scheduled further before the start", () => {
    expect(deletionImpact(range, "2026-06-01")).toEqual({ kind: "scheduled", daysUntilStart: 9 });
  });

  it("is active on the start day, counting today and the end day", () => {
    expect(deletionImpact(range, "2026-06-10")).toEqual({ kind: "active", daysLeft: 11 });
  });

  it("is active in the middle", () => {
    expect(deletionImpact(range, "2026-06-15")).toEqual({ kind: "active", daysLeft: 6 });
  });

  it("has 1 day left on the end day", () => {
    expect(deletionImpact(range, "2026-06-20")).toEqual({ kind: "active", daysLeft: 1 });
  });

  it("is expired the day after the end", () => {
    expect(deletionImpact(range, "2026-06-21")).toEqual({ kind: "expired", daysSinceEnd: 1 });
  });

  it("is expired long after the end", () => {
    expect(deletionImpact(range, "2026-07-01")).toEqual({ kind: "expired", daysSinceEnd: 11 });
  });

  it("counts across month and year boundaries", () => {
    const yearEnd = { startDate: "2026-12-30", endDate: "2027-01-02" };
    expect(deletionImpact(yearEnd, "2026-12-25")).toEqual({ kind: "scheduled", daysUntilStart: 5 });
    expect(deletionImpact(yearEnd, "2026-12-31")).toEqual({ kind: "active", daysLeft: 3 });
    expect(deletionImpact(yearEnd, "2027-01-02")).toEqual({ kind: "active", daysLeft: 1 });
    expect(deletionImpact(yearEnd, "2027-01-05")).toEqual({ kind: "expired", daysSinceEnd: 3 });
    const monthEnd = { startDate: "2026-05-25", endDate: "2026-06-02" };
    expect(deletionImpact(monthEnd, "2026-05-31")).toEqual({ kind: "active", daysLeft: 3 });
  });

  it("uses today in UTC by default (frozen at 2026-06-15)", () => {
    expect(deletionImpact({ startDate: "2026-06-10", endDate: "2026-06-25" })).toEqual({
      kind: "active",
      daysLeft: 11,
    });
    expect(deletionImpact({ startDate: "2026-06-18", endDate: "2026-06-21" })).toEqual({
      kind: "scheduled",
      daysUntilStart: 3,
    });
    expect(deletionImpact({ startDate: "2026-05-16", endDate: "2026-05-31" })).toEqual({
      kind: "expired",
      daysSinceEnd: 15,
    });
  });
});
