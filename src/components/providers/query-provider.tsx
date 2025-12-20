"use client";

/**
 * TanStack Query Provider
 *
 * Story 20.2: Build Notifications Center
 *
 * Provides QueryClient context for all client-side data fetching with TanStack Query.
 * Required for useQuery, useMutation, and useQueryClient hooks.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create a new QueryClient for each session to avoid stale data between users
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time of 5 seconds for most queries
            staleTime: 5 * 1000,
            // Retry failed queries up to 3 times
            retry: 3,
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
