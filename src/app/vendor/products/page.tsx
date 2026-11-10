"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { price: string; stock: string }>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void api<{ data: Product[] }>("/vendor/products")
      .then((res) => {
        const rows = res.data || [];
        setProducts(rows);
        setDrafts(
          Object.fromEntries(rows.map((product) => [product.id, { price: String(product.price), stock: String(product.stock) }]))
        );
      })
      .catch((err) => setError(err?.message || "Unable to load products"));
  }, []);

  async function save(product: Product) {
    const draft = drafts[product.id];
    setError("");
    setMessage("");
    try {
      await api(`/vendor/products/${product.id}`, {
        method: "PUT",
        body: { price: Number(draft.price), stock: Number(draft.stock) },
      });
      setMessage(`${product.name} updated. Published listings stay live; new ones still need approval.`);
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to update product");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Products</h2>
          <p className="text-sm text-muted">Change price and stock here. Buyers only see approved listings.</p>
        </div>
        <Button onClick={() => (window.location.href = "/vendor/products/new")}>New product</Button>
      </div>
      {error && <p className="text-sm text-crimson">{error}</p>}
      {message && <p className="text-sm text-burgundy">{message}</p>}
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-xs tracking-wider text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/product/${product.slug}`} className="font-medium hover:text-burgundy">
                    {product.name}
                  </Link>
                  <p className="text-xs text-muted">{formatNaira(product.price)} now</p>
                </td>
                <td className="px-4 py-3 capitalize">{product.status}</td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    value={drafts[product.id]?.stock ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [product.id]: { ...current[product.id], stock: event.target.value },
                      }))
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    value={drafts[product.id]?.price ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [product.id]: { ...current[product.id], price: event.target.value },
                      }))
                    }
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => void save(product)}>
                    Save
                  </Button>
                </td>
              </tr>
            ))}
            {products.length === 0 && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
