import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/app/hooks";
import { createPromotion, deletePromotion } from "@/services/promotions.service";
import { queryKeys } from "@/services/queryKeys";
import { promotionCreated, promotionDeleted } from "../store/promotionsSlice";

/**
 * A promotion change alters effective prices and statuses everywhere. Cached queries
 * that are not on screen are dropped, so opening them later shows a loader instead of
 * an old price; the ones on screen are refetched.
 */
function refreshAfterPromotionChange(queryClient: QueryClient) {
  for (const queryKey of [queryKeys.products, queryKeys.promotions]) {
    queryClient.removeQueries({ queryKey, type: "inactive" });
    void queryClient.invalidateQueries({ queryKey });
  }
}

export function useCreatePromotion() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPromotion,
    // Redux changes only after the API confirmed the save (no optimistic update).
    onSuccess: (created) => {
      dispatch(promotionCreated(created));
      refreshAfterPromotionChange(queryClient);
    },
  });
}

export function useDeletePromotion() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: (_data, id) => {
      dispatch(promotionDeleted(id));
      refreshAfterPromotionChange(queryClient);
    },
  });
}
