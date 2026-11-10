"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Category } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function fieldKind(slug?: string) {
  if (!slug) return null;
  if (slug === "fashion" || slug === "leatherwork") return "apparel";
  if (slug === "fine-art" || slug === "sculpture") return "art";
  return "general";
}

function splitList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function VendorNewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "1",
    category_id: "",
    image_url: "",
    sizes: "",
    colors: "",
    medium: "",
    dimensions: "",
    materials: "",
  });

  useEffect(() => {
    void api<{ data: Category[] }>("/categories")
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  const category = categories.find((item) => String(item.id) === form.category_id);
  const kind = useMemo(() => fieldKind(category?.slug), [category?.slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const specs =
        kind === "art"
          ? { medium: form.medium, dimensions: form.dimensions }
          : kind === "general"
            ? { materials: form.materials, dimensions: form.dimensions }
            : undefined;
      await api("/vendor/products", {
        method: "POST",
        body: {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          stock: Number(form.stock),
          category_id: form.category_id ? Number(form.category_id) : null,
          image_url: form.image_url || null,
          specs,
          sizes: kind === "apparel" ? splitList(form.sizes) : [],
          colors: kind === "apparel" ? splitList(form.colors) : [],
        },
      });
      router.push("/vendor/products");
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4 rounded-2xl border border-border bg-white p-6">
      <div>
        <h2 className="font-display text-2xl">New product</h2>
        <p className="mt-1 text-sm text-muted">
          Choose a category first. Extra fields appear for that craft. The listing stays off the shop until Atelier approves it.
        </p>
      </div>
      <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Price (NGN)" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
        <Input label="Stock" type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} required />
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Category</span>
        <select
          className="h-11 w-full rounded-xl border border-border bg-white px-3"
          value={form.category_id}
          onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
          required
        >
          <option value="">Select category</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {kind === "apparel" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Sizes" value={form.sizes} placeholder="S, M, L" onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))} />
          <Input label="Colors" value={form.colors} placeholder="Indigo, Cream" onChange={(e) => setForm((f) => ({ ...f, colors: e.target.value }))} />
        </div>
      )}
      {kind === "art" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Medium" value={form.medium} onChange={(e) => setForm((f) => ({ ...f, medium: e.target.value }))} />
          <Input label="Dimensions" value={form.dimensions} onChange={(e) => setForm((f) => ({ ...f, dimensions: e.target.value }))} />
        </div>
      )}
      {kind === "general" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Materials" value={form.materials} onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))} />
          <Input label="Dimensions" value={form.dimensions} onChange={(e) => setForm((f) => ({ ...f, dimensions: e.target.value }))} />
        </div>
      )}
      <Input label="Image URL" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
      {error && <p className="text-sm text-crimson">{error}</p>}
      <Button type="submit" loading={saving}>
        Submit for review
      </Button>
    </form>
  );
}
