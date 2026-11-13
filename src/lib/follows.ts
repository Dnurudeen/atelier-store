"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type Store } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export function useFollowedStores() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["follows", token],
    queryFn: async () => (await api<{ data: Store[] }>("/account/follows")).data,
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });
}

export function useFollow(store: Pick<Store, "id" | "name">) {
  const client = useQueryClient();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { data } = useFollowedStores();
  const following = Boolean(data?.some((s) => s.id === store.id));

  const mutation = useMutation({
    mutationFn: async () =>
      (await api<{ data: { following: boolean; followers_count: number } }>("/account/follows", { method: "POST", body: { store_id: store.id } })).data,
    onSuccess: (res) => {
      void client.invalidateQueries({ queryKey: ["follows"] });
      toast.success(res.following ? `You're following ${store.name}` : `Unfollowed ${store.name}`);
    },
    onError: (err) => toast.error(errorMessage(err, "Could not update follow")),
  });

  function toggle() {
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    mutation.mutate();
  }

  return { following, toggle, pending: mutation.isPending };
}
