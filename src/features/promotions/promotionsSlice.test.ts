import { describe, expect, it } from "vitest";
import type { PromotionListItem, PromotionWithStatus } from "../../api/types";
import reducer, { promotionCreated, promotionDeleted, promotionsSynced } from "./promotionsSlice";

const listItem: PromotionListItem = {
  id: "promo-001",
  name: "Summer Tops Sale",
  discountType: "percentage_off",
  value: 20,
  startDate: "2026-06-10",
  endDate: "2026-06-25",
  targetType: "category",
  targetCategory: "tops",
  status: "Active",
  affectedProductCount: 10,
};

const created: PromotionWithStatus = {
  id: "promo-new",
  name: "Knitwear Week",
  discountType: "fixed_amount_off",
  value: 50,
  startDate: "2026-07-01",
  endDate: "2026-07-07",
  targetType: "category",
  targetCategory: "knitwear",
  status: "Scheduled",
};

const initial = reducer(undefined, { type: "@@init" });

describe("promotions reducer", () => {
  it("stores the synced list without the API status field", () => {
    const state = reducer(initial, promotionsSynced({ items: [listItem], revision: 0 }));
    expect(state.loaded).toBe(true);
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).not.toHaveProperty("status");
    expect(state.items[0].affectedProductCount).toBe(10);
  });

  it("adds a created promotion and bumps the revision", () => {
    const state = reducer(initial, promotionCreated(created));
    expect(state.items.map((p) => p.id)).toEqual(["promo-new"]);
    expect(state.revision).toBe(1);
  });

  it("removes a deleted promotion and bumps the revision", () => {
    const synced = reducer(initial, promotionsSynced({ items: [listItem], revision: 0 }));
    const state = reducer(synced, promotionDeleted("promo-001"));
    expect(state.items).toEqual([]);
    expect(state.revision).toBe(1);
  });

  it("ignores a list response that started before a successful mutation", () => {
    // Request started at revision 0, the create succeeded meanwhile (revision 1).
    const afterCreate = reducer(initial, promotionCreated(created));
    const state = reducer(afterCreate, promotionsSynced({ items: [listItem], revision: 0 }));
    expect(state.items.map((p) => p.id)).toEqual(["promo-new"]);
  });

  it("accepts a list response that started after the mutation", () => {
    const afterCreate = reducer(initial, promotionCreated(created));
    const fresh = { ...created, affectedProductCount: 8 };
    const state = reducer(afterCreate, promotionsSynced({ items: [listItem, fresh], revision: 1 }));
    expect(state.items.map((p) => p.id)).toEqual(["promo-001", "promo-new"]);
    expect(state.items[1].affectedProductCount).toBe(8);
  });
});
