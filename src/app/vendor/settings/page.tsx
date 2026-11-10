"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, type Store } from "@/lib/api";
import { ShareLinks } from "@/components/products/share-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function VendorSettingsPage() {
  const [form, setForm] = useState({
    name: "",
    bio: "",
    location: "",
    shipping_fee: "2500",
    logo: "",
    banner: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api<{ data: { store: Store } }>("/vendor/overview")
      .then((res) => {
        const store = res.data.store;
        setSlug(store.slug);
        setForm({
          name: store.name || "",
          bio: store.bio || "",
          location: store.location || "",
          shipping_fee: String(store.shipping_fee ?? 2500),
          logo: store.logo || "",
          banner: store.banner || "",
        });
      })
      .catch((err) => setError(err?.message || "Unable to load settings"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/vendor/settings", {
        method: "PUT",
        body: {
          ...form,
          shipping_fee: Number(form.shipping_fee || 0),
        },
      });
      setMessage("Store settings saved.");
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4 rounded-2xl border border-border bg-white p-6">
      <h2 className="font-display text-2xl">Store settings</h2>
      {slug && (
        <div className="space-y-2 rounded-xl bg-surface p-4">
          <p className="text-sm text-muted">
            Your store is a page on Atelier at <span className="text-burgundy">/makers/{slug}</span>
          </p>
          <ShareLinks path={`/makers/${slug}`} title={form.name || "My store"} />
        </div>
      )}
      <Input label="Store name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      <Textarea label="Bio" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
      <Input
        label="Location"
        value={form.location}
        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
      />
      <Input
        label="Shipping fee"
        type="number"
        value={form.shipping_fee}
        onChange={(e) => setForm((f) => ({ ...f, shipping_fee: e.target.value }))}
      />
      <Input label="Logo URL" value={form.logo} onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))} />
      <Input
        label="Banner URL"
        value={form.banner}
        onChange={(e) => setForm((f) => ({ ...f, banner: e.target.value }))}
      />
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-crimson">{error}</p>}
      <Button type="submit" loading={saving}>
        Save settings
      </Button>
    </form>
  );
}
