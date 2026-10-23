import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Promotion } from "../../api/types";
import { db } from "../../mocks/db";
import { createWrapper } from "../../test/utils";
import { PromotionFormDrawer } from "./PromotionFormDrawer";

const COPY_INFO =
  "This is a copy. Change the dates or the target before saving: overlapping promotions on the same products are rejected. The original stays unchanged.";

function seed(id: string): Promotion {
  const promo = db.promotions.find((p) => p.id === id);
  if (!promo) throw new Error(`missing seed ${id}`);
  return promo;
}

function renderDrawer(source?: Promotion) {
  const onClose = vi.fn();
  const wrapper = createWrapper();
  render(<PromotionFormDrawer open onClose={onClose} source={source} />, { wrapper: wrapper.Wrapper });
  return { ...wrapper, onClose };
}

const nameInput = () => screen.getByLabelText("Name") as HTMLInputElement;
/** A duplicate of a product promotion loads its products before the form is shown. */
const findNameInput = async () => (await screen.findByLabelText("Name")) as HTMLInputElement;

/**
 * The picker uses maxTagCount="responsive", which renders no tags in jsdom (no layout,
 * so every tag is collapsed). The selection is checked through the picker instead:
 * search for the products and expect their options to be marked selected.
 */
async function expectSelectedProducts(labels: string[]) {
  const picker = screen.getByRole("combobox", { name: "Products" });
  await userEvent.click(picker);
  await userEvent.type(picker, "Jeans");
  for (const label of labels) {
    const option = (await screen.findByTitle(label)).closest(".ant-select-item-option");
    expect(option, label).not.toBeNull();
    expect(option?.className, label).toContain("ant-select-item-option-selected");
  }
}

describe("PromotionFormDrawer", () => {
  it("new promotion: title, empty name, no copy notice", async () => {
    renderDrawer();

    expect(await screen.findByText("New promotion")).toBeTruthy();
    expect(screen.queryByText(/^Duplicate "/)).toBeNull();
    expect(screen.queryByText(COPY_INFO)).toBeNull();
    expect((await findNameInput()).value).toBe("");
  });

  it("duplicate of a product promotion: title, notice, prefilled name, coupon and product tags", async () => {
    renderDrawer(seed("promo-002"));

    expect(await screen.findByText('Duplicate "Denim Weekend"')).toBeTruthy();
    expect(screen.getByText(COPY_INFO)).toBeTruthy();
    expect((await findNameInput()).value).toBe("Denim Weekend (copy)");
    expect(screen.getByDisplayValue("DENIM15")).toBeTruthy();
    await expectSelectedProducts(["Wide Leg Denim Jeans · BOT-JNS-001", "Straight Cut Jeans · BOT-JNS-002"]);
  });

  it("duplicate of a category promotion: prefilled name and no coupon", async () => {
    renderDrawer(seed("promo-001"));

    expect(await screen.findByText('Duplicate "Summer Tops Sale"')).toBeTruthy();
    expect(screen.getByText(COPY_INFO)).toBeTruthy();
    expect((await findNameInput()).value).toBe("Summer Tops Sale (copy)");
  });

  it("saving the unchanged copy of an active promotion shows the 409 conflict with the original", async () => {
    const original = structuredClone(seed("promo-002"));
    const { store } = renderDrawer(seed("promo-002"));
    await findNameInput();

    await userEvent.click(screen.getByRole("button", { name: /create promotion/i }));

    const alert = (await screen.findByText(/overlaps existing promotions/i)).closest(".ant-alert") as HTMLElement;
    expect(alert).not.toBeNull();
    const items = within(alert).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    for (const item of items) expect(item.textContent).toContain("Denim Weekend");
    expect(alert.textContent).toContain("Wide Leg Denim Jeans");
    expect(alert.textContent).toContain("Straight Cut Jeans");

    // Still open with the values kept; the original is untouched and no copy was created.
    expect(screen.getByText('Duplicate "Denim Weekend"')).toBeTruthy();
    expect(nameInput().value).toBe("Denim Weekend (copy)");
    expect(db.promotions.find((p) => p.id === "promo-002")).toEqual(original);
    expect(db.promotions.map((p) => p.name)).not.toContain("Denim Weekend (copy)");
    expect(store.getState().promotions.items.map((p) => p.name)).not.toContain("Denim Weekend (copy)");
  });
});
