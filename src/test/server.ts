import { setupServer } from "msw/node";
import { handlers } from "../mocks/handlers";
import { db, products, promotions } from "../mocks/db";

// The real mock handlers, unchanged, running in Node.
export const server = setupServer(...handlers);

/** The mock db is a mutable module-level store; restore the seed before every test. */
export function resetMockDb() {
  db.products.splice(0, db.products.length, ...products);
  db.promotions.splice(0, db.promotions.length, ...promotions);
}
