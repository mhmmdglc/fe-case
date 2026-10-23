# modaco-case-starter

Starter template for the ModaCo frontend case study.

Includes a fully working mock API powered by [MSW (Mock Service Worker)](https://mswjs.io/). No real backend is needed — all requests are intercepted in the browser.

---

## Getting Started

```bash
npm install
npm run init:msw
npm run dev
```

The app runs at `http://localhost:5173`.

> `npm run init:msw` copies the MSW service worker file into `public/`. Run it once after install.

---

## API Reference

All requests use the `/api/` prefix.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | Paginated product list |
| `GET` | `/api/products/:id` | Product detail + active promotion |
| `GET` | `/api/categories` | All categories |
| `GET` | `/api/promotions` | All promotions |
| `GET` | `/api/promotions/:id` | Promotion detail |
| `POST` | `/api/promotions` | Create a new promotion |
| `POST` | `/api/promotions/preview` | Preview promotion impact *(bonus)* |
| `DELETE` | `/api/promotions/:id` | Delete a promotion |

### GET /api/products — Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | `""` | Search by product name |
| `category` | string | `""` | Filter by category |
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `promotionStatus` | `all` \| `on_promotion` \| `no_promotion` | `all` | Filter by promotion status |

### POST /api/promotions — Response Codes

| Code | Meaning |
|------|---------|
| `201 Created` | Promotion saved successfully |
| `409 Conflict` | Overlapping promotion detected — response includes a `conflicts` array |
| `422 Unprocessable Entity` | Validation error — response includes an `errors` array |

---

## Data Shapes

### Product

```ts
{
  id: string;
  name: string;           // e.g. "Slim Fit Oxford Shirt"
  sku: string;            // e.g. "TOP-SHR-001"
  category: string;       // tops | bottoms | outerwear | dresses | knitwear | accessories
  basePrice: number;
  stockQuantity: number;
}
```

### Promotion

```ts
{
  id: string;
  name: string;
  discountType: "percentage_off" | "fixed_amount_off";
  value: number;
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  couponCode?: string;
  targetType: "products" | "category";
  targetProductIds?: string[];
  targetCategory?: string;
}
```

---

## Seed Data

The mock database contains **50 textile products** across 6 categories and **7 pre-seeded promotions**:

- 3 active
- 2 scheduled
- 2 expired

Promotions are stored in-memory and reset on page refresh. This is intentional.

### Pre-seeded Conflict Scenarios

These are deliberately set up to test conflict detection logic:

| Scenario | Affected products | Existing active promotion |
|----------|-------------------|--------------------------|
| Add a promotion targeting `tops` | p-001 – p-010 | "Summer Tops Sale" — 20% off |
| Target p-012 or p-013 directly | Wide Leg Denim Jeans, Straight Cut Jeans | "Denim Weekend" — 15% off, code: DENIM15 |
| Add a promotion targeting `outerwear` | p-021 – p-027 | "Coat Season Kickoff" — 200 TL off |

---

## Notes

- MSW only runs in development mode. Production builds are unaffected.
- To add products or promotions, edit `src/mocks/db.ts`.
