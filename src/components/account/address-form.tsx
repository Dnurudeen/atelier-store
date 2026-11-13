"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage, fieldErrors, type Address } from "@/lib/api";
import { isValidNigerianPhone, NIGERIAN_STATES } from "@/lib/nigeria";

export type AddressDraft = Omit<Address, "id" | "country"> & { country?: string };

const EMPTY: AddressDraft = { label: "", full_name: "", phone: "", address_line: "", city: "", state: "Lagos", postal_code: "", is_default: false };

/** Create or edit a saved address. Calls the API and returns the saved row. */
export function AddressForm({
  initial,
  onSaved,
  onCancel,
  submitLabel = "Save address",
}: {
  initial?: Partial<Address> | null;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<AddressDraft>({ ...EMPTY, ...(initial ?? {}) } as AddressDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.full_name.trim().length < 2) next.full_name = "Enter the recipient's full name.";
    if (!isValidNigerianPhone(form.phone)) next.phone = "Enter a valid Nigerian mobile number, e.g. 0803 123 4567.";
    if (form.address_line.trim().length < 5) next.address_line = "Enter the street address.";
    if (form.city.trim().length < 2) next.city = "Enter the city or area.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setError("");
    try {
      const body = { ...form, country: "Nigeria" };
      const res = initial?.id
        ? await api<{ data: Address }>(`/account/addresses/${initial.id}`, { method: "PUT", body })
        : await api<{ data: Address }>("/account/addresses", { method: "POST", body });
      onSaved(res.data);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, "Could not save the address."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Full name" autoComplete="name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} error={errors.full_name} required />
        <Input label="Phone number" type="tel" autoComplete="tel" placeholder="0803 123 4567" value={form.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} required />
      </div>
      <Input label="Delivery address" autoComplete="street-address" placeholder="Street, house number, nearest bus stop" value={form.address_line} onChange={(e) => set("address_line", e.target.value)} error={errors.address_line} required />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="addr-state" className="block text-[13px] font-medium text-foreground/80">
            State<span className="ml-0.5 text-crimson">*</span>
          </label>
          <select id="addr-state" value={form.state} onChange={(e) => set("state", e.target.value)} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-burgundy">
            {NIGERIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <Input label="City / Area" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} error={errors.city} required />
        <Input label="Postal code" autoComplete="postal-code" value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Input label="Label (optional)" placeholder="Home, Office…" value={form.label ?? ""} onChange={(e) => set("label", e.target.value)} className="max-w-[200px]" />
        <label className="mt-5 flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={Boolean(form.is_default)} onChange={(e) => set("is_default", e.target.checked)} className="h-4 w-4 accent-[var(--crimson)]" />
          Set as default address
        </label>
      </div>
      {error && !Object.keys(errors).some((k) => errors[k]) && <p className="text-[13px] text-crimson">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
