export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  basePrice: number;
  stockQuantity: number;
}

export interface Promotion {
  id: string;
  name: string;
  discountType: "percentage_off" | "fixed_amount_off";
  value: number;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;
  couponCode?: string;
  targetType: "products" | "category";
  targetProductIds?: string[];
  targetCategory?: string;
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export const products: Product[] = [
  // TOPS
  { id: "p-001", name: "Slim Fit Oxford Shirt", sku: "TOP-SHR-001", category: "tops", basePrice: 349.90, stockQuantity: 84 },
  { id: "p-002", name: "Relaxed Linen Shirt", sku: "TOP-SHR-002", category: "tops", basePrice: 299.90, stockQuantity: 56 },
  { id: "p-003", name: "Striped Cotton Shirt", sku: "TOP-SHR-003", category: "tops", basePrice: 319.90, stockQuantity: 42 },
  { id: "p-004", name: "Classic White Shirt", sku: "TOP-SHR-004", category: "tops", basePrice: 279.90, stockQuantity: 130 },
  { id: "p-005", name: "Oversized Flannel Shirt", sku: "TOP-SHR-005", category: "tops", basePrice: 389.90, stockQuantity: 27 },
  { id: "p-006", name: "Crew Neck Sweatshirt", sku: "TOP-SWT-001", category: "tops", basePrice: 449.90, stockQuantity: 65 },
  { id: "p-007", name: "Zip-Up Hoodie", sku: "TOP-SWT-002", category: "tops", basePrice: 529.90, stockQuantity: 38 },
  { id: "p-008", name: "Essential Cotton Tee", sku: "TOP-TSH-001", category: "tops", basePrice: 149.90, stockQuantity: 210 },
  { id: "p-009", name: "Graphic Print Tee", sku: "TOP-TSH-002", category: "tops", basePrice: 179.90, stockQuantity: 93 },
  { id: "p-010", name: "Ribbed Turtleneck", sku: "TOP-KNT-001", category: "tops", basePrice: 399.90, stockQuantity: 41 },

  // BOTTOMS
  { id: "p-011", name: "Slim Fit Chino Trousers", sku: "BOT-CHN-001", category: "bottoms", basePrice: 459.90, stockQuantity: 72 },
  { id: "p-012", name: "Wide Leg Denim Jeans", sku: "BOT-JNS-001", category: "bottoms", basePrice: 549.90, stockQuantity: 48 },
  { id: "p-013", name: "Straight Cut Jeans", sku: "BOT-JNS-002", category: "bottoms", basePrice: 499.90, stockQuantity: 61 },
  { id: "p-014", name: "Cargo Trousers", sku: "BOT-TRS-001", category: "bottoms", basePrice: 529.90, stockQuantity: 34 },
  { id: "p-015", name: "Tailored Wool Trousers", sku: "BOT-TRS-002", category: "bottoms", basePrice: 699.90, stockQuantity: 19 },
  { id: "p-016", name: "Jogger Sweatpants", sku: "BOT-SWP-001", category: "bottoms", basePrice: 349.90, stockQuantity: 88 },
  { id: "p-017", name: "Pleated Linen Trousers", sku: "BOT-TRS-003", category: "bottoms", basePrice: 579.90, stockQuantity: 26 },
  { id: "p-018", name: "Bermuda Shorts", sku: "BOT-SHT-001", category: "bottoms", basePrice: 289.90, stockQuantity: 54 },
  { id: "p-019", name: "Denim Shorts", sku: "BOT-SHT-002", category: "bottoms", basePrice: 319.90, stockQuantity: 47 },
  { id: "p-020", name: "Slim Fit Suit Trousers", sku: "BOT-SUT-001", category: "bottoms", basePrice: 749.90, stockQuantity: 15 },

  // OUTERWEAR
  { id: "p-021", name: "Classic Trench Coat", sku: "OUT-TRN-001", category: "outerwear", basePrice: 1299.90, stockQuantity: 22 },
  { id: "p-022", name: "Quilted Puffer Jacket", sku: "OUT-PUF-001", category: "outerwear", basePrice: 899.90, stockQuantity: 35 },
  { id: "p-023", name: "Wool Blend Overcoat", sku: "OUT-OVR-001", category: "outerwear", basePrice: 1599.90, stockQuantity: 11 },
  { id: "p-024", name: "Denim Jacket", sku: "OUT-DNM-001", category: "outerwear", basePrice: 649.90, stockQuantity: 43 },
  { id: "p-025", name: "Bomber Jacket", sku: "OUT-BMB-001", category: "outerwear", basePrice: 799.90, stockQuantity: 29 },
  { id: "p-026", name: "Lightweight Windbreaker", sku: "OUT-WND-001", category: "outerwear", basePrice: 549.90, stockQuantity: 38 },
  { id: "p-027", name: "Sherpa Fleece Jacket", sku: "OUT-FLC-001", category: "outerwear", basePrice: 699.90, stockQuantity: 31 },

  // DRESSES & SKIRTS
  { id: "p-028", name: "Midi Wrap Dress", sku: "DRS-WRP-001", category: "dresses", basePrice: 599.90, stockQuantity: 44 },
  { id: "p-029", name: "Floral Maxi Dress", sku: "DRS-MAX-001", category: "dresses", basePrice: 649.90, stockQuantity: 33 },
  { id: "p-030", name: "Linen Shirt Dress", sku: "DRS-SHR-001", category: "dresses", basePrice: 549.90, stockQuantity: 28 },
  { id: "p-031", name: "Pleated Mini Skirt", sku: "SKT-MIN-001", category: "dresses", basePrice: 349.90, stockQuantity: 52 },
  { id: "p-032", name: "A-Line Midi Skirt", sku: "SKT-MDI-001", category: "dresses", basePrice: 399.90, stockQuantity: 39 },
  { id: "p-033", name: "Denim Pencil Skirt", sku: "SKT-PNC-001", category: "dresses", basePrice: 379.90, stockQuantity: 45 },

  // KNITWEAR
  { id: "p-034", name: "Merino Wool Sweater", sku: "KNT-SWR-001", category: "knitwear", basePrice: 699.90, stockQuantity: 37 },
  { id: "p-035", name: "Cable Knit Cardigan", sku: "KNT-CDG-001", category: "knitwear", basePrice: 749.90, stockQuantity: 24 },
  { id: "p-036", name: "Cashmere V-Neck Sweater", sku: "KNT-CSH-001", category: "knitwear", basePrice: 1199.90, stockQuantity: 14 },
  { id: "p-037", name: "Ribbed Knit Vest", sku: "KNT-VST-001", category: "knitwear", basePrice: 449.90, stockQuantity: 48 },
  { id: "p-038", name: "Chunky Knit Pullover", sku: "KNT-PUL-001", category: "knitwear", basePrice: 799.90, stockQuantity: 21 },
  { id: "p-039", name: "Fine Knit Polo Shirt", sku: "KNT-PLO-001", category: "knitwear", basePrice: 499.90, stockQuantity: 56 },

  // ACCESSORIES
  { id: "p-040", name: "Wool Scarf", sku: "ACC-SCF-001", category: "accessories", basePrice: 249.90, stockQuantity: 76 },
  { id: "p-041", name: "Leather Belt", sku: "ACC-BLT-001", category: "accessories", basePrice: 199.90, stockQuantity: 92 },
  { id: "p-042", name: "Canvas Tote Bag", sku: "ACC-BAG-001", category: "accessories", basePrice: 299.90, stockQuantity: 63 },
  { id: "p-043", name: "Knit Beanie", sku: "ACC-HAT-001", category: "accessories", basePrice: 149.90, stockQuantity: 110 },
  { id: "p-044", name: "Silk Pocket Square", sku: "ACC-PKT-001", category: "accessories", basePrice: 129.90, stockQuantity: 85 },
  { id: "p-045", name: "Woven Bucket Hat", sku: "ACC-HAT-002", category: "accessories", basePrice: 219.90, stockQuantity: 58 },
  { id: "p-046", name: "Leather Gloves", sku: "ACC-GLV-001", category: "accessories", basePrice: 329.90, stockQuantity: 41 },
  { id: "p-047", name: "Striped Socks Pack (3)", sku: "ACC-SOK-001", category: "accessories", basePrice: 89.90, stockQuantity: 145 },
  { id: "p-048", name: "Tie Dye Bandana", sku: "ACC-BND-001", category: "accessories", basePrice: 99.90, stockQuantity: 79 },
  { id: "p-049", name: "Suede Crossbody Bag", sku: "ACC-BAG-002", category: "accessories", basePrice: 549.90, stockQuantity: 23 },
  { id: "p-050", name: "Patterned Tie", sku: "ACC-TIE-001", category: "accessories", basePrice: 179.90, stockQuantity: 67 },
];

export const categories = ["tops", "bottoms", "outerwear", "dresses", "knitwear", "accessories"];

// ─── PROMOTIONS (seed) ────────────────────────────────────────────────────────
// Today reference: used to create realistic active/scheduled/expired scenarios.
// Dates are relative to today to create realistic active/scheduled/expired scenarios.

const today = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

export const promotions: Promotion[] = [
  // ✅ ACTIVE — tops category (affects p-001 through p-010)
  // Tests category-based conflict detection
  {
    id: "promo-001",
    name: "Summer Tops Sale",
    discountType: "percentage_off",
    value: 20,
    startDate: fmt(addDays(today, -5)),
    endDate: fmt(addDays(today, 10)),
    targetType: "category",
    targetCategory: "tops",
  },

  // ✅ ACTIVE — specific products (p-012, p-013 — jeans)
  // Tests product-level conflict detection
  {
    id: "promo-002",
    name: "Denim Weekend",
    discountType: "percentage_off",
    value: 15,
    startDate: fmt(addDays(today, -2)),
    endDate: fmt(addDays(today, 5)),
    couponCode: "DENIM15",
    targetType: "products",
    targetProductIds: ["p-012", "p-013"],
  },

  // ✅ ACTIVE — fixed amount, outerwear
  {
    id: "promo-003",
    name: "Coat Season Kickoff",
    discountType: "fixed_amount_off",
    value: 200,
    startDate: fmt(addDays(today, -1)),
    endDate: fmt(addDays(today, 14)),
    targetType: "category",
    targetCategory: "outerwear",
  },

  // ⏳ SCHEDULED — not yet started
  {
    id: "promo-004",
    name: "Black Friday Knitwear",
    discountType: "percentage_off",
    value: 40,
    startDate: fmt(addDays(today, 7)),
    endDate: fmt(addDays(today, 9)),
    couponCode: "BF40",
    targetType: "category",
    targetCategory: "knitwear",
  },

  // ⏳ SCHEDULED — specific products
  {
    id: "promo-005",
    name: "New Arrivals Preview",
    discountType: "fixed_amount_off",
    value: 50,
    startDate: fmt(addDays(today, 3)),
    endDate: fmt(addDays(today, 6)),
    targetType: "products",
    targetProductIds: ["p-028", "p-029", "p-030"],
  },

  // ❌ EXPIRED
  {
    id: "promo-006",
    name: "End of Season Clearance",
    discountType: "percentage_off",
    value: 50,
    startDate: fmt(addDays(today, -30)),
    endDate: fmt(addDays(today, -15)),
    couponCode: "CLEAR50",
    targetType: "category",
    targetCategory: "bottoms",
  },

  // ❌ EXPIRED — specific products
  {
    id: "promo-007",
    name: "Flash Sale Accessories",
    discountType: "fixed_amount_off",
    value: 30,
    startDate: fmt(addDays(today, -10)),
    endDate: fmt(addDays(today, -8)),
    targetType: "products",
    targetProductIds: ["p-040", "p-041", "p-042", "p-043"],
  },
];

// ─── IN-MEMORY STORE ─────────────────────────────────────────────────────────
// MSW handlers use this mutable array. Resets on page refresh.

export const db = {
  products: [...products],
  promotions: [...promotions],
};
