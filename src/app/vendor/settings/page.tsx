"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Panel } from "@/components/layout/dashboard-shell";
import { ShareLinks } from "@/components/products/share-links";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/empty-state";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors, type Store, type User } from "@/lib/api";
import { isNuban, NIGERIAN_BANKS } from "@/lib/banks";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { useVendorOverview } from "@/lib/vendor";
import { useAuthStore } from "@/store/auth";

function useSaveStore() {
  const client = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return async (body: Record<string, unknown>) => {
    const res = await api<{ data: Store }>("/vendor/settings", { method: "PUT", body });
    const user = useAuthStore.getState().user;
    if (user) setUser({ ...user, store: res.data } as User);
    void client.invalidateQueries({ queryKey: ["vendor-overview"] });
    return res.data;
  };
}

function ProfileForm({ store }: { store: Store }) {
  const save = useSaveStore();
  const [form, setForm] = useState({
    name: store.name,
    bio: store.bio ?? "",
    location: store.location ?? "",
    shipping_fee: String(Number(store.shipping_fee ?? 0)),
    logo: store.logo ? [store.logo] : ([] as string[]),
    banner: store.banner ? [store.banner] : ([] as string[]),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await save({
        name: form.name,
        bio: form.bio || null,
        location: form.location || null,
        shipping_fee: Number(form.shipping_fee || 0),
        logo: form.logo[0] ?? null,
        banner: form.banner[0] ?? null,
      });
      toast.success("Store profile saved");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 p-4 md:grid-cols-2">
      <Input label="Store name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required maxLength={120} />
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium text-foreground/80">Ships from (state)</label>
        <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm">
          <option value="">Choose a state</option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
          {form.location && !NIGERIAN_STATES.includes(form.location as (typeof NIGERIAN_STATES)[number]) && <option>{form.location}</option>}
        </select>
        <p className="text-xs text-muted">Used to estimate delivery dates for customers.</p>
      </div>
      <div className="md:col-span-2">
        <Textarea label="About your store" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} maxLength={2000} error={errors.bio} />
      </div>
      <Input
        label="Delivery fee per order (₦)"
        inputMode="numeric"
        value={form.shipping_fee}
        onChange={(e) => setForm({ ...form, shipping_fee: e.target.value.replace(/\D/g, "") })}
        error={errors.shipping_fee}
        hint="Charged once per order from your store. Use 0 for free delivery."
      />
      <div />
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Logo (square)</p>
        <ImageUploader value={form.logo} onChange={(v) => setForm({ ...form, logo: v.slice(-1) })} purpose="store" max={1} hint="Square image, at least 200×200 px." />
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Banner (wide)</p>
        <ImageUploader value={form.banner} onChange={(v) => setForm({ ...form, banner: v.slice(-1) })} purpose="store" max={1} hint="Wide image, ideally 1600×400 px." />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" loading={busy}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

function PayoutForm({ store }: { store: Store }) {
  const save = useSaveStore();
  const [form, setForm] = useState({ bank_name: store.bank_name ?? "", account_number: "", account_name: store.account_name ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.bank_name) next.bank_name = "Choose your bank.";
    if (!isNuban(form.account_number)) next.account_number = "Enter your 10-digit NUBAN account number.";
    if (form.account_name.trim().length < 3) next.account_name = "Enter the account name exactly as your bank shows it.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await save(form);
      toast.success("Payout account updated. We verify new accounts before the next payout.");
      setForm({ ...form, account_number: "" });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="payout" onSubmit={submit} className="grid gap-4 p-4 md:grid-cols-3" noValidate>
      {store.account_number_masked && (
        <p className="rounded-md bg-surface px-3 py-2 text-[13px] md:col-span-3">
          Current account: <span className="font-semibold">{store.bank_name}</span> · {store.account_number_masked} · {store.account_name}
        </p>
      )}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium text-foreground/80">Bank</label>
        <select value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm">
          <option value="">Choose a bank</option>
          {NIGERIAN_BANKS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        {errors.bank_name && <p className="text-xs text-crimson">{errors.bank_name}</p>}
      </div>
      <Input label="Account number" inputMode="numeric" maxLength={10} value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, "") })} error={errors.account_number} placeholder={store.account_number_masked ? "Enter to change" : "0123456789"} />
      <Input label="Account name" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} error={errors.account_name} />
      <div className="md:col-span-3">
        <Button type="submit" loading={busy}>
          {store.account_number_masked ? "Update payout account" : "Save payout account"}
        </Button>
        <p className="mt-2 text-[12px] text-muted">For your security, the full account number is never shown again after saving.</p>
      </div>
    </form>
  );
}

export default function VendorSettingsPage() {
  const { data, isLoading } = useVendorOverview();
  if (isLoading || !data) return <ListSkeleton rows={4} />;
  const store = data.store;

  return (
    <div className="space-y-3">
      {store.status === "approved" && (
        <Panel bodyClassName="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <p>
            Your store page:{" "}
            <Link href={`/makers/${store.slug}`} target="_blank" className="font-semibold text-burgundy hover:underline">
              /makers/{store.slug}
            </Link>
          </p>
          <ShareLinks path={`/makers/${store.slug}`} title={store.name} />
        </Panel>
      )}
      <Panel title="Store profile">
        <ProfileForm store={store} />
      </Panel>
      <Panel title="Payout account">
        <PayoutForm store={store} />
      </Panel>
    </div>
  );
}
