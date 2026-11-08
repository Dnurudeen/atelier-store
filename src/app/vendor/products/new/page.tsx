"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { demoCategories } from "@/lib/demo-data";

export default function VendorNewProductPage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/products`, { method: "POST" });
    } catch {
      // demo
    }
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="max-w-lg rounded-2xl border border-border bg-white p-8">
        <h2 className="font-display text-2xl">Product created</h2>
        <p className="mt-2 text-sm text-muted">Your listing is live in demo mode.</p>
        <Link href="/vendor/products" className="mt-6 inline-block">
          <Button variant="outline">Back to products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl">New product</h2>
        <p className="mt-1 text-sm text-muted">Add a handcrafted piece to your store.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <Input name="name" label="Product name" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="price" label="Price (₦)" type="number" required min={1000} />
          <Input name="stock" label="Stock" type="number" required min={0} defaultValue={5} />
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground/80">Category</span>
          <select
            name="category"
            className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm outline-none focus:border-burgundy focus:ring-2 focus:ring-burgundy/15"
            required
          >
            {demoCategories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Textarea name="description" label="Description" rows={5} required />
        <Input name="imageUrl" label="Image URL (optional)" placeholder="https://…" />
        <div className="flex gap-3">
          <Link href="/vendor/products">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={loading}>
            Publish product
          </Button>
        </div>
      </form>
    </div>
  );
}
