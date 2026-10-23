import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp } from "antd";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { makeStore, type AppStore } from "../app/store";

export function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/** Fresh store and query client per test, wrapped like the real app. */
export function createWrapper(
  store: AppStore = makeStore(),
  queryClient = makeTestQueryClient(),
  initialEntries: string[] = ["/"]
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AntApp>
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
          </AntApp>
        </QueryClientProvider>
      </Provider>
    );
  }
  return { Wrapper, store, queryClient };
}
