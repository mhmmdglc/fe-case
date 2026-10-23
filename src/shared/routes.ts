/** Every app URL in one place. Builders encode ids; the router uses the patterns. */
export const routes = {
  products: () => "/products",
  product: (id: string) => `/products/${encodeURIComponent(id)}`,
  promotions: () => "/promotions",
  promotion: (id: string) => `/promotions/${encodeURIComponent(id)}`,
};

/** Route patterns for the router table (app/router.tsx). */
export const routePatterns = {
  products: routes.products(),
  product: "/products/:id",
  promotions: routes.promotions(),
  promotion: "/promotions/:id",
};
