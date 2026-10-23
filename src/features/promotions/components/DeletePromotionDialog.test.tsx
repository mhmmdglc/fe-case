import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import * as api from "@/services/promotions.service";
import type { Promotion } from "@/services/types";
import { computeEffectivePrice, formatPrice } from "@/domain/promotion";
import { db, products } from "@/mocks/db";
import { server } from "@/test/server";
import { createWrapper } from "@/test/utils";
import { DeletePromotionDialog } from "./DeletePromotionDialog";
import { usePromotionsQuery } from "../hooks/usePromotionQueries";

// Seed dates with today frozen at 2026-06-15 (src/test/freezeDate.ts):
// promo-001 Summer Tops Sale   tops 20%       2026-06-10..2026-06-25  active, 11 days left, 10 products
// promo-002 Denim Weekend      p-012,p-013    2026-06-13..2026-06-20  active, 6 days left, DENIM15
// promo-004 Black Friday Knit  knitwear 40%   2026-06-22..2026-06-24  scheduled in 7 days, 6 products, BF40
// promo-005 New Arrivals       p-028..p-030   2026-06-18..2026-06-21  scheduled in 3 days
// promo-006 End of Season      bottoms 50%    2026-05-16..2026-05-31  expired 15 days ago, CLEAR50

function seed(id: string): Promotion {
  const promo = db.promotions.find((p) => p.id === id);
  if (!promo) throw new Error(`missing seed ${id}`);
  return promo;
}

function product(id: string) {
  const p = products.find((x) => x.id === id);
  if (!p) throw new Error(`missing product ${id}`);
  return p;
}

/** Adds a promotion to the mock API db (reset before every test) and returns it. */
function addPromotion(promo: Promotion): Promotion {
  db.promotions.push(promo);
  return promo;
}

function PromotionsLoader() {
  usePromotionsQuery();
  return null;
}

function renderDialog(promotion: Promotion, { withList = false } = {}) {
  const onClose = vi.fn();
  const onDeleted = vi.fn();
  const wrapper = createWrapper();
  render(
    <>
      {withList && <PromotionsLoader />}
      <DeletePromotionDialog promotion={promotion} open onClose={onClose} onDeleted={onDeleted} />
    </>,
    { wrapper: wrapper.Wrapper }
  );
  return { ...wrapper, onClose, onDeleted };
}

async function findDialog(name: string) {
  const title = await screen.findByText(`Delete "${name}"?`);
  const dialog = title.closest('[role="dialog"]') as HTMLElement | null;
  expect(dialog).not.toBeNull();
  return dialog as HTMLElement;
}

/** The dialog's text with whitespace collapsed, so sentences can be matched exactly. */
function textOf(el: HTMLElement) {
  return (el.textContent ?? "").replace(/\s+/g, " ");
}

function priceChange(id: string, promo: Promotion) {
  const { basePrice } = product(id);
  return `${formatPrice(computeEffectivePrice(basePrice, promo))} → ${formatPrice(basePrice)}`;
}

describe("DeletePromotionDialog: summary", () => {
  it("active category promotion: 10 products, 6 listed with price change, and 4 more", async () => {
    const promo = seed("promo-001");
    renderDialog(promo);
    const dialog = await findDialog("Summer Tops Sale");

    expect(within(dialog).getByRole("button", { name: "Delete promotion" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeTruthy();

    await within(dialog).findByText("and 4 more");
    const text = textOf(dialog);
    expect(text).toContain("10 products go back to their base price immediately.");
    expect(text).toContain("It would end on 2026-06-25 anyway (11 days left, including today).");
    expect(text).not.toContain("Coupon code");

    const links = within(dialog).getAllByRole("link");
    expect(links).toHaveLength(6);
    const tops = products.filter((p) => p.category === "tops");
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      const match = href.match(/^\/products\/(p-\d{3})$/);
      expect(match, `link href ${href}`).not.toBeNull();
      const id = (match as RegExpMatchArray)[1];
      expect(tops.map((p) => p.id)).toContain(id);
      expect(link.textContent).toContain(product(id).name);
      expect(text).toContain(priceChange(id, promo));
    }
    // The example from the contract: p-001 349,90 at 20% off.
    expect(priceChange("p-001", promo)).toBe("₺279,92 → ₺349,90");
  });

  it("active product promotion with coupon: 2 products and the coupon sentence", async () => {
    const promo = seed("promo-002");
    renderDialog(promo);
    const dialog = await findDialog("Denim Weekend");

    await within(dialog).findByRole("link", { name: /Wide Leg Denim Jeans/ });
    const text = textOf(dialog);
    expect(text).toContain("2 products go back to their base price immediately.");
    expect(text).toContain("It would end on 2026-06-20 anyway (6 days left, including today).");
    expect(text).toContain("Coupon code DENIM15 stops working.");
    expect(text).not.toMatch(/and \d+ more/);

    const links = within(dialog).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href")).sort()).toEqual(["/products/p-012", "/products/p-013"]);
    expect(within(dialog).getByRole("link", { name: /Straight Cut Jeans/ })).toBeTruthy();
    expect(text).toContain(priceChange("p-012", promo));
    expect(text).toContain(priceChange("p-013", promo));
  });

  it("active promotion ending today with a single product", async () => {
    const promo = addPromotion({
      id: "promo-test-ends-today",
      name: "Last Day Tie",
      discountType: "fixed_amount_off",
      value: 30,
      startDate: "2026-06-10",
      endDate: "2026-06-15",
      targetType: "products",
      targetProductIds: ["p-050"],
    });
    renderDialog(promo);
    const dialog = await findDialog("Last Day Tie");

    await within(dialog).findByRole("link", { name: /Patterned Tie/ });
    const text = textOf(dialog);
    // Contract: "1 product" (singular noun); the verb/pronoun form is not pinned down.
    expect(text).toMatch(/\b1 product (go|goes) back to (their|its) base price immediately\./);
    expect(text).not.toContain("1 products");
    expect(text).toContain("It ends today anyway.");
    expect(text).not.toContain("It would end on");
    expect(text).toContain("₺149,90 → ₺179,90");
  });

  it("scheduled promotion: start date, days until start, planned discount, products listed without prices", async () => {
    renderDialog(seed("promo-005"));
    const dialog = await findDialog("New Arrivals Preview");

    await within(dialog).findByRole("link", { name: /Midi Wrap Dress/ });
    const text = textOf(dialog);
    expect(text).toContain(
      "It has not started yet: it starts on 2026-06-18 (in 3 days). Current prices do not change."
    );
    expect(text).toContain("The planned discount on 3 products is cancelled.");
    expect(text).not.toContain("go back to their base price");
    expect(text).not.toContain("Coupon code");
    expect(text).not.toContain("→");

    const links = within(dialog).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href")).sort()).toEqual([
      "/products/p-028",
      "/products/p-029",
      "/products/p-030",
    ]);
    expect(within(dialog).getByRole("link", { name: /Floral Maxi Dress/ })).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: /Linen Shirt Dress/ })).toBeTruthy();
  });

  it("scheduled category promotion with exactly 6 products and a coupon: all listed, no 'more'", async () => {
    renderDialog(seed("promo-004"));
    const dialog = await findDialog("Black Friday Knitwear");

    await within(dialog).findByRole("link", { name: /Merino Wool Sweater/ });
    await waitFor(() => expect(within(dialog).getAllByRole("link")).toHaveLength(6));
    const text = textOf(dialog);
    expect(text).toContain(
      "It has not started yet: it starts on 2026-06-22 (in 7 days). Current prices do not change."
    );
    expect(text).toContain("The planned discount on 6 products is cancelled.");
    expect(text).toContain("Coupon code BF40 stops working.");
    expect(text).not.toMatch(/and \d+ more/);
  });

  it("scheduled promotion starting tomorrow with one product uses the singular", async () => {
    const promo = addPromotion({
      id: "promo-test-tomorrow",
      name: "Tomorrow Bag",
      discountType: "percentage_off",
      value: 10,
      startDate: "2026-06-16",
      endDate: "2026-06-20",
      targetType: "products",
      targetProductIds: ["p-049"],
    });
    renderDialog(promo);
    const dialog = await findDialog("Tomorrow Bag");

    await within(dialog).findByRole("link", { name: /Suede Crossbody Bag/ });
    const text = textOf(dialog);
    expect(text).toContain(
      "It has not started yet: it starts on 2026-06-16 (in 1 day). Current prices do not change."
    );
    expect(text).toContain("The planned discount on 1 product is cancelled.");
  });

  it("expired promotion: end date and days ago, no product list and no coupon sentence", async () => {
    renderDialog(seed("promo-006"));
    const dialog = await findDialog("End of Season Clearance");

    await waitFor(() =>
      expect(textOf(dialog)).toContain(
        "It already ended on 2026-05-31 (15 days ago). No prices change; only the record is removed."
      )
    );
    const text = textOf(dialog);
    expect(text).not.toContain("Coupon code");
    expect(text).not.toContain("CLEAR50 stops working");
    expect(text).not.toContain("go back to their base price");
    expect(within(dialog).queryAllByRole("link")).toHaveLength(0);
    expect(within(dialog).getByRole("button", { name: "Delete promotion" })).toBeTruthy();
  });

  it("expired yesterday uses the singular day", async () => {
    const promo = addPromotion({
      id: "promo-test-yesterday",
      name: "Yesterday Socks",
      discountType: "percentage_off",
      value: 10,
      startDate: "2026-06-01",
      endDate: "2026-06-14",
      couponCode: "SOCKS",
      targetType: "products",
      targetProductIds: ["p-047"],
    });
    renderDialog(promo);
    const dialog = await findDialog("Yesterday Socks");

    await waitFor(() =>
      expect(textOf(dialog)).toContain(
        "It already ended on 2026-06-14 (1 day ago). No prices change; only the record is removed."
      )
    );
    expect(textOf(dialog)).not.toContain("Coupon code");
    expect(within(dialog).queryAllByRole("link")).toHaveLength(0);
  });
});

describe("DeletePromotionDialog: actions", () => {
  it("deletes on confirm: gone from Redux and the API, onClose and onDeleted called", async () => {
    const { store, onClose, onDeleted } = renderDialog(seed("promo-002"), { withList: true });
    await waitFor(() =>
      expect(store.getState().promotions.items.map((p) => p.id)).toContain("promo-002")
    );
    const dialog = await findDialog("Denim Weekend");

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete promotion" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();
    expect(store.getState().promotions.items.map((p) => p.id)).not.toContain("promo-002");
    expect(db.promotions.map((p) => p.id)).not.toContain("promo-002");
    await expect(api.getPromotion("promo-002")).rejects.toMatchObject({ status: 404 });
  });

  it("cancel closes without deleting", async () => {
    const { onClose, onDeleted } = renderDialog(seed("promo-001"));
    const dialog = await findDialog("Summer Tops Sale");

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDeleted).not.toHaveBeenCalled();
    expect(db.promotions.map((p) => p.id)).toContain("promo-001");
  });

  it.each([
    [404, "Promotion not found"],
    [500, "Internal server error"],
  ])("stays open and shows the error inside on a %i", async (status, error) => {
    server.use(http.delete("/api/promotions/:id", () => HttpResponse.json({ error }, { status })));
    const { store, onClose, onDeleted } = renderDialog(seed("promo-002"), { withList: true });
    await waitFor(() =>
      expect(store.getState().promotions.items.map((p) => p.id)).toContain("promo-002")
    );
    const dialog = await findDialog("Denim Weekend");

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete promotion" }));

    // The app shows ApiError messages (the API's `error` field) as-is.
    const shown = await within(dialog).findByText(error);
    expect(shown.closest('[role="alert"]')).not.toBeNull();
    expect(screen.getByText('Delete "Denim Weekend"?')).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Delete promotion" })).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(store.getState().promotions.items.map((p) => p.id)).toContain("promo-002");
    expect(db.promotions.map((p) => p.id)).toContain("promo-002");
  });
});
