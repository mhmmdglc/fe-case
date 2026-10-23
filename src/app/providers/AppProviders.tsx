import { useState, type ReactNode } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { makeQueryClient } from "../queryClient";
import { makeStore } from "../store";

export function AppProviders({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  const [queryClient] = useState(makeQueryClient);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={{ token: { colorPrimary: "#1f3a5f", borderRadius: 6 } }}>
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </Provider>
  );
}
