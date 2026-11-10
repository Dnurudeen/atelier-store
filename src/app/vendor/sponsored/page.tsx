"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Sponsorship = {
  id: number;
  budget: number | string;
  daily_amount: number | string;
  spent: number | string;
  status: string;
  product?: Product;
};

export default function VendorSponsoredPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Sponsorship[]>([]);
  const [productId, setProductId] = useState("");
  const [budget, setBudget] = useState("5000");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [productRes, sponsorRes] = await Promise.all([
      api<{ data: Product[] }>("/vendor/products"),
      api<{ data: Sponsorship[] }>("/vendor/sponsorships"),
    ]);
    const published = (productRes.data || []).filter((product) => product.status === "published");
    setProducts(published);
    setRows(sponsorRes.data || []);
    if (!productId && published[0]) setProductId(String(published[0].id));
  }

  useEffect(() => {
    void load().catch((err) => setError(err?.message || "Unable to load sponsorships"));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/vendor/sponsorships", {
        method: "POST",
        body: { product_id: Number(productId), budget: Number(budget), daily_amount: 500 },
      });
      setMessage("Sponsorship is active. ₦500 a day comes off your pending balance until the budget is used.");
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to sponsor this product");
    }
  }

  async function setStatus(id: number, status: "active" | "paused") {
    await api(`/vendor/sponsorships/${id}`, { method: "PUT", body: { status } });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Sponsored products</h2>
        <p className="text-sm text-muted">
          Sponsored pieces appear in the shop rail and at the top of their category. The daily fee is taken from your statement, not charged on a card.
        </p>
      </div>
      {error && <p className="text-sm text-crimson">{error}</p>}
      {message && <p className="text-sm text-burgundy">{message}</p>}
      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-white p-5 md:grid-cols-[1fr_180px_auto] md:items-end">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Published product</span>
          <select
            className="h-11 w-full rounded-xl border border-border bg-white px-3"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            required
          >
            <option value="">Select</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <Input label="Budget (NGN)" type="number" min={500} value={budget} onChange={(event) => setBudget(event.target.value)} required />
        <Button type="submit">Sponsor</Button>
      </form>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
            <div>
              <p className="font-medium">{row.product?.name || `Product #${row.id}`}</p>
              <p className="text-sm text-muted">
                {row.status} · spent {formatNaira(row.spent)} of {formatNaira(row.budget)} · {formatNaira(row.daily_amount)} / day
              </p>
            </div>
            {row.status !== "exhausted" && (
              <Button size="sm" variant="outline" onClick={() => void setStatus(row.id, row.status === "paused" ? "active" : "paused")}>
                {row.status === "paused" ? "Resume" : "Pause"}
              </Button>
            )}
          </li>
        ))}
        {rows.length === 0 && !error && <li className="text-sm text-muted">No sponsored products yet.</li>}
      </ul>
    </div>
  );
}
