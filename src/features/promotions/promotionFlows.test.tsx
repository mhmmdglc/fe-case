import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { emptyPromotionForm, type PromotionFormValues } from "../../domain/promotionForm";
import { server } from "../../test/server";
import { createWrapper } from "../../test/utils";
import { PromotionForm } from "./PromotionForm";
import { useCreatePromotion, usePromotionsQuery } from "./queries";

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

function renderPromotionHooks() {
  const { Wrapper, store, queryClient } = createWrapper();
  const hook = renderHook(() => ({ list: usePromotionsQuery(), create: useCreatePromotion() }), {
    wrapper: Wrapper,
  });
  return { ...hook, store, queryClient };
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

  it("keeps the values and lists the API conflicts on 409", async () => {
    const { Wrapper, store } = createWrapper();
    render(<PromotionForm initialValues={topsForm} />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole("button", { name: /create promotion/i }));

    const alert = (await screen.findByText(/overlaps existing promotions/i)).closest(".ant-alert") as HTMLElement;
    const items = within(alert).getAllByRole("listitem");
    expect(items).toHaveLength(10);
    expect(items[0].textContent).toContain("Summer Tops Sale");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Extra Tops Deal");
    expect(store.getState().promotions.items).toEqual([]);
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
    expect(store.getState().promotions.items.map((p) => p.name)).toEqual(["Extra Tops Deal"]);
  });
});
