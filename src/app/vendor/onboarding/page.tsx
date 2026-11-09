"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function VendorOnboardingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    bio: "",
    location: "",
    shipping_fee: "2500",
    bank_name: "",
    account_number: "",
    account_name: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/vendor/onboarding", {
        method: "POST",
        body: {
          ...form,
          shipping_fee: Number(form.shipping_fee || 0),
        },
      });
      setSubmitted(true);
    } catch (err) {
      setError((err as { message?: string })?.message || "Unable to submit application");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg rounded-2xl border border-border bg-white p-8">
        <h2 className="font-display text-2xl">Application received</h2>
        <p className="mt-2 text-sm text-muted">
          Our team will review your store profile within 2 to 3 business days. You&apos;ll get an email
          once approved.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl">Store application</h2>
        <p className="mt-1 text-sm text-muted">
          Tell us about your craft. Verified makers get a dedicated storefront on Atelier Nigeria.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6">
        <Input
          label="Store name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <Textarea
          label="Bio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
        />
        <Input
          label="Location"
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
        />
        <Input
          label="Default shipping fee (NGN)"
          type="number"
          value={form.shipping_fee}
          onChange={(e) => setForm((f) => ({ ...f, shipping_fee: e.target.value }))}
        />
        <Input
          label="Bank name"
          value={form.bank_name}
          onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
        />
        <Input
          label="Account number"
          value={form.account_number}
          onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
        />
        <Input
          label="Account name"
          value={form.account_name}
          onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
        />
        {error && <p className="text-sm text-crimson">{error}</p>}
        <Button type="submit" loading={saving}>
          Submit application
        </Button>
      </form>
    </div>
  );
}
