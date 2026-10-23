# ModaCo – Promotion Management

Internal single-page app for the ModaCo merchandising team: browse the product catalog with
effective prices, inspect a product's promotions, and create promotions with conflict detection
and a live impact preview.

Built with React 18, TypeScript, Redux Toolkit, TanStack Query, Ant Design 6, SCSS modules and
React Router. All data comes from the starter's MSW mock API (no real backend).

---

## Getting started

Requires Node.js **20.19+**.

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. The MSW worker file (`public/mockServiceWorker.js`) is
committed, so `npm run init:msw` is only needed after upgrading `msw`.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with the mock API |
| `npm test` | Unit and integration tests (Vitest, jsdom) |
| `npm run typecheck` | `tsc` without emitting |
| `npm run build` | Type-check and production build. **The mock API is not included**, so this build has no data source on its own. |
| `npm run demo` | Production build **with** the mock API (`VITE_ENABLE_MOCKS=true`), served by `vite preview` at `http://localhost:4173` |

To use a real backend, set `VITE_API_BASE_URL` (for example `https://api.example.com`) at build
time. Requests then go to `<base URL>/api/...`. Without it, requests stay on the app's own origin,
where the mock API answers them.

Promotions are kept in the page's memory by the mock API and reset on page refresh (by design of
the starter).

---

## Features

**Products (`/products`)**
- Table with name, category, SKU, base price, effective price and a promotion indicator.
- The promotion column names the active promotion (linked to its page) and its coupon code. A
  product with no promotion today but an upcoming one shows "Next: <promotion> · from <date>". The
  scheduled promotion matters because it already blocks overlapping new promotions.
- Clicking anywhere on a row opens the product.
- Server-side search, category filter (from `GET /api/categories`), promotion status filter and
  pagination (10 per page). Nothing is filtered on the client.
- A fresh app load behaves as if "shirt" was searched. A search the user clears stays cleared for
  the session.

**Product detail (`/products/:id`)**
- All product fields, a prominent effective price, the active promotion (or a clear message), the
  product's promotion status (Active / Scheduled / Expired) and every promotion that targets it.

**Promotion detail (`/promotions/:id`)** (extra)
- Discount, coupon, dates, status and target, plus every product the promotion covers (linked).
  Each product shows its price with this promotion and its price today, with the promotion that
  sets today's price when it is a different one.

**Promotions (`/promotions`)**
- List with discount type, value, target, affected products, validity and derived status; names
  link to the promotion page.
- Create form in a drawer: inline validation (no browser-native validation), product or category
  target, 422 messages mapped to fields, 409 conflict details listed while the form keeps its values.
- Live impact preview (bonus): affected products, their new prices and conflicts, refreshed as the
  form changes.
- While a target is chosen, the form lists the active and scheduled promotions that already cover
  it, and marks the ones that overlap the chosen dates. For a category this includes promotions set
  on single products of that category.
- Conflict messages state that scheduled promotions count too.
- Pressing Enter inside a field (for example to confirm a date) never submits the form; only the
  button does.
- Delete (list and promotion page) opens a dialog that states the impact: for an active promotion
  which products go back to their base price and how many days it had left; for a scheduled one
  that today's prices do not change and the planned discount is cancelled; for an expired one that
  only the record goes; plus a coupon code that stops working.
- Duplicate opens the create form prefilled with a copy (name + " (copy)"); the original stays
  unchanged. Editing is not possible because the API has no update endpoint.

---

## Architecture

```
src/
  main.tsx              bootstrap: start the mock API, render <App />
  app/                  composition root
    App.tsx             providers + RouterProvider
    router.tsx          route table, lazy-loaded pages, NotFoundPage
    providers/          Redux, QueryClient, Ant Design theme and App context
    store.ts hooks.ts   Redux store (feature reducers) and typed useApp* hooks
    queryClient.ts mockApi.ts
    layout/             header, navigation, Suspense fallback for lazy pages
  services/             API layer, no React
    http/httpClient.ts  fetch client: base URL, single ApiError model, mock reconnect hook
    products.service.ts promotions.service.ts   endpoint paths and request functions
    queryKeys.ts        query key factory, one branch per feature
    types.ts            response and request types
  domain/               pure business rules + tests (status, effective price, validation, payloads)
  shared/               used by every feature, knows no feature
    components/         tags, links, PriceCell, QueryErrorAlert (index.ts barrel)
    hooks/ utils/       useDebouncedValue, errorMessage
    routes.ts           every app URL: routes.product(id) etc., and the router's patterns
  features/
    products/           index.ts = public API
      hooks/            product, category and picker queries
      store/            filters slice
      components/       filters, table, detail cards (props in, callbacks out)
      pages/            ProductListPage, ProductDetailPage (containers)
    promotions/         index.ts = public API
      hooks/            queries (Redux sync), mutations (cache refresh), usePromotionForm
      store/            promotions slice
      components/       table, form, drawer, picker, preview, delete dialog, detail cards
      pages/            PromotionsPage, PromotionDetailPage (containers)
  styles/               SCSS tokens and globals
  test/                 MSW Node server, frozen clock, render helpers
  mocks/                starter mock API (unchanged)
```

**Layering rules**
- `domain/` imports only types from `services/types.ts`. No React, no requests.
- `services/` imports nothing from the app; it is the only place that knows endpoint paths and
  calls `fetch`. `VITE_API_BASE_URL` sets where the API lives (default: this origin).
- `shared/` may use `services/` types and errors and `domain/`, never a feature or `app/`.
- A feature uses `services/`, `domain/`, `shared/` and the typed hooks in `app/hooks.ts`. Another
  feature is reached only through its `index.ts`. Inside a feature, imports are relative.
- Pages are containers: they read hooks and Redux and pass plain props down. Components get props
  and callbacks. Widgets that need their own data (product picker, preview, delete dialog, drawer,
  target promotions) call feature hooks themselves.
- `app/` wires everything together: reducers and pages come from each feature's `index.ts`, and
  pages are loaded with `React.lazy`, so each page is its own chunk.
- Imports across folders use the `@/` alias for `src/` (tsconfig `paths` + Vite `resolve.alias`).

**Adding a feature**
1. Create `features/<name>/` with `hooks/`, `components/`, `pages/` (and `store/` if needed) and
   an `index.ts` that exports what others may use, plus a `<name>Pages` object of page loaders.
2. Add types to `services/types.ts` and a `services/<name>.service.ts` with the endpoint paths.
3. Add a key branch to `services/queryKeys.ts`; hooks use only these keys.
4. Write the query and mutation hooks in `hooks/`. A mutation that changes prices or statuses
   refreshes the affected key branches, as `usePromotionMutations` does.
5. UI state that outlives a page goes into a slice in `store/`; register its reducer in
   `app/store.ts` through the feature's `index.ts`.
6. Add URL builders and patterns to `shared/routes.ts`, a lazy route in `app/router.tsx`, and a
   navigation item in `app/layout/AppLayout.tsx`.

**Server state vs. UI state**
- TanStack Query performs every API call and owns caching, loading and error state.
- Redux holds the product filters (search, category, promotion status, page) and the promotion list
  the case asks to manage with Redux Toolkit.

**Keeping promotions in Redux in sync with the API**
- The promotion list reaches Redux in one place: the `GET /api/promotions` query function
  (`features/promotions/hooks/usePromotionQueries.ts`). Every successful fetch, the first one and each refetch,
  replaces the stored list.
- Create/delete update Redux only after the API confirms the change (no optimistic updates). A
  failed mutation never reaches Redux.
- Each successful mutation increments a `revision`. A list request remembers the revision it
  started with, and the reducer ignores its response if a mutation succeeded in the meantime. This
  way an older list response cannot undo a newer create or delete.
- After a change, cached product and promotion queries that are not on screen are removed, and the
  ones on screen are refetched. Navigating to another page never shows a stale effective price.

**Mock API reconnect**
- A browser can stop an idle service worker; this happens especially in background tabs, where
  MSW's keep-alive timer is throttled. The restarted worker forgets that this page enabled mocking.
  /api requests then go to the real network and fail ("Failed to fetch", the dev server's
  index.html for GET, or a 404 without a content type for POST/DELETE).
- The API client treats a network failure, or any non-204 response that is not JSON, as "API not
  reached". It then
  re-attaches MSW (`worker.stop()` + `worker.start()`, `app/mockApi.ts`) and retries the request
  once.
- This only happens in mock mode; with a real backend the error is shown directly. The in-memory
  mock data is not reset by reconnecting.

**Dates and status**
- Status is never stored. `getPromotionStatus` derives it from the dates, with start and end days
  inclusive.
- "Today" is the **UTC** calendar date, the same rule the mock API uses (`toISOString`). Otherwise
  the UI and the API would disagree between 00:00 and 03:00 in Turkey.
- Dates are sent as `YYYY-MM-DD` taken directly from the picked calendar day. Converting through
  ISO could shift the date by a day.

**Prices**
- Product screens show the API's `effectivePrice`. The shared `computeEffectivePrice` (clamped at 0)
  is used for the "price with this promotion" column on the detail page.
- A fixed discount larger than a product's price is allowed. The resulting price is capped at 0, as
  in the API.

**Preview**
- A preview request is only sent when the discount, both dates and a non-empty target are valid.
  Without a target, the mock API would treat the request as covering every product.
- Requests are debounced and keyed by their full body. While the form differs from the last
  previewed request, the old result is dimmed and labelled "Updating preview…". When the form
  becomes invalid, the preview is hidden. The 409 from the real create request is still handled,
  because a preview is not a guarantee.

---

## Tests

```bash
npm test
```

- **Unit:** status boundaries (start/end day inclusive, month/year rollover, UTC), effective price
  (percentage, fixed, 100 %, floor at 0), form validation (required fields, whitespace name, 0 /
  negative / NaN / Infinity values, 100 % cap, same-day end date), payload and preview building,
  422 message mapping, filters reducer, promotions reducer (including the stale-response guard).
- **Integration:** the real MSW handlers running in Node (`msw/node`):
  - the three seeded conflict scenarios plus a scheduled-promotion overlap;
  - 422 / 204 / 404 / network error handling;
  - create → Redux + cache sync;
  - 409 leaves Redux untouched;
  - the form on 409 and 422 (values kept, details shown) and on success.

Tests are deterministic. The clock is frozen at `2026-06-15T12:00:00Z` before the seed data is
imported, and the mutable mock database is reset before every test.

---

## Security notes

- Dependency audit: `npm audit` reported **0 vulnerabilities** when the dependencies were installed
  (October 2026). This reflects the advisory database at that time only; re-run `npm audit` before
  relying on it.
- API text (names, conflict messages) is rendered as plain React text; there is no
  `dangerouslySetInnerHTML`. No secrets or environment credentials are used.
- Client-side validation is a usability feature, not a security boundary. A real backend must
  validate every request itself. The mock API is a development tool, not a backend.
- The app has no authentication by design (internal tool, as specified).

## Known limitations

- The production bundle is a single ~1.3 MB chunk (mostly Ant Design). Route-level code splitting
  was left out to keep the solution simple.
- Product filters live in Redux, not in the URL. They survive in-app navigation but not a page
  refresh or a shared link.
- The "already on this target" panel and the "Scheduled from" tag use a client-side copy of the
  API's targeting rule (product ids or category). They only inform the user. The API's 409 response
  still decides whether a promotion conflicts.
- Conflict messages are shown exactly as the API returns them (one line per product). They are not
  parsed or grouped.
