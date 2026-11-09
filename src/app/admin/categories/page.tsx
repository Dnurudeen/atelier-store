"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, type Category } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api<{ data: Category[] }>("/admin/categories");
    setCategories(res.data || []);
  }

  useEffect(() => {
    void load().catch((err) => setError(err?.message || "Unable to load categories"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/admin/categories", { method: "POST", body: { name, description } });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to create category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-3">
        <h2 className="font-display text-2xl">Categories</h2>
        {error && <p className="text-sm text-crimson">{error}</p>}
        {categories.map((category) => (
          <div key={category.id} className="rounded-2xl border border-border bg-white p-4">
            <p className="font-medium">{category.name}</p>
            <p className="text-sm text-muted">{category.slug}</p>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <h3 className="font-display text-xl">Add category</h3>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" loading={saving}>
          Create
        </Button>
      </form>
    </div>
  );
}
