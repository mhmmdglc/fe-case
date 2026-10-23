import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Promotion, PromotionListItem, PromotionWithStatus } from "../../api/types";

/**
 * Promotions as stored in Redux. The API's `status` is dropped on purpose: the UI
 * derives it from the dates with getPromotionStatus. affectedProductCount only comes
 * from GET /api/promotions, so it is missing for a just-created item until the refetch.
 */
export type StoredPromotion = Promotion & { affectedProductCount?: number };

export interface PromotionsState {
  items: StoredPromotion[];
  loaded: boolean;
  /** Incremented by every successful mutation. */
  revision: number;
}

const initialState: PromotionsState = { items: [], loaded: false, revision: 0 };

function withoutStatus<T extends { status?: unknown }>({ status: _status, ...rest }: T) {
  return rest;
}

const promotionsSlice = createSlice({
  name: "promotions",
  initialState,
  reducers: {
    /**
     * Full list from GET /api/promotions. `revision` is the value read when the request
     * started: a response that started before a later mutation succeeded is stale
     * and must not undo that mutation, so it is ignored.
     */
    promotionsSynced(state, action: PayloadAction<{ items: PromotionListItem[]; revision: number }>) {
      if (action.payload.revision !== state.revision) return;
      state.items = action.payload.items.map(withoutStatus);
      state.loaded = true;
    },
    promotionCreated(state, action: PayloadAction<PromotionWithStatus>) {
      state.items.push(withoutStatus(action.payload));
      state.revision += 1;
    },
    promotionDeleted(state, action: PayloadAction<string>) {
      state.items = state.items.filter((p) => p.id !== action.payload);
      state.revision += 1;
    },
  },
});

export const { promotionsSynced, promotionCreated, promotionDeleted } = promotionsSlice.actions;
export default promotionsSlice.reducer;
