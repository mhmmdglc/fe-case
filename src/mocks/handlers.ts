import { http, HttpResponse } from "msw";
import { db, Promotion } from "./db";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];

function isActive(promo: Promotion): boolean {
  const t = today();
  return promo.startDate <= t && t <= promo.endDate;
}

function isScheduled(promo: Promotion): boolean {
  return promo.startDate > today();
}

function getStatus(promo: Promotion): "Active" | "Scheduled" | "Expired" {
  if (isActive(promo)) return "Active";
  if (isScheduled(promo)) return "Scheduled";
  return "Expired";
}

/** Returns the single active promotion for a product, if any. */
function getActivePromotionForProduct(productId: string): Promotion | null {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return null;

  return (
    db.promotions.find((promo) => {
      if (!isActive(promo)) return false;
      if (promo.targetType === "products") {
        return promo.targetProductIds?.includes(productId);
      }
      if (promo.targetType === "category") {
        return promo.targetCategory === product.category;
      }
      return false;
    }) ?? null
  );
}

function computeEffectivePrice(basePrice: number, promo: Promotion | null): number {
  if (!promo) return basePrice;
  if (promo.discountType === "percentage_off") {
    return Math.max(0, basePrice * (1 - promo.value / 100));
  }
  return Math.max(0, basePrice - promo.value);
}

/**
 * Conflict check: does the new promotion's date range overlap with any
 * existing ACTIVE or SCHEDULED promotion that targets the same product(s)?
 *
 * Returns an array of conflict descriptions (empty = no conflicts).
 */
function detectConflicts(
  targetType: "products" | "category",
  targetProductIds: string[] | undefined,
  targetCategory: string | undefined,
  startDate: string,
  endDate: string,
  excludePromoId?: string
): string[] {
  const conflicts: string[] = [];

  // Determine affected product IDs
  let affectedProductIds: string[] = [];
  if (targetType === "products" && targetProductIds) {
    affectedProductIds = targetProductIds;
  } else if (targetType === "category" && targetCategory) {
    affectedProductIds = db.products
      .filter((p) => p.category === targetCategory)
      .map((p) => p.id);
  }

  for (const productId of affectedProductIds) {
    const existing = db.promotions.filter((promo) => {
      if (promo.id === excludePromoId) return false;
      if (getStatus(promo) === "Expired") return false;

      const overlaps =
        promo.startDate <= endDate && promo.endDate >= startDate;
      if (!overlaps) return false;

      if (promo.targetType === "products") {
        return promo.targetProductIds?.includes(productId);
      }
      if (promo.targetType === "category") {
        const product = db.products.find((p) => p.id === productId);
        return product?.category === promo.targetCategory;
      }
      return false;
    });

    for (const conflict of existing) {
      const product = db.products.find((p) => p.id === productId);
      conflicts.push(
        `"${product?.name}" (${product?.sku}) already has an overlapping promotion: "${conflict.name}" (${conflict.startDate} – ${conflict.endDate})`
      );
    }
  }

  return conflicts;
}

// ─── HANDLERS ────────────────────────────────────────────────────────────────

export const handlers = [

  // GET /api/categories
  http.get("/api/categories", () => {
    const cats = [...new Set(db.products.map((p) => p.category))].sort();
    return HttpResponse.json(cats);
  }),

  // GET /api/products?q=&category=&page=1&limit=10&promotionStatus=all|on_promotion|no_promotion
  http.get("/api/products", ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();
    const category = url.searchParams.get("category") ?? "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10));
    const promotionStatus = url.searchParams.get("promotionStatus") ?? "all";

    let filtered = db.products;

    if (q) {
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    if (promotionStatus === "on_promotion") {
      filtered = filtered.filter((p) => getActivePromotionForProduct(p.id) !== null);
    } else if (promotionStatus === "no_promotion") {
      filtered = filtered.filter((p) => getActivePromotionForProduct(p.id) === null);
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const items = paginated.map((p) => {
      const promo = getActivePromotionForProduct(p.id);
      return {
        ...p,
        effectivePrice: computeEffectivePrice(p.basePrice, promo),
        activePromotion: promo
          ? { id: promo.id, name: promo.name, discountType: promo.discountType, value: promo.value }
          : null,
      };
    });

    return HttpResponse.json({ products: items, total, page, limit });
  }),

  // GET /api/products/:id
  http.get("/api/products/:id", ({ params }) => {
    const product = db.products.find((p) => p.id === params.id);
    if (!product) {
      return HttpResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const promo = getActivePromotionForProduct(product.id);
    const allProductPromos = db.promotions.filter((promo) => {
      if (promo.targetType === "products") return promo.targetProductIds?.includes(product.id);
      if (promo.targetType === "category") return promo.targetCategory === product.category;
      return false;
    });

    return HttpResponse.json({
      ...product,
      effectivePrice: computeEffectivePrice(product.basePrice, promo),
      activePromotion: promo
        ? { ...promo, status: getStatus(promo) }
        : null,
      allPromotions: allProductPromos.map((p) => ({ ...p, status: getStatus(p) })),
    });
  }),

  // GET /api/promotions
  http.get("/api/promotions", () => {
    const result = db.promotions.map((promo) => ({
      ...promo,
      status: getStatus(promo),
      affectedProductCount:
        promo.targetType === "products"
          ? (promo.targetProductIds?.length ?? 0)
          : db.products.filter((p) => p.category === promo.targetCategory).length,
    }));
    return HttpResponse.json(result);
  }),

  // GET /api/promotions/:id
  http.get("/api/promotions/:id", ({ params }) => {
    const promo = db.promotions.find((p) => p.id === params.id);
    if (!promo) {
      return HttpResponse.json({ error: "Promotion not found" }, { status: 404 });
    }
    return HttpResponse.json({ ...promo, status: getStatus(promo) });
  }),

  // POST /api/promotions/preview
  // Bonus feature: computes affected products and effective prices before form submission
  http.post("/api/promotions/preview", async ({ request }) => {
    const body = (await request.json()) as Partial<Promotion>;

    const {
      discountType,
      value,
      targetType,
      targetProductIds,
      targetCategory,
      startDate,
      endDate,
    } = body;

    if (!discountType || value == null || !targetType || !startDate || !endDate) {
      return HttpResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let affectedProducts = db.products;
    if (targetType === "products" && targetProductIds) {
      affectedProducts = db.products.filter((p) => targetProductIds.includes(p.id));
    } else if (targetType === "category" && targetCategory) {
      affectedProducts = db.products.filter((p) => p.category === targetCategory);
    }

    const mockPromo: Promotion = {
      id: "__preview__",
      name: "Preview",
      discountType: discountType as Promotion["discountType"],
      value,
      startDate,
      endDate,
      targetType,
      targetProductIds,
      targetCategory,
    };

    const preview = affectedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      basePrice: p.basePrice,
      effectivePrice: computeEffectivePrice(p.basePrice, mockPromo),
      discount:
        discountType === "percentage_off"
          ? `%${value} off`
          : `${value} TL off`,
    }));

    const conflicts = detectConflicts(
      targetType,
      targetProductIds,
      targetCategory,
      startDate,
      endDate
    );

    return HttpResponse.json({ preview, conflicts });
  }),

  // POST /api/promotions
  http.post("/api/promotions", async ({ request }) => {
    const body = (await request.json()) as Omit<Promotion, "id">;

    const {
      name,
      discountType,
      value,
      startDate,
      endDate,
      couponCode,
      targetType,
      targetProductIds,
      targetCategory,
    } = body;

    // ── Validation ──
    const errors: string[] = [];
    if (!name?.trim()) errors.push("name is required");
    if (!discountType) errors.push("discountType is required");
    if (value == null || value <= 0) errors.push("value must be positive");
    if (discountType === "percentage_off" && value > 100)
      errors.push("percentage_off value cannot exceed 100");
    if (!startDate) errors.push("startDate is required");
    if (!endDate) errors.push("endDate is required");
    if (startDate && endDate && endDate <= startDate)
      errors.push("endDate must be after startDate");
    if (targetType === "products" && (!targetProductIds || targetProductIds.length === 0))
      errors.push("at least one product must be selected");
    if (targetType === "category" && !targetCategory)
      errors.push("category is required");

    if (errors.length > 0) {
      return HttpResponse.json({ errors }, { status: 422 });
    }

    // ── Conflict detection ──
    const conflicts = detectConflicts(
      targetType,
      targetProductIds,
      targetCategory,
      startDate,
      endDate
    );

    if (conflicts.length > 0) {
      return HttpResponse.json(
        { error: "Promotion conflicts detected", conflicts },
        { status: 409 }
      );
    }

    // ── Persist ──
    const newPromo: Promotion = {
      id: `promo-${Date.now()}`,
      name: name.trim(),
      discountType,
      value,
      startDate,
      endDate,
      ...(couponCode ? { couponCode } : {}),
      targetType,
      ...(targetType === "products" ? { targetProductIds } : {}),
      ...(targetType === "category" ? { targetCategory } : {}),
    };

    db.promotions.push(newPromo);

    return HttpResponse.json(
      { ...newPromo, status: getStatus(newPromo) },
      { status: 201 }
    );
  }),

  // DELETE /api/promotions/:id
  http.delete("/api/promotions/:id", ({ params }) => {
    const index = db.promotions.findIndex((p) => p.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: "Promotion not found" }, { status: 404 });
    }
    db.promotions.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
