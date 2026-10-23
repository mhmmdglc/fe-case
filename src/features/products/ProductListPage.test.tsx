import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "../../test/server";
import { createWrapper } from "../../test/utils";
import { ProductListPage } from "./ProductListPage";

// "today" is frozen at 2026-06-15 (see test/freezeDate.ts). Expectations come from the
// seed (src/mocks/db.ts) and the mock API contract, not from the page's internals.

const SHIRT_PRODUCTS = [
  "Slim Fit Oxford Shirt",
  "Relaxed Linen Shirt",
  "Striped Cotton Shirt",
  "Classic White Shirt",
  "Oversized Flannel Shirt",
  "Crew Neck Sweatshirt",
  "Linen Shirt Dress",
  "Fine Knit Polo Shirt",
];

const tl = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

let productRequests: URL[] = [];
const onRequest = ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  if (url.pathname === "/api/products") productRequests.push(url);
};

beforeEach(() => {
  productRequests = [];
  server.events.on("request:start", onRequest);
});
afterEach(() => {
  server.events.removeListener("request:start", onRequest);
});

const lastProductRequest = () => productRequests[productRequests.length - 1];

function renderPage() {
  const { Wrapper, store } = createWrapper();
  const user = userEvent.setup();
  render(<ProductListPage />, { wrapper: Wrapper });
  return { user, store };
}

/** Shown by the pagination's showTotal; proves the response for a filter set has rendered. */
const findTotal = (total: number) => screen.findByText(`${total} products`, {}, { timeout: 3000 });

async function clearSearch(user: ReturnType<typeof userEvent.setup>) {
  const input = screen.getByRole("searchbox", { name: "Search by product name" });
  await user.clear(input);
  await findTotal(50);
  await waitFor(() => expect(lastProductRequest().searchParams.get("q") ?? "").toBe(""));
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  selectLabel: string,
  optionTitle: string
) {
  await user.click(screen.getByRole("combobox", { name: selectLabel }));
  // Ant Design renders each visible option with a title attribute in the popup.
  const option = await waitFor(() => {
    const el = document.querySelector<HTMLElement>(`.ant-select-item-option[title="${optionTitle}"]`);
    expect(el).not.toBeNull();
    return el!;
  });
  await user.click(option);
}

describe("ProductListPage", () => {
  it("first render: requests q=shirt, page=1, limit=10 and shows only the 8 shirt products", async () => {
    renderPage();

    expect(await screen.findByText("Slim Fit Oxford Shirt", {}, { timeout: 3000 })).toBeTruthy();
    const first = productRequests[0];
    expect(first.searchParams.get("q")).toBe("shirt");
    expect(first.searchParams.get("page")).toBe("1");
    expect(first.searchParams.get("limit")).toBe("10");

    await findTotal(8);
    for (const name of SHIRT_PRODUCTS) expect(screen.getByText(name)).toBeTruthy();
    expect(screen.queryByText("Wide Leg Denim Jeans")).toBeNull();
    expect((screen.getByRole("searchbox", { name: "Search by product name" }) as HTMLInputElement).value).toBe("shirt");
  });

  it("clearing the search requests without q, shows all 50 products and does not revert to 'shirt'", async () => {
    const { user, store } = renderPage();
    await findTotal(8);

    await clearSearch(user);
    // Page 1 of the unfiltered list now contains non-shirt tops such as p-008.
    expect(screen.getByText("Essential Cotton Tee")).toBeTruthy();

    // A later interaction must still be unfiltered: the cleared search stays cleared.
    await user.click(screen.getByTitle("2"));
    await waitFor(() => expect(lastProductRequest().searchParams.get("page")).toBe("2"));
    expect(lastProductRequest().searchParams.get("q") ?? "").toBe("");
    await findTotal(50);
    expect((screen.getByRole("searchbox", { name: "Search by product name" }) as HTMLInputElement).value).toBe("");
    expect(store.getState().productFilters.q).toBe("");
    expect(productRequests.slice(1).every((u) => (u.searchParams.get("q") ?? "") !== "shirt")).toBe(true);
  });

  it("clearing via the input's clear button also removes the search", async () => {
    const { user } = renderPage();
    await findTotal(8);

    const searchBox = screen.getByRole("searchbox", { name: "Search by product name" });
    const clearButton = searchBox.parentElement!.querySelector<HTMLElement>(".ant-input-clear-icon");
    expect(clearButton).not.toBeNull();
    await user.click(clearButton!);

    await findTotal(50);
    expect(lastProductRequest().searchParams.get("q") ?? "").toBe("");
    expect((searchBox as HTMLInputElement).value).toBe("");
  });

  it("pagination: clicking page 2 requests page=2 with limit=10", async () => {
    const { user } = renderPage();
    await findTotal(8);
    await clearSearch(user);

    await user.click(screen.getByTitle("2"));
    await waitFor(() => expect(lastProductRequest().searchParams.get("page")).toBe("2"));
    expect(lastProductRequest().searchParams.get("limit")).toBe("10");
    // Page 2 of the unfiltered list starts with p-011.
    expect(await screen.findByText("Slim Fit Chino Trousers", {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByText("Slim Fit Oxford Shirt")).toBeNull();
  });

  it("choosing a category sends category=... and resets to page 1", async () => {
    const { user } = renderPage();
    await findTotal(8);
    await clearSearch(user);
    await user.click(screen.getByTitle("2"));
    await waitFor(() => expect(lastProductRequest().searchParams.get("page")).toBe("2"));

    await chooseOption(user, "Filter by category", "Accessories");

    await waitFor(() => expect(lastProductRequest().searchParams.get("category")).toBe("accessories"));
    expect(lastProductRequest().searchParams.get("page")).toBe("1");
    await findTotal(11);
    expect(screen.getByText("Wool Scarf")).toBeTruthy();
    expect(screen.getByTitle("1").className).toMatch(/active/);
  });

  it("choosing a promotion status sends promotionStatus=... and resets to page 1", async () => {
    const { user } = renderPage();
    await findTotal(8);
    await clearSearch(user);
    await user.click(screen.getByTitle("2"));
    await waitFor(() => expect(lastProductRequest().searchParams.get("page")).toBe("2"));

    await chooseOption(user, "Filter by promotion status", "On promotion");

    await waitFor(() => expect(lastProductRequest().searchParams.get("promotionStatus")).toBe("on_promotion"));
    expect(lastProductRequest().searchParams.get("page")).toBe("1");
    // Active today: tops p-001..p-010, jeans p-012/p-013, outerwear p-021..p-027.
    await findTotal(19);
  });

  it("rows show base and effective price, the promotion name, or 'not on promotion'", async () => {
    renderPage();
    await findTotal(8);

    // p-001: tops, "Summer Tops Sale" 20% → 349.90 * 0.8 = 279.92
    const onPromo = screen.getByText("Slim Fit Oxford Shirt").closest("tr")!;
    expect(within(onPromo).getAllByText(tl(349.9)).length).toBeGreaterThanOrEqual(1);
    expect(within(onPromo).getByText(tl(279.92))).toBeTruthy();
    expect(within(onPromo).getByText("Summer Tops Sale")).toBeTruthy();
    expect(within(onPromo).getByText(/on promotion/i)).toBeTruthy();

    // p-039: knitwear, no active promotion today → base == effective price.
    const noPromo = screen.getByText("Fine Knit Polo Shirt").closest("tr")!;
    expect(within(noPromo).getAllByText(tl(499.9)).length).toBeGreaterThanOrEqual(2);
    expect(within(noPromo).getByText(/no promotion/i)).toBeTruthy();
    expect(within(noPromo).queryByText("Summer Tops Sale")).toBeNull();
  });
});
