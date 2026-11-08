"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { demoStores } from "@/lib/demo-data";

const store = demoStores[0];

export default function VendorSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [shippingFee, setShippingFee] = useState(String(store.shipping_fee ?? 2500));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl">Store settings</h2>
        <p className="mt-1 text-sm text-muted">Public profile and shipping defaults.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <Input label="Store name" defaultValue={store.name} />
        <Input label="Location" defaultValue={store.location ?? ""} />
        <Textarea label="Bio" rows={4} defaultValue={store.bio ?? ""} />
        <Input
          label="Flat shipping fee (₦)"
          type="number"
          min={0}
          value={shippingFee}
          onChange={(e) => setShippingFee(e.target.value)}
        />
        <Input label="Logo URL" placeholder="https://…" defaultValue={store.logo ?? ""} />
        {saved ? <p className="text-sm text-emerald-700">Settings saved (demo).</p> : null}
        <Button type="submit">Save settings</Button>
      </form>
    </div>
  );
}
