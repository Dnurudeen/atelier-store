"use client";

import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VendorPromotionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { compare: string; ends: string }>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ data: Product[] }>("/vendor/products")
      .then((res) => {
        const rows = res.data || [];
        setProducts(rows);
        setDrafts(
          Object.fromEntries(
            rows.map((product) => [
              product.id,
              {
                compare: product.compare_at_price ? String(product.compare_at_price) : "",
                ends: product.sale_ends_at ? product.sale_ends_at.slice(0, 10) : "",
              },
            ])
          )
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
        body: {
          compare_at_price: draft.compare ? Number(draft.compare) : null,
          sale_ends_at: draft.ends || null,
        },
      });
      setMessage("Promotion saved. It shows in Deals while the compare price is higher than the selling price.");
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to save promotion");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Promotions</h2>
        <p className="text-sm text-muted">Set a previous price and an optional end date. No campaign calendar.</p>
      </div>
      {error && <p className="text-sm text-crimson">{error}</p>}
      {message && <p className="text-sm text-burgundy">{message}</p>}
      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="grid gap-3 rounded-2xl border border-border bg-white p-4 md:grid-cols-[1fr_160px_160px_auto] md:items-end">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-xs capitalize text-muted">{product.status}</p>
            </div>
            <Input
              label="Compare at"
              type="number"
              value={drafts[product.id]?.compare ?? ""}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [product.id]: { ...current[product.id], compare: event.target.value },
                }))
              }
            />
            <Input
              label="Ends"
              type="date"
              value={drafts[product.id]?.ends ?? ""}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [product.id]: { ...current[product.id], ends: event.target.value },
                }))
              }
            />
            <Button size="sm" variant="outline" onClick={() => void save(product)}>
              Save
            </Button>
          </div>
        ))}
        {products.length === 0 && !error && <p className="text-sm text-muted">Add a product before creating a promotion.</p>}
      </div>
    </div>
  );
}
