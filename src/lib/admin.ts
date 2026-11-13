"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type PaginationMeta } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export type Page<T> = { data: T[]; meta: PaginationMeta & { counts?: Record<string, number> } };

/** Admin GET with a shared cache key prefix so mutations can refresh everything under it. */
export function useAdmin<T>(path: string, enabled = true) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["admin", path, token],
    queryFn: async () => api<T>(`/admin${path}`),
    enabled: Boolean(token) && enabled,
    placeholderData: (prev) => prev,
  });
}

/** Admin write that toasts and refreshes all admin queries. */
export function useAdminAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, method = "PUT", body }: { path: string; method?: string; body?: unknown; success?: string }) =>
      api<{ data?: unknown; message?: string }>(`/admin${path}`, { method, body }),
    onSuccess: (res, vars) => {
      toast.success(vars.success ?? res.message ?? "Saved");
      void client.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => toast.error(errorMessage(err, "Something went wrong")),
  });
}

/** Build a query string, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "" && v !== false) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
