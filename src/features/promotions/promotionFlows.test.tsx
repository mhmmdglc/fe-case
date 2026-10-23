import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/services/http/httpClient";
import * as api from "@/services/promotions.service";
import { queryKeys } from "@/services/queryKeys";
import type { PromotionListItem } from "@/services/types";
import { makeStore } from "@/app/store";
import { emptyPromotionForm, type PromotionFormValues } from "@/domain/promotionForm";
import { server } from "@/test/server";
import { createWrapper } from "@/test/utils";
import { PromotionForm } from "./components/PromotionForm";
import { promotionsSynced } from "./store/promotionsSlice";
import { useCreatePromotion, useDeletePromotion } from "./hooks/usePromotionMutations";
import { usePromotionsQuery } from "./hooks/usePromotionQueries";

// "today" is frozen at 2026-06-15 (see test/freezeDate.ts).
const accessoriesPayload = {
  name: "Accessories Week",
  discountType: "percentage_off" as const,
  value: 15,
  startDate: "2026-06-16",
  endDate: "2026-06-22",
  targetType: "category" as const,
  targetCategory: "accessories",
};

const topsForm: PromotionFormValues = {
  ...emptyPromotionForm,
  name: "Extra Tops Deal",
  discountType: "percentage_off",
  value: 10,
  startDate: "2026-06-16",
  endDate: "2026-06-20",
  targetType: "category",
  targetCategory: "tops",
};

function renderPromotionHooks(store = makeStore()) {
  const { Wrapper, queryClient } = createWrapper(store);
  const hook = renderHook(
    () => ({ list: usePromotionsQuery(), create: useCreatePromotion(), remove: useDeletePromotion() }),
    { wrapper: Wrapper }
  );
  return { ...hook, store, queryClient };
}

type Deferred = { promise: Promise<void>; resolve: () => void };
function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/**
 * Makes the next GET /api/promotions wait until `release` is resolved, then answer with
 * `staleList` (captured from the real handler before the mutation). `started` resolves
 * once the request has reached the server, i.e. the queryFn is past reading the revision.
 */
function deferNextListResponse(staleList: PromotionListItem[]) {
  const started = deferred();
  const release = deferred();
  const answered = deferred();
  server.use(
    http.get(
      "/api/promotions",
      async () => {
        started.resolve();
        await release.promise;
        answered.resolve();
        return HttpResponse.json(staleList);
      },
      { once: true }
    )
  );
  return { started: started.promise, release: release.resolve, answered: answered.promise };
}

/** Records every promotionsSynced the store receives (what the queryFn hands to Redux). */
function recordSyncs(store: ReturnType<typeof makeStore>) {
  const syncs: { revision: number; ids: string[] }[] = [];
  const original = store.dispatch;
  store.dispatch = ((action: Parameters<typeof original>[0]) => {
    if (promotionsSynced.match(action)) {
      syncs.push({ revision: action.payload.revision, ids: action.payload.items.map((p) => p.id) });
    }
    return original(action);
  }) as typeof original;
  return syncs;
}

describe("creating a promotion (Redux + query sync)", () => {
  it("loads the list into Redux, then adds the created promotion and resyncs from the API", async () => {
    const { result, store, queryClient } = renderPromotionHooks();
    await waitFor(() => expect(store.getState().promotions.loaded).toBe(true));
    expect(store.getState().promotions.items).toHaveLength(7);

    // A cached product detail that is not on screen must not survive with an old price.
    queryClient.setQueryData(queryKeys.productDetail("p-040"), { stale: true });

    await act(() => result.current.create.mutateAsync(accessoriesPayload));

    const state = store.getState().promotions;
    expect(state.revision).toBe(1);
    expect(state.items.map((p) => p.name)).toContain("Accessories Week");
    expect(queryClient.getQueryData(queryKeys.productDetail("p-040"))).toBeUndefined();

    // The refetch that follows replaces the list and fills affectedProductCount.
    await waitFor(() =>
      expect(store.getState().promotions.items.find((p) => p.name === "Accessories Week")?.affectedProductCount).toBe(
        11
      )
    );
    expect(store.getState().promotions.items).toHaveLength(8);
  });

  it("leaves Redux unchanged when the API answers 409", async () => {
    const { result, store } = renderPromotionHooks();
    await waitFor(() => expect(store.getState().promotions.loaded).toBe(true));
    const before = store.getState().promotions;

    const error = await act(() =>
      result.current.create
        .mutateAsync({ ...accessoriesPayload, targetCategory: "tops" })
        .then(() => null, (e: unknown) => e)
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect(store.getState().promotions).toEqual(before);
  });
});

describe("stale list guard (list request in flight during a create)", () => {
  it("keeps the created promotion when a list response that started before the create arrives late", async () => {
    // Two component trees share one Redux store: tree B's list request is not cancelled by
    // tree A's post-create invalidation, so its stale response really reaches the queryFn
    // and promotionsSynced. Only the revision captured before the await can reject it.
    const store = makeStore();
    const syncs = recordSyncs(store);
    const { result } = renderPromotionHooks(store);
    const other = createWrapper(store);
    renderHook(() => usePromotionsQuery(), { wrapper: other.Wrapper });
    await waitFor(() => expect(store.getState().promotions.loaded).toBe(true));
    await waitFor(() => expect(other.queryClient.getQueryState(queryKeys.promotionList)?.status).toBe("success"));

    const staleList = await api.getPromotions();
    expect(staleList).toHaveLength(7);
    const pending = deferNextListResponse(staleList);
    void other.queryClient.refetchQueries({ queryKey: queryKeys.promotionList });
    await pending.started;

    const created = await act(() => result.current.create.mutateAsync(accessoriesPayload));
    expect(store.getState().promotions.revision).toBe(1);
    // Tree A's fresh refetch (started after the create) lands first and is accepted.
    await waitFor(() =>
      expect(store.getState().promotions.items.find((p) => p.id === created.id)?.affectedProductCount).toBe(11)
    );

    const syncsBeforeRelease = syncs.length;
    pending.release();
    await pending.answered;
    // The stale 7-item list (revision 0) is handed to Redux …
    await waitFor(() =>
      expect(syncs.slice(syncsBeforeRelease)).toContainEqual({ revision: 0, ids: staleList.map((p) => p.id) })
    );
    // … and dropped: the created promotion is still there.
    const state = store.getState().promotions;
    expect(state.items.map((p) => p.id)).toContain(created.id);
    expect(state.items).toHaveLength(8);
  });

  it("single tree: a list request in flight during the create never removes the created promotion", async () => {
    const store = makeStore();
    const { result, queryClient } = renderPromotionHooks(store);
    await waitFor(() => expect(store.getState().promotions.loaded).toBe(true));

    const staleList = await api.getPromotions();
    const pending = deferNextListResponse(staleList);
    void queryClient.refetchQueries({ queryKey: queryKeys.promotionList });
    await pending.started;

    const created = await act(() => result.current.create.mutateAsync(accessoriesPayload));
    expect(store.getState().promotions.items.map((p) => p.id)).toContain(created.id);

    pending.release();
    await pending.answered;
    // The refetch after the create eventually lands with the created promotion in it.
    await waitFor(() =>
      expect(store.getState().promotions.items.find((p) => p.id === created.id)?.affectedProductCount).toBe(11)
    );
    expect(store.getState().promotions.items).toHaveLength(8);
    await waitFor(() => expect(queryClient.isFetching({ queryKey: queryKeys.promotionList })).toBe(0));
    expect(store.getState().promotions.items.map((p) => p.id)).toContain(created.id);
    expect(store.getState().promotions.revision).toBe(1);
  });
});

describe("deleting a promotion", () => {
  it("removes it from Redux, bumps the revision and drops cached inactive product details", async () => {
    const { result, store, queryClient } = renderPromotionHooks();
    await waitFor(() => expect(store.getState().promotions.loaded).toBe(true));
    expect(store.getState().promotions.items.map((p) => p.id)).toContain("promo-001");
    const revisionBefore = store.getState().promotions.revision;
    queryClient.setQueryData(queryKeys.productDetail("p-001"), { stale: true });

    await expect(act(() => result.current.remove.mutateAsync("promo-001"))).resolves.toBeUndefined();

    const state = store.getState().promotions;
    expect(state.items.map((p) => p.id)).not.toContain("promo-001");
    expect(state.items).toHaveLength(6);
    expect(state.revision).toBe(revisionBefore + 1);
    expect(queryClient.getQueryData(queryKeys.productDetail("p-001"))).toBeUndefined();
    // The refetch that follows agrees with the API.
    await waitFor(() => expect(queryClient.isFetching({ queryKey: queryKeys.promotionList })).toBe(0));
    expect(store.getState().promotions.items.map((p) => p.id)).not.toContain("promo-001");
  });

  it("leaves Redux unchanged when the API answers 404", async () => {
    const { result, store, queryClient } = renderPromotionHooks();
    await waitFor(() => expect(store.getState().promotions.loaded).toBe(true));
    server.use(
      http.delete("/api/promotions/promo-001", () =>
        HttpResponse.json({ error: "Promotion not found" }, { status: 404 })
      )
    );
    queryClient.setQueryData(queryKeys.productDetail("p-001"), { stale: true });
    const before = store.getState().promotions;

    const error = await act(() =>
      result.current.remove.mutateAsync("promo-001").then(() => null, (e: unknown) => e)
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect(store.getState().promotions).toEqual(before);
    expect(queryClient.getQueryData(queryKeys.productDetail("p-001"))).toEqual({ stale: true });
  });
});

describe("PromotionForm", () => {
  it("shows inline errors for an empty form without calling the API", async () => {
    const posts: string[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST") posts.push(request.url);
    });
    const { Wrapper } = createWrapper();
    render(<PromotionForm />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole("button", { name: /create promotion/i }));

    expect(await screen.findByText("Name is required.")).toBeTruthy();
    expect(screen.getByText("Discount value is required.")).toBeTruthy();
    expect(screen.getByText("Select a category.")).toBeTruthy();
    server.events.removeAllListeners();
    expect(posts).toEqual([]);
  });

  it("does not submit when Enter is pressed inside a field", async () => {
    const posts: string[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST" && request.url.endsWith("/api/promotions")) posts.push(request.url);
    });
    const { Wrapper } = createWrapper();
    // A complete, valid form: an implicit submit would create the promotion.
    render(<PromotionForm initialValues={{ ...topsForm, targetCategory: "accessories" }} />, { wrapper: Wrapper });

    await userEvent.type(screen.getByLabelText("Name"), " 2{Enter}");
    await new Promise((resolve) => setTimeout(resolve, 200));

    server.events.removeAllListeners();
    expect(posts).toEqual([]);
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Extra Tops Deal 2");
  });

  it("keeps the values and lists the API conflicts on 409", async () => {
    const { Wrapper, store } = createWrapper();
    render(<PromotionForm initialValues={topsForm} />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole("button", { name: /create promotion/i }));

    const alert = (await screen.findByText(/overlaps existing promotions/i)).closest(".ant-alert") as HTMLElement;
    const items = within(alert).getAllByRole("listitem");
    expect(items).toHaveLength(10);
    expect(items[0].textContent).toContain("Summer Tops Sale");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Extra Tops Deal");
    expect(screen.getByText(/include active and scheduled promotions/i)).toBeTruthy();
    expect(store.getState().promotions.items.map((p) => p.name)).not.toContain("Extra Tops Deal");
  });

  it("maps 422 messages to fields and shows the unknown ones above the form", async () => {
    server.use(
      http.post("/api/promotions", () =>
        HttpResponse.json({ errors: ["name is required", "coupon service unavailable"] }, { status: 422 })
      )
    );
    const { Wrapper } = createWrapper();
    render(<PromotionForm initialValues={{ ...topsForm, targetCategory: "dresses" }} />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole("button", { name: /create promotion/i }));

    expect(await screen.findByText("Name is required.")).toBeTruthy();
    expect(screen.getByText("coupon service unavailable")).toBeTruthy();
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Extra Tops Deal");
  });

  it("resets the form and calls onCreated after a successful save", async () => {
    const created: string[] = [];
    const { Wrapper, store } = createWrapper();
    render(
      <PromotionForm
        initialValues={{ ...topsForm, targetCategory: "accessories" }}
        onCreated={(p) => created.push(p.name)}
      />,
      { wrapper: Wrapper }
    );

    await userEvent.click(screen.getByRole("button", { name: /create promotion/i }));

    await waitFor(() => expect(created).toEqual(["Extra Tops Deal"]));
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
    expect(store.getState().promotions.items.map((p) => p.name)).toContain("Extra Tops Deal");
  });

  it("lists single-product promotions inside a chosen category before submitting", async () => {
    const { Wrapper } = createWrapper();
    // "New Arrivals Preview" targets p-028…p-030 (all dresses) on 2026-06-18 – 2026-06-21.
    render(<PromotionForm initialValues={{ ...topsForm, targetCategory: "dresses" }} />, { wrapper: Wrapper });

    const title = await screen.findByText(/1 active or scheduled promotion already on this target/i);
    const panel = title.closest(".ant-alert") as HTMLElement;
    expect(within(panel).getByText("New Arrivals Preview")).toBeTruthy();
    expect(within(panel).getByText("Scheduled")).toBeTruthy();
    expect(within(panel).getByText("Overlaps your dates")).toBeTruthy();
    expect(
      within(panel).getByText("Single-product promotion on: Midi Wrap Dress, Floral Maxi Dress, Linen Shirt Dress")
    ).toBeTruthy();
  });

  it("clears the conflict alert when the target changes, keeps it when only the name changes", async () => {
    const { Wrapper } = createWrapper();
    render(<PromotionForm initialValues={topsForm} />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole("button", { name: /create promotion/i }));
    expect(await screen.findByText(/overlaps existing promotions/i)).toBeTruthy();

    await userEvent.type(screen.getByLabelText("Name"), " v2");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Extra Tops Deal v2");
    expect(screen.getByText(/overlaps existing promotions/i)).toBeTruthy();

    await userEvent.click(screen.getByText("Specific products"));
    await waitFor(() => expect(screen.queryByText(/overlaps existing promotions/i)).toBeNull());
  });

  it("clears the conflict alert when the end date changes", async () => {
    const { Wrapper } = createWrapper();
    render(<PromotionForm initialValues={topsForm} />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole("button", { name: /create promotion/i }));
    expect(await screen.findByText(/overlaps existing promotions/i)).toBeTruthy();

    // Pick 2026-06-21 in the End date calendar (the form value is 2026-06-20).
    await userEvent.click(screen.getByLabelText("End date"));
    const cell = await waitFor(() => {
      const td = document.querySelector<HTMLElement>('.ant-picker-dropdown td[title="2026-06-21"]');
      expect(td).not.toBeNull();
      return td!;
    });
    await userEvent.click(cell);

    await waitFor(() => expect(screen.queryByText(/overlaps existing promotions/i)).toBeNull());
    expect((screen.getByLabelText("End date") as HTMLInputElement).value).toContain("21");
  });
});
