import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PromotionStatusFilter } from "../../api/types";

export const PAGE_SIZE = 10;

export interface ProductFiltersState {
  q: string;
  category: string;
  promotionStatus: PromotionStatusFilter;
  page: number;
}

// A fresh app load behaves as if "shirt" was searched. Clearing it later is kept as "".
export const initialFilters: ProductFiltersState = {
  q: "shirt",
  category: "",
  promotionStatus: "all",
  page: 1,
};

const filtersSlice = createSlice({
  name: "productFilters",
  initialState: initialFilters,
  reducers: {
    searchChanged(state, action: PayloadAction<string>) {
      const q = action.payload.trim();
      if (q === state.q) return; // re-applying the same search must not reset the page
      state.q = q;
      state.page = 1;
    },
    categoryChanged(state, action: PayloadAction<string>) {
      state.category = action.payload;
      state.page = 1;
    },
    promotionStatusChanged(state, action: PayloadAction<PromotionStatusFilter>) {
      state.promotionStatus = action.payload;
      state.page = 1;
    },
    pageChanged(state, action: PayloadAction<number>) {
      const page = Math.floor(action.payload);
      state.page = Number.isFinite(page) && page >= 1 ? page : 1;
    },
    filtersCleared() {
      return { q: "", category: "", promotionStatus: "all", page: 1 };
    },
  },
});

export const { searchChanged, categoryChanged, promotionStatusChanged, pageChanged, filtersCleared } =
  filtersSlice.actions;
export default filtersSlice.reducer;
