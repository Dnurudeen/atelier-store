"use client";

import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await api<{ data: Product[] }>("/admin/products");
    setProducts(res.data || []);
  }

  useEffect(() => {
    void load().catch((err) => setError(err?.message || "Unable to load products"));
  }, []);

  async function moderate(id: number, status: "published" | "rejected") {
    await api(`/admin/products/${id}`, { method: "PUT", body: { status } });
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl">Product moderation</h2>
      {error && <p className="text-sm text-crimson">{error}</p>}
      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"
          >
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted">
                {product.store?.name} · {product.status} · {formatNaira(product.price)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void moderate(product.id, "published")}>
                Publish
              </Button>
              <Button size="sm" variant="outline" onClick={() => void moderate(product.id, "rejected")}>
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
