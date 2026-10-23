import { vi } from "vitest";

// Runs as the first setup file, before anything imports src/mocks/db.ts: the seed
// data computes its promotion dates from "today" at import time. Only Date is
// faked, so timers (debounce, waitFor) stay real.
export const FIXED_NOW = new Date("2026-06-15T12:00:00Z");

vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(FIXED_NOW);
