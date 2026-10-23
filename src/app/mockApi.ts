import type { SetupWorker } from "msw/browser";

/** Dev server always; a production build only with VITE_ENABLE_MOCKS=true (npm run demo). */
export const mocksEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS === "true";

const startOptions = { onUnhandledRequest: "bypass" } as const; // don't warn on Vite HMR requests etc.

let worker: SetupWorker | null = null;
let reconnecting: Promise<void> | null = null;

export async function startMockApi(): Promise<void> {
  if (!mocksEnabled) return;
  ({ worker } = await import("../mocks/browser"));
  await worker.start(startOptions);
}

/**
 * Re-attaches this page to the mock service worker.
 *
 * The browser stops an idle service worker (background tabs throttle MSW's keep-alive).
 * The restarted worker has forgotten which pages enabled mocking, so their /api requests
 * go to the real network: "Failed to fetch", or the dev server's index.html.
 * stop() + start() sends the activation message again. Concurrent callers share one attempt.
 */
export function reconnectMockApi(): Promise<void> {
  const current = worker;
  if (!current) return Promise.resolve();
  reconnecting ??= (async () => {
    current.stop();
    await current.start({ ...startOptions, quiet: true });
  })().finally(() => {
    reconnecting = null;
  });
  return reconnecting;
}
