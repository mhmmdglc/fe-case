import { render, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { makeStore } from "../../app/store";
import { createWrapper, makeTestQueryClient } from "../../test/utils";
import { PromotionDetailPage } from "./PromotionDetailPage";

function renderAt(path: string) {
  const { Wrapper } = createWrapper(makeStore(), makeTestQueryClient(), [path]);
  render(
    <Routes>
      <Route path="/promotions/:id" element={<PromotionDetailPage />} />
    </Routes>,
    { wrapper: Wrapper }
  );
}

describe("PromotionDetailPage", () => {
  it("shows the coupon and links every product the promotion covers", async () => {
    renderAt("/promotions/promo-002"); // "Denim Weekend", DENIM15, p-012 and p-013

    expect(await screen.findByRole("heading", { name: "Denim Weekend" })).toBeTruthy();
    expect(screen.getByText("DENIM15")).toBeTruthy();
    const jeans = await screen.findByRole("link", { name: "Wide Leg Denim Jeans" });
    expect(jeans.getAttribute("href")).toBe("/products/p-012");
    expect(screen.getByRole("link", { name: "Straight Cut Jeans" }).getAttribute("href")).toBe("/products/p-013");
  });

  it("lists every product of a category promotion", async () => {
    renderAt("/promotions/promo-003"); // "Coat Season Kickoff", outerwear (7 products)

    expect(await screen.findByText("Products covered (7)")).toBeTruthy();
  });

  it("shows a not-found page for an unknown id", async () => {
    renderAt("/promotions/promo-999");

    expect(await screen.findByText("Promotion not found")).toBeTruthy();
  });
});
