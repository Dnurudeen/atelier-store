"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, type Banner } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    image: "/media/hero/hero-1.jpg",
    cta_label: "Shop now",
    cta_url: "/shop",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api<{ data: Banner[] }>("/admin/banners");
    setBanners(res.data || []);
  }

  useEffect(() => {
    void load().catch((err) => setError(err?.message || "Unable to load banners"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/admin/banners", { method: "POST", body: form });
      setForm({
        title: "",
        subtitle: "",
        image: "/media/hero/hero-1.jpg",
        cta_label: "Shop now",
        cta_url: "/shop",
      });
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to create banner");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(banner: Banner) {
    await api(`/admin/banners/${banner.id}`, {
      method: "PUT",
      body: { is_active: !banner.is_active },
    });
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-3">
        <h2 className="font-display text-2xl">Banners</h2>
        {error && <p className="text-sm text-crimson">{error}</p>}
        {banners.map((banner) => (
          <div key={banner.id} className="rounded-2xl border border-border bg-white p-4">
            <p className="font-medium">{banner.title}</p>
            <p className="text-sm text-muted">{banner.is_active ? "Active" : "Inactive"}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => void toggle(banner)}>
              {banner.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <h3 className="font-display text-xl">Add banner</h3>
        <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        <Input
          label="Subtitle"
          value={form.subtitle}
          onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
        />
        <Input
          label="Image path"
          value={form.image}
          onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
          required
        />
        <Input
          label="CTA label"
          value={form.cta_label}
          onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
        />
        <Input
          label="CTA URL"
          value={form.cta_url}
          onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
        />
        <Button type="submit" loading={saving}>
          Create
        </Button>
      </form>
    </div>
  );
}
