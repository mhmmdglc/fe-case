import { describe, expect, it } from "vitest";
import reducer, {
  categoryChanged,
  filtersCleared,
  initialFilters,
  pageChanged,
  promotionStatusChanged,
  searchChanged,
} from "./filtersSlice";

const onPage3 = { ...initialFilters, page: 3 };

describe("productFilters reducer", () => {
  it('starts as if "shirt" was searched', () => {
    expect(reducer(undefined, { type: "@@init" })).toEqual({
      q: "shirt",
      category: "",
      promotionStatus: "all",
      page: 1,
    });
  });

  it("resets the page when the search changes", () => {
    expect(reducer(onPage3, searchChanged("jeans"))).toMatchObject({ q: "jeans", page: 1 });
  });

  it("keeps the page when the same search is applied again", () => {
    expect(reducer(onPage3, searchChanged(" shirt "))).toEqual(onPage3);
  });

  it("keeps an explicitly cleared search", () => {
    expect(reducer(initialFilters, searchChanged("")).q).toBe("");
  });

  it("resets the page when category or promotion status changes", () => {
    expect(reducer(onPage3, categoryChanged("tops")).page).toBe(1);
    expect(reducer(onPage3, promotionStatusChanged("on_promotion")).page).toBe(1);
  });

  it("normalizes invalid page numbers", () => {
    expect(reducer(initialFilters, pageChanged(0)).page).toBe(1);
    expect(reducer(initialFilters, pageChanged(Number.NaN)).page).toBe(1);
    expect(reducer(initialFilters, pageChanged(2.7)).page).toBe(2);
  });

  it("clears every filter, including the default search", () => {
    expect(reducer({ q: "x", category: "tops", promotionStatus: "no_promotion", page: 4 }, filtersCleared())).toEqual({
      q: "",
      category: "",
      promotionStatus: "all",
      page: 1,
    });
  });
});
