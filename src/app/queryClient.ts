import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/http/httpClient";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry network/5xx errors once; 4xx answers will not change on retry.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
      },
      mutations: { retry: false },
    },
  });
}
