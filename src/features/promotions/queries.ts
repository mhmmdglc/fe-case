import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "../../api/endpoints";
import { queryKeys } from "../../api/queryKeys";
import type { PreviewRequest } from "../../api/types";
import { useAppDispatch, useAppStore } from "../../app/store";
import { promotionCreated, promotionDeleted, promotionsSynced } from "./promotionsSlice";

/**
 * The only place where the promotion list gets into Redux. Every successful fetch
 * (first load and every refetch) replaces the stored list; the revision guard in
 * promotionsSynced drops responses that started before a later mutation.
 * Components read the list from Redux and use this query for loading/error state.
 */
export function usePromotionsQuery() {
  const store = useAppStore();
  return useQuery({
    queryKey: queryKeys.promotionList,
    queryFn: async ({ signal }) => {
      const revision = store.getState().promotions.revision;
      const items = await api.getPromotions(signal);
      store.dispatch(promotionsSynced({ items, revision }));
      return items;
    },
  });
}

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
    mutationFn: api.createPromotion,
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
    mutationFn: (id: string) => api.deletePromotion(id),
    onSuccess: (_data, id) => {
      dispatch(promotionDeleted(id));
      refreshAfterPromotionChange(queryClient);
    },
  });
}

/** Keyed by the full request: a late response can only land on its own key. */
export function usePromotionPreview(request: PreviewRequest | null) {
  return useQuery({
    queryKey: request ? queryKeys.promotionPreview(request) : [...queryKeys.promotions, "preview", null],
    queryFn: ({ signal }) => api.previewPromotion(request as PreviewRequest, signal),
    enabled: request !== null,
  });
}
