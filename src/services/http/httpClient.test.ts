import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { server } from "@/test/server";
import { ApiError, setUnreachableApiHandler } from "./httpClient";
import * as api from "@/services";
import type { CreatePromotionRequest } from "@/services/types";

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

describe("recovering when a request bypasses the API", () => {
  afterEach(() => setUnreachableApiHandler(null));

  it("re-attaches once and retries after a network failure", async () => {
    let reconnects = 0;
    setUnreachableApiHandler(async () => {
      reconnects += 1;
    });
    server.use(http.get("/api/categories", () => HttpResponse.error(), { once: true }));

    await expect(api.getCategories()).resolves.toContain("tops");
    expect(reconnects).toBe(1);
  });

  it("treats an HTML page (SPA fallback) as unreachable and retries", async () => {
    let reconnects = 0;
    setUnreachableApiHandler(async () => {
      reconnects += 1;
    });
    server.use(
      http.get("/api/categories", () => HttpResponse.html("<!doctype html><div id=root></div>"), { once: true })
    );

    await expect(api.getCategories()).resolves.toContain("tops");
    expect(reconnects).toBe(1);
  });

  it("reports status 0 when the retry fails too", async () => {
    setUnreachableApiHandler(async () => {});
    server.use(http.get("/api/categories", () => HttpResponse.error()));

    await expect(api.getCategories()).rejects.toMatchObject({ status: 0 });
  });

  it("treats a bodiless 404 on POST as unreachable, reconnects once and the retry creates (201)", async () => {
    let reconnects = 0;
    setUnreachableApiHandler(async () => {
      reconnects += 1;
    });
    const statuses: number[] = [];
    server.events.on("response:mocked", ({ request, response }) => {
      if (request.method === "POST") statuses.push(response.status);
    });
    server.use(http.post("/api/promotions", () => new HttpResponse(null, { status: 404 }), { once: true }));

    const created = await api.createPromotion({ ...base, targetType: "category", targetCategory: "accessories" });
    server.events.removeAllListeners();

    expect(created).toMatchObject({ name: "Test promotion", targetCategory: "accessories" });
    expect(reconnects).toBe(1);
    expect(statuses).toEqual([404, 201]);
  });

  it("treats a bodiless 404 on DELETE as unreachable, reconnects once and the retry deletes (204)", async () => {
    let reconnects = 0;
    setUnreachableApiHandler(async () => {
      reconnects += 1;
    });
    const statuses: number[] = [];
    server.events.on("response:mocked", ({ request, response }) => {
      if (request.method === "DELETE") statuses.push(response.status);
    });
    server.use(http.delete("/api/promotions/:id", () => new HttpResponse(null, { status: 404 }), { once: true }));

    await expect(api.deletePromotion("promo-001")).resolves.toBeUndefined();
    server.events.removeAllListeners();

    expect(reconnects).toBe(1);
    expect(statuses).toEqual([404, 204]);
    await expect(api.getPromotion("promo-001")).rejects.toMatchObject({ status: 404 });
  });

  it("does not reconnect on a real JSON 404 and rejects with its message", async () => {
    let reconnects = 0;
    setUnreachableApiHandler(async () => {
      reconnects += 1;
    });
    server.use(
      http.delete("/api/promotions/:id", () => HttpResponse.json({ error: "Promotion not found" }, { status: 404 }))
    );

    await expect(api.deletePromotion("promo-001")).rejects.toMatchObject({
      status: 404,
      message: "Promotion not found",
    });
    expect(reconnects).toBe(0);
  });
});
