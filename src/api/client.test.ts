import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { ApiError } from "./client";
import { api } from "./endpoints";
import type { CreatePromotionRequest } from "./types";

// Runs against the real mock handlers; "today" is frozen at 2026-06-15 (see test/freezeDate.ts).

const base = {
  name: "Test promotion",
  discountType: "percentage_off",
  value: 10,
  startDate: "2026-06-16",
  endDate: "2026-06-20",
} as const;

async function createError(body: CreatePromotionRequest): Promise<ApiError> {
  try {
    await api.createPromotion(body);
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("Expected the request to fail");
}

describe("seeded conflict scenarios (POST /api/promotions → 409)", () => {
  it("rejects a new promotion for the tops category", async () => {
    const error = await createError({ ...base, targetType: "category", targetCategory: "tops" });
    expect(error.status).toBe(409);
    expect(error.conflicts).toHaveLength(10);
    expect(error.conflicts[0]).toContain("Summer Tops Sale");
  });

  it("rejects targeting p-012 or p-013 directly", async () => {
    const error = await createError({ ...base, targetType: "products", targetProductIds: ["p-012", "p-013"] });
    expect(error.status).toBe(409);
    expect(error.conflicts.every((c) => c.includes("Denim Weekend"))).toBe(true);
  });

  it("rejects a new promotion for the outerwear category", async () => {
    const error = await createError({ ...base, targetType: "category", targetCategory: "outerwear" });
    expect(error.status).toBe(409);
    expect(error.conflicts).toHaveLength(7);
    expect(error.conflicts[0]).toContain("Coat Season Kickoff");
  });

  it("treats an overlapping scheduled promotion as a conflict too", async () => {
    // "Black Friday Knitwear" is scheduled for today+7 … today+9 (2026-06-22 – 2026-06-24);
    // the new range only touches its last day, which is inclusive.
    const error = await createError({
      ...base,
      startDate: "2026-06-24",
      endDate: "2026-06-30",
      targetType: "category",
      targetCategory: "knitwear",
    });
    expect(error.status).toBe(409);
    expect(error.conflicts[0]).toContain("Black Friday Knitwear");
  });
});

describe("apiRequest", () => {
  it("reads 422 errors as a string array", async () => {
    const error = await createError({ ...base, name: " ", targetType: "category", targetCategory: "dresses" });
    expect(error.status).toBe(422);
    expect(error.errors).toEqual(["name is required"]);
  });

  it("handles the empty 204 body of DELETE", async () => {
    await expect(api.deletePromotion("promo-001")).resolves.toBeUndefined();
  });

  it("maps a 404 to an ApiError with the API message", async () => {
    await expect(api.getProduct("p-999")).rejects.toMatchObject({ status: 404, message: "Product not found" });
  });

  it("turns a network failure into status 0", async () => {
    server.use(http.get("/api/categories", () => HttpResponse.error()));
    await expect(api.getCategories()).rejects.toMatchObject({ status: 0 });
  });

  it("sends only non-default product filters, always with page and limit", async () => {
    const urls: string[] = [];
    server.events.on("request:start", ({ request }) => urls.push(request.url));
    await api.getProducts({ q: "shirt", category: "", promotionStatus: "all", page: 2, limit: 10 });
    server.events.removeAllListeners();
    expect(new URL(urls[0]).search).toBe("?q=shirt&page=2&limit=10");
  });
});
