import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetMockDb, server } from "./server";

// jsdom does not implement these; Ant Design needs them.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetMockDb());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
