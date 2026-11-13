"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, type Product } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type WishlistRow = { id: number; product_id: number; product: Product };

/** The signed-in shopper's saved items (shared cache so every heart agrees). */
export function useWishlist() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["wishlist", token],
    queryFn: async () => (await api<{ data: WishlistRow[] }>("/account/wishlist")).data,
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });
}

export function useIsSaved(productId: number) {
  const { data } = useWishlist();
  return Boolean(data?.some((row) => row.product_id === productId));
}

export function useToggleWishlist() {
  const client = useQueryClient();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const mutation = useMutation({
    mutationFn: async (product: Product) =>
      (await api<{ data: { wishlisted: boolean } }>("/account/wishlist", { method: "POST", body: { product_id: product.id } })).data,
    onSuccess: (res) => {
      void client.invalidateQueries({ queryKey: ["wishlist"] });
      if (res.wishlisted) toast.success("Added to your saved items", { label: "View saved items", href: "/account/wishlist" });
      else toast.info("Removed from saved items");
    },
    onError: (err) => toast.error(errorMessage(err, "Could not update saved items")),
  });

  return (product: Product) => {
    if (!token) {
      const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      router.push(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    mutation.mutate(product);
  };
}
