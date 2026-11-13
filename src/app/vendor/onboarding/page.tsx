"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AuthShell, FormAlert } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { isNuban, NIGERIAN_BANKS } from "@/lib/banks";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { useAuthStore } from "@/store/auth";

const select = "h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-burgundy";

export default function VendorOnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const existing = user?.store;
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    bio: existing?.bio ?? "",
    location: existing?.location ?? "",
    shipping_fee: String(Number(existing?.shipping_fee ?? 2500)),
    bank_name: existing?.bank_name ?? "",
    account_number: "",
    account_name: existing?.account_name ?? "",
    agree: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Give your store a name.";
    if (form.bio.trim().length < 20) next.bio = "Tell buyers about your store (at least 20 characters).";
    if (!form.location) next.location = "Choose the state you ship from.";
    if (form.account_number && !isNuban(form.account_number)) next.account_number = "Enter a 10-digit account number.";
    if (!form.agree) next.agree = "Please accept the seller terms.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setError("");
    try {
      await api("/vendor/onboarding", {
        method: "POST",
        body: {
          name: form.name.trim(),
          bio: form.bio.trim(),
          location: form.location,
          shipping_fee: Number(form.shipping_fee || 0),
          bank_name: form.bank_name || null,
          account_number: form.account_number || null,
          account_name: form.account_name || null,
        },
      });
      await fetchMe();
      setDone(true);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, "Unable to submit your application."));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Application received" subtitle="We review new stores within 2 business days and email you once you're approved. Meanwhile you can prepare your products as drafts.">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <Button className="w-full" size="lg" onClick={() => router.replace("/vendor")}>
            Go to Seller Center
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Sell on Atelier" title={existing ? "Complete your store" : "Open your store"} subtitle="A few details about your business. You can change them later in Store settings.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Store name" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} required maxLength={120} />
        <Textarea label="About your store" value={form.bio} onChange={(e) => set("bio", e.target.value)} error={errors.bio} rows={3} maxLength={2000} placeholder="What you make, materials you use, what makes your work special…" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-foreground/80">
              Ships from<span className="ml-0.5 text-crimson">*</span>
            </label>
            <select value={form.location} onChange={(e) => set("location", e.target.value)} className={select}>
              <option value="">Choose a state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            {errors.location && <p className="text-xs text-crimson">{errors.location}</p>}
          </div>
          <Input label="Delivery fee per order (₦)" inputMode="numeric" value={form.shipping_fee} onChange={(e) => set("shipping_fee", e.target.value.replace(/\D/g, ""))} />
        </div>

        <fieldset className="space-y-3 rounded-md border border-border p-3">
          <legend className="px-1 text-[12px] font-semibold tracking-wide text-muted uppercase">Payout account (optional now)</legend>
          <select value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} className={select} aria-label="Bank">
            <option value="">Choose a bank</option>
            {NIGERIAN_BANKS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Account number" inputMode="numeric" maxLength={10} value={form.account_number} onChange={(e) => set("account_number", e.target.value.replace(/\D/g, ""))} error={errors.account_number} />
            <Input label="Account name" value={form.account_name} onChange={(e) => set("account_name", e.target.value)} />
          </div>
        </fieldset>

        <label className="flex items-start gap-2.5 text-[13px]">
          <input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--crimson)]" />
          <span className="text-muted">
            I&apos;ll list genuine products, ship within 2 business days and honour returns, per the{" "}
            <Link href="/become-a-vendor" target="_blank" className="font-medium text-burgundy underline">
              seller terms
            </Link>
            .
          </span>
        </label>
        {errors.agree && <p className="text-xs text-crimson">{errors.agree}</p>}
        {error && !Object.values(errors).some(Boolean) && <FormAlert>{error}</FormAlert>}
        <Button type="submit" size="lg" className="w-full" loading={saving}>
          Submit application
        </Button>
      </form>
    </AuthShell>
  );
}
