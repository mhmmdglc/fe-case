import { configureStore } from "@reduxjs/toolkit";
import { productFiltersReducer } from "@/features/products";
import { promotionsReducer } from "@/features/promotions";

export function makeStore() {
  return configureStore({ reducer: { productFilters: productFiltersReducer, promotions: promotionsReducer } });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
