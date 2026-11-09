"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, type Address } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const empty = {
  label: "Home",
  full_name: "",
  phone: "",
  address_line: "",
  city: "",
  state: "",
  country: "Nigeria",
  is_default: true,
};

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api<{ data: Address[] }>("/account/addresses");
    setAddresses(res.data || []);
  }

  useEffect(() => {
    void load().catch((err) => setError(err?.message || "Unable to load addresses"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/account/addresses", { method: "POST", body: form });
      setForm(empty);
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to save address");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    await api(`/account/addresses/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <h2 className="font-display text-2xl">Saved addresses</h2>
        {error && <p className="text-sm text-crimson">{error}</p>}
        {addresses.map((address) => (
          <div key={address.id} className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {address.label || "Address"}{" "}
                  {address.is_default ? (
                    <span className="text-xs text-crimson">(default)</span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {address.full_name} · {address.phone}
                </p>
                <p className="text-sm text-muted">
                  {address.address_line}, {address.city}, {address.state}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void remove(address.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
        {addresses.length === 0 && <p className="text-sm text-muted">No addresses yet.</p>}
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <h3 className="font-display text-xl">Add address</h3>
        <Input
          label="Label"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
        />
        <Input
          label="Full name"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          required
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          required
        />
        <Input
          label="Address"
          value={form.address_line}
          onChange={(e) => setForm((f) => ({ ...f, address_line: e.target.value }))}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            required
          />
          <Input
            label="State"
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
          />
          Set as default
        </label>
        <Button type="submit" loading={saving}>
          Save address
        </Button>
      </form>
    </div>
  );
}
