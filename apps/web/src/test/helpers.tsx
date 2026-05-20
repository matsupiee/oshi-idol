import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface TestProvidersProps {
  queryClient: QueryClient;
  children: ReactNode;
}

function TestProviders({ queryClient, children }: TestProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function renderWithProviders(
  ui: ReactElement,
  options: { queryClient?: QueryClient } & Omit<RenderOptions, "wrapper"> = {},
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const result = render(ui, {
    ...options,
    wrapper: ({ children }) => <TestProviders queryClient={queryClient}>{children}</TestProviders>,
  });
  return Object.assign(result, { queryClient });
}
