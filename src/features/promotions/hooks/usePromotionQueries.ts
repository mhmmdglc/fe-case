import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/app/hooks";
import { getPromotion, getPromotions, previewPromotion } from "@/services/promotions.service";
import { queryKeys } from "@/services/queryKeys";
import type { PreviewRequest } from "@/services/types";
import { promotionsSynced } from "../store/promotionsSlice";

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
      const items = await getPromotions(signal);
      store.dispatch(promotionsSynced({ items, revision }));
      return items;
    },
  });
}

export function usePromotion(id: string) {
  return useQuery({
    queryKey: queryKeys.promotionDetail(id),
    queryFn: ({ signal }) => getPromotion(id, signal),
  });
}

/**
 * Keyed by the full request: a late response can only land on its own key. The previous
 * result stays as placeholder while a new request loads, so the preview dims instead of
 * flashing a spinner.
 */
export function usePromotionPreview(request: PreviewRequest | null) {
  return useQuery({
    queryKey: queryKeys.promotionPreview(request),
    queryFn: ({ signal }) => previewPromotion(request as PreviewRequest, signal),
    enabled: request !== null,
    placeholderData: keepPreviousData,
  });
}
