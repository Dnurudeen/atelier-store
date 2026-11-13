"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { UNAUTHORIZED_EVENT } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Toaster } from "@/components/ui/toast";

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    // Persist may already have rehydrated; ensure flag is set for SSR/client mismatch.
    if (!hydrated) {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });
      if (useAuthStore.persist.hasHydrated()) {
        setHydrated(true);
      }
      return unsub;
    }
  }, [hydrated, setHydrated]);

  useEffect(() => {
    if (hydrated && token) {
      void fetchMe();
    }
  }, [hydrated, token, fetchMe]);

  useEffect(() => {
    // Expired or revoked token: sign out locally so the UI stops pretending.
    const onUnauthorized = () => useAuthStore.getState().clear();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <AuthBootstrap>{children}</AuthBootstrap>
      <Toaster />
    </QueryClientProvider>
  );
}
