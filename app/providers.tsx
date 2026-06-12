"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,       // 60s — show cache instantly, revalidate after
            gcTime: 1000 * 60 * 10,     // keep unused cache for 10 min
            retry: 1,
            refetchOnWindowFocus: true,  // silently refresh when tab regains focus
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
