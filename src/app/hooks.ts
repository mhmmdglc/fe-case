import { useDispatch, useSelector, useStore } from "react-redux";
// Type-only: features use these hooks, and the store imports the features' reducers.
import type { AppDispatch, AppStore, RootState } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
